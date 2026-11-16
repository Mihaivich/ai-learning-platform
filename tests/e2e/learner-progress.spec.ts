import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const userId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const courseId = "se-essentials";
const lessonId = "testing";
const lessonKey = `${courseId}/${lessonId}`;
const cacheKey = `learner-progress:${userId}`;
const lessonUrl = `/courses/${courseId}/${lessonId}`;

type Row = {
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed_at?: string | null;
  block_results: Record<string, { done: boolean; score?: number }>;
};

async function signIn(context: BrowserContext, id = userId) {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const user = { id, aud: "authenticated", role: "authenticated", email: `${id}@example.test`, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, exp: expires, role: "authenticated" })}.test`;
  await context.addCookies([{
    name: "sb-learning-auth-token",
    value: `base64-${encode({ access_token: token, refresh_token: "test-refresh", expires_at: expires, expires_in: 3600, token_type: "bearer", user })}`,
    domain: "127.0.0.1", path: "/", sameSite: "Lax",
  }]);
  return user;
}

async function mockCloud(page: Page, context: BrowserContext) {
  const user = await signIn(context);
  const state = { failWrites: false, failReads: false, rows: [] as Row[], writes: [] as Row[], events: [] as Record<string, unknown>[] };
  await page.route("https://learning.test/auth/v1/**", route => route.fulfill({ json: user }));
  await page.route("https://learning.test/rest/v1/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith("/profiles")) return route.fulfill({ json: [] });
    if (url.pathname.endsWith("/activity_events")) {
      state.events.push(req.postDataJSON());
      return route.fulfill({ status: 201, body: "" });
    }
    if (req.method() === "GET") {
      if (state.failReads) return route.fulfill({ status: 400, json: { message: "offline" } });
      const id = url.searchParams.get("user_id")?.replace("eq.", "");
      return route.fulfill({ json: state.rows.filter(row => row.user_id === id) });
    }
    const row: Row = req.postDataJSON();
    state.writes.push(row);
    if (state.failWrites) return route.fulfill({ status: 403, json: { message: "denied", code: "42501" } });
    state.rows = [...state.rows.filter(saved => !(saved.user_id === row.user_id && saved.course_id === row.course_id && saved.lesson_id === row.lesson_id)), row];
    return route.fulfill({ status: 201, body: "" });
  });
  return state;
}

async function finishLesson(page: Page) {
  await expect(page.getByRole("heading", { name: "Testing: catch it before users do" })).toBeVisible();
  await page.getByRole("button", { name: /5\s+share =/ }).click();
  await page.getByRole("button", { name: "total=100, people=0", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Mark lesson complete", exact: true }).click();
  await expect(page.getByText("Lesson complete ✓", { exact: true })).toBeVisible();
}

test("signed-in static activities and completion persist over refresh without duplicate Strict Mode writes", async ({ page, context }) => {
  const cloud = await mockCloud(page, context);
  await page.goto(lessonUrl);
  await finishLesson(page);
  await expect.poll(() => cloud.rows[0]?.completed_at).toBeTruthy();
  await expect.poll(() => cloud.events.filter(e => e.event_type === "lesson_completed").length).toBe(1);
  expect(cloud.events.filter(e => e.event_type === "block_completed")).toHaveLength(2);
  await expect(page.getByText("Progress is saved in this browser and has not finished syncing.")).toHaveCount(0);
  const writes = cloud.writes.length;
  await page.reload();
  await expect(page.getByText("Lesson complete ✓", { exact: true })).toBeVisible();
  expect(cloud.writes).toHaveLength(writes);
  expect(cloud.rows[0].block_results["quiz-edge"].score).toBe(1);
});

test("failed writes keep local completion over reload; retry syncs the latest snapshot", async ({ page, context }) => {
  const cloud = await mockCloud(page, context);
  cloud.failWrites = true;
  await page.goto(lessonUrl);
  await finishLesson(page);
  await expect(page.getByText("Progress could not be synced. Please retry.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lesson complete ✓", { exact: true })).toBeVisible();
  await expect(page.getByText("Progress could not be synced. Please retry.")).toBeVisible();
  cloud.failWrites = false;
  await page.getByRole("button", { name: "Retry saving progress" }).click();
  await expect.poll(() => cloud.rows[0]?.completed_at).toBeTruthy();
  await expect(page.getByRole("button", { name: "Retry saving progress" })).toHaveCount(0);
  const pending = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).pending, cacheKey);
  expect(pending).toEqual([]);
});

test("read failure recovers only the active account cache; switching accounts does not upload it", async ({ page, context }) => {
  const cloud = await mockCloud(page, context);
  cloud.failReads = true;
  await page.addInitScript(({ key, lesson }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      [lesson]: { completedAt: "2026-11-15T10:00:00Z", blocks: { "bug-total": { done: true }, "quiz-edge": { done: true, score: 1 } } },
    }));
  }, { key: cacheKey, lesson: lessonKey });
  await page.goto(lessonUrl);
  await expect(page.getByText("Lesson complete ✓", { exact: true })).toBeVisible();
  await expect(page.getByText("Could not load saved progress. Retry before syncing your local changes.")).toBeVisible();
  expect(cloud.writes).toHaveLength(0);
  const other = await signIn(context, otherId);
  await page.route("https://learning.test/auth/v1/**", route => route.fulfill({ json: other }));
  cloud.failReads = false;
  await page.reload();
  await expect(page.getByRole("button", { name: "Mark lesson complete" })).toBeDisabled();
  await expect(page.getByText("Lesson complete ✓", { exact: true })).toHaveCount(0);
  expect(cloud.writes).toHaveLength(0);
});

test("unavailable browser storage reports memory-only progress", async ({ page, context }) => {
  await mockCloud(page, context);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error("storage disabled"); };
  });
  await page.goto(lessonUrl);
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
});
