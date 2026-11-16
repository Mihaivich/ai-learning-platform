import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { ASSIGNABLE, assignableFor, assignProjects } from "../src/lib/classes";
import { HttpError } from "../src/lib/supabase/server";

const owner = "teacher";
const generated = Array.from({ length: 501 }, (_, i) => ({
  id: `gen-${String(i).padStart(12, "0")}`, title: `Project ${i}`, owner_id: owner,
}));
const oldest = generated.at(-1)!.id;

/** Controlled PostgREST responses exercise the real Supabase query builders. */
function storage(initial: string[] = []) {
  const assigned = new Set(initial);
  const requests: URL[] = [];
  let writes = 0;
  let failedOffset = -1;
  let failGenerated = false;
  let failCurrent = false;
  const client = createClient("https://assignments.invalid", "test-only-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        requests.push(url);
        const method = init?.method ?? "GET";
        if (url.pathname.endsWith("/generated_projects")) {
          const offset = Number(url.searchParams.get("offset") ?? 0);
          if (failGenerated || offset === failedOffset) {
            return Response.json({ code: "42501", message: "Listing unavailable" }, { status: 403 });
          }
          const ids = url.searchParams.get("id");
          if (ids) {
            const ownerFilter = url.searchParams.get("owner_id");
            assert.equal(ownerFilter, `eq.${owner}`);
            return Response.json(generated.filter((row) => ids.includes(row.id)));
          }
          const limit = Number(url.searchParams.get("limit") ?? 1000);
          return Response.json(generated.slice(offset, offset + limit));
        }
        assert.ok(url.pathname.endsWith("/class_projects"));
        if (method === "GET") {
          if (failCurrent) return Response.json({ code: "42501", message: "Read unavailable" }, { status: 403 });
          return Response.json([...assigned].map((project_id) => ({ project_id })));
        }
        writes++;
        if (method === "POST") {
          for (const row of JSON.parse(String(init?.body))) assigned.add(row.project_id);
          return new Response(null, { status: 201 });
        }
        assert.equal(method, "DELETE");
        const removed = url.searchParams.get("project_id")!;
        for (const id of assigned) if (removed.includes(id)) assigned.delete(id);
        return new Response(null, { status: 204 });
      },
    },
  });
  return {
    client, assigned, requests,
    get writes() { return writes; },
    failPage(offset: number) { failedOffset = offset; },
    failAuthorization() { failGenerated = true; },
    failAssignments() { failCurrent = true; },
  };
}

function status(expected: number) {
  return (error: unknown) => error instanceof HttpError && error.status === expected;
}

test("the picker includes old projects across pages and rejects a failed later page", async () => {
  const db = storage();
  const projects = await assignableFor(db.client);
  assert.equal(projects.length, ASSIGNABLE.length + generated.length);
  assert.ok(projects.some((item) => item.id === oldest));
  assert.equal(db.requests.length, 2);
  assert.match(db.requests[0].searchParams.get("order")!, /created_at.desc,id.asc/);
  db.failPage(500);
  await assert.rejects(assignableFor(db.client), status(503));
  assert.equal(db.writes, 0);
});

test("saving another selection preserves an assigned project older than the latest 50", async () => {
  const db = storage([oldest]);
  const result = await assignProjects(db.client, "class", [oldest, "harbour-clinic", oldest], owner);
  assert.deepEqual(result, [oldest, "harbour-clinic"]);
  assert.deepEqual([...db.assigned], result);
  assert.ok(db.requests[0].searchParams.get("id")!.includes(oldest));
  assert.equal(db.requests[0].searchParams.get("limit"), null);
});

test("authorization or current-assignment query failures leave all assignments unchanged", async () => {
  for (const failure of ["failAuthorization", "failAssignments"] as const) {
    const db = storage([oldest]);
    db[failure]();
    await assert.rejects(assignProjects(db.client, "class", [oldest, "harbour-clinic"], owner), status(503));
    assert.deepEqual([...db.assigned], [oldest]);
    assert.equal(db.writes, 0);
  }
});

test("foreign, deleted and unknown projects reject the whole selection without writes", async () => {
  for (const invalid of ["gen-foreignproject", "gen-deletedproject", "unknown-project"]) {
    const db = storage([oldest]);
    await assert.rejects(assignProjects(db.client, "class", [oldest, "harbour-clinic", invalid], owner), status(400));
    assert.deepEqual([...db.assigned], [oldest]);
    assert.equal(db.writes, 0);
  }
});

test("intentional removal, built-in assignment and clearing the selection still work", async () => {
  const db = storage([oldest, "harbour-clinic"]);
  assert.deepEqual(await assignProjects(db.client, "class", ["parcelpal"], owner), ["parcelpal"]);
  assert.deepEqual([...db.assigned], ["parcelpal"]);
  assert.deepEqual(await assignProjects(db.client, "class", [], owner), []);
  assert.equal(db.assigned.size, 0);
});
