import { test, expect, type Page } from "@playwright/test";
import { exampleCourse } from "../../src/lib/learning/examples";
import { newActivity } from "../../src/lib/learning/registry";

async function send(page: Page) {
  await page.getByRole("textbox", { name: "Your message", exact: true }).locator("..")
    .getByRole("button", { name: "Send", exact: true }).click();
}

async function preview(page: Page, minimum: number, failFirst = false) {
  const document = exampleCourse("english");
  const activity = newActivity("conversation");
  if (activity.activityType !== "conversation") throw new Error("Invalid fixture");
  activity.config.minTurns = minimum;
  document.lessons = [{ ...document.lessons[0], blocks: [activity] }];
  const row = {
    id: document.id, owner_id: "teacher", status: "draft", visibility: "private", revision: 1, document,
  };
  const submissions: { preview: boolean; previewAttemptCount: number; previewHistory: { response: string }[] }[] = [];
  let failed = false;
  await page.route("**/api/me", route => route.fulfill({ json: { id: "teacher", isTeacher: true } }));
  await page.route("**/api/courses", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: [row] });
    const body = route.request().postDataJSON();
    Object.assign(row, body, { revision: row.revision + 1 });
    return route.fulfill({ json: row });
  });
  await page.route("**/api/activities", async route => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    if (failFirst && !failed) {
      failed = true;
      return route.fulfill({ status: 502, json: { error: "Could not evaluate this turn. Retry." } });
    }
    return route.fulfill({ json: {
      response: body.response, feedback: {
        summary: "Your response addresses the scenario.", criteria: [],
        nextStep: "Confirm the next handoff.", characterReply: "What would you propose next?",
      },
      activity_snapshot: row.document.lessons[0].blocks[0],
      score: null, complete: body.previewAttemptCount + 1 >= minimum,
      preview: true, saved: false,
    } });
  });
  await page.goto("/studio");
  await page.getByRole("button", { name: document.title, exact: true }).click();
  await page.getByRole("button", { name: "Student preview", exact: true }).click();
  await expect(page.getByText(`0 of ${minimum} turns recorded.`, { exact: false })).toBeVisible();
  return submissions;
}

for (const minimum of [9, 10, 12]) {
  test(`${minimum}-turn preview counts beyond the 8-message context and completes immediately`, async ({ page }) => {
    const submissions = await preview(page, minimum);
    for (let turn = 1; turn <= minimum + 1; turn++) {
      await page.getByRole("textbox", { name: "Your message", exact: true }).fill(`My proposal, turn ${turn}`);
      await send(page);
      await expect(page.getByText(`${turn} of ${minimum} turns recorded.`, { exact: false })).toBeVisible();
      await expect(page.getByText(`${turn >= minimum ? 1 : 0} / 1 activities`, { exact: true })).toBeVisible();
      expect(submissions[turn - 1].previewAttemptCount).toBe(turn - 1);
      expect(submissions[turn - 1].previewHistory).toHaveLength(Math.min(turn - 1, 8));
      expect(submissions[turn - 1].preview).toBe(true);
    }
  });
}

test("a failed preview turn is not counted and its retry uses the same turn number", async ({ page }) => {
  const submissions = await preview(page, 10, true);
  await page.getByRole("textbox", { name: "Your message", exact: true }).fill("My first proposal");
  await send(page);
  await expect(page.getByRole("alert").filter({ hasText: "Could not evaluate this turn" })).toBeVisible();
  await expect(page.getByText("0 of 10 turns recorded.", { exact: false })).toBeVisible();
  await send(page);
  await expect(page.getByText("1 of 10 turns recorded.", { exact: false })).toBeVisible();
  expect(submissions.map(row => row.previewAttemptCount)).toEqual([0, 0]);
});

test("leaving and reopening preview starts a separate session instead of retaining its count", async ({ page }) => {
  const submissions = await preview(page, 12);
  await page.getByRole("textbox", { name: "Your message", exact: true }).fill("My first proposal");
  await send(page);
  await expect(page.getByText("1 of 12 turns recorded.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Edit course", exact: true }).click();
  await page.getByRole("button", { name: "Student preview", exact: true }).click();
  await expect(page.getByText("0 of 12 turns recorded.", { exact: false })).toBeVisible();
  await page.getByRole("textbox", { name: "Your message", exact: true }).fill("A fresh proposal");
  await send(page);
  await expect(page.getByText("1 of 12 turns recorded.", { exact: false })).toBeVisible();
  expect(submissions.map(row => row.previewAttemptCount)).toEqual([0, 0]);
});
