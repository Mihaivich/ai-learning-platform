import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { listUsers, overview } from "../src/lib/admin";
import { HttpError } from "../src/lib/supabase/server";

type Options = { failTable?: string; failOffset?: number; failAuthPage?: number; missingCount?: boolean; empty?: boolean };
function backend(t: TestContext, options: Options = {}) {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://admin.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  t.after(() => {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  });
  const users = Array.from({ length: options.empty ? 0 : 1001 }, (_, i) => ({
    id: `user-${String(i).padStart(4, "0")}`, email: `user${i}@example.test`,
    created_at: new Date(Date.UTC(2026, 10, 1) + i * 1000).toISOString(),
  }));
  const owner = "user-1000";
  const tables: Record<string, Record<string, unknown>[]> = {
    profiles: users.map((u, i) => ({ id: u.id, role: i === 1000 ? "admin" : i < 10 ? "instructor" : "student" })),
    classes: users.map((u) => ({ id: u.id, owner_id: owner })),
    simulation_sessions: Array.from({ length: options.empty ? 0 : 1201 }, (_, i) => ({
      id: String(i).padStart(5, "0"), user_id: owner, course_id: i === 1200 ? "legacy-course" : "project:harbour-clinic",
      status: i < 1100 ? "completed" : "active", outcome: i < 1050 ? "success" : null,
    })),
    generated_projects: users.map((u) => ({ id: u.id })),
    ai_usage: users.map((u, i) => ({ user_id: u.id, bucket: i === 1000 ? "generation" : i < 600 ? "roleplay" : "feedback", hits: i === 1000 ? 7 : 2, window_start: new Date().toISOString() })),
  };
  // An old usage window must not affect the last-day totals.
  if (!options.empty) tables.ai_usage.push({ user_id: "user-old", bucket: "generation", hits: 99, window_start: "2020-01-01T00:00:00Z" });
  const calls: { url: URL; method: string }[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    const table = url.pathname.split("/").at(-1)!;
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const page = Number(url.searchParams.get("page") ?? 1);
    if ((table === "users" && page === options.failAuthPage) ||
      (table === options.failTable && (options.failOffset === undefined || offset === options.failOffset))) {
      return Response.json({ code: "42501", message: "Temporary read failure" }, { status: 403 });
    }
    if (table === "users") {
      const size = Number(url.searchParams.get("per_page") ?? 50);
      return Response.json({ users: users.slice((page - 1) * size, page * size), total: users.length });
    }
    assert.ok(table in tables, `Unexpected table ${table}`);
    let rows = tables[table];
    for (const [key, filter] of url.searchParams) {
      if (filter.startsWith("eq.")) rows = rows.filter((row) => row[key] === filter.slice(3));
      if (key === "course_id" && filter.startsWith("like.")) rows = rows.filter((row) => String(row.course_id).startsWith("project:"));
      if (key === "window_start" && filter.startsWith("gte.")) rows = rows.filter((row) => String(row.window_start) >= filter.slice(4));
    }
    if (method === "HEAD") {
      assert.match(new Headers(init?.headers).get("prefer") ?? "", /count=exact/);
      return new Response(null, { headers: options.missingCount ? {} : { "content-range": `*/${rows.length}` } });
    }
    assert.ok(url.searchParams.get("order"), "Every ranged query needs stable ordering");
    const size = Math.min(Number(url.searchParams.get("limit") ?? 1000), 1000);
    return Response.json(rows.slice(offset, offset + size));
  });
  return calls;
}
const unavailable = (error: unknown) => error instanceof HttpError && error.status === 503;

test("all auth pages and database pages contribute to roles and per-account counts", async (t) => {
  const calls = backend(t);
  const users = await listUsers();
  assert.equal(users.length, 1001);
  assert.equal(new Set(users.map((u) => u.id)).size, 1001);
  assert.equal(users[0].id, "user-1000");
  assert.equal(users[0].role, "admin");
  assert.equal(users[0].runs, 1200);
  assert.equal(users[0].classesTaught, 1001);
  assert.equal(users.at(-1)!.role, "instructor");
  assert.deepEqual(calls.filter((c) => c.url.pathname.endsWith("/users")).map((c) => c.url.searchParams.get("page")), ["1", "2", "3"]);
});

test("overview counts exceed the row cap and AI totals include later pages only within the time window", async (t) => {
  backend(t);
  assert.deepEqual(await overview(), {
    users: { total: 1001, instructors: 10, admins: 1 }, classes: 1001,
    runs: { total: 1200, completed: 1100, successful: 1050 }, generatedProjects: 1001,
    aiLastDay: { roleplay: 1200, feedback: 800, generation: 7 },
  });
});

test("a failed later auth page rejects the account list", async (t) => {
  backend(t, { failAuthPage: 2 });
  await assert.rejects(listUsers(), unavailable);
});

for (const table of ["profiles", "simulation_sessions", "classes"]) {
  test(`a failed later ${table} page cannot silently change roles or counts`, async (t) => {
    backend(t, { failTable: table, failOffset: 500 });
    await assert.rejects(listUsers(), unavailable);
  });
}

for (const table of ["profiles", "classes", "simulation_sessions", "generated_projects", "ai_usage"]) {
  test(`overview rejects ${table} failures instead of displaying zero or partial totals`, async (t) => {
    backend(t, { failTable: table, ...(table === "ai_usage" ? { failOffset: 500 } : {}) });
    await assert.rejects(overview(), unavailable);
  });
}

test("a missing exact count is an error rather than zero", async (t) => {
  backend(t, { missingCount: true });
  await assert.rejects(overview(), unavailable);
});

test("an empty installation returns an empty account list and genuine zero totals", async (t) => {
  backend(t, { empty: true });
  assert.deepEqual(await listUsers(), []);
  assert.deepEqual(await overview(), {
    users: { total: 0, instructors: 0, admins: 0 }, classes: 0,
    runs: { total: 0, completed: 0, successful: 0 }, generatedProjects: 0,
    aiLastDay: { roleplay: 0, feedback: 0, generation: 0 },
  });
});
