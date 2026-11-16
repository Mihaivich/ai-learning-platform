import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { LearnerProgressSync, type LessonProgress, type ProgressMap } from "../src/lib/learner-sync";

const userId = "00000000-0000-4000-8000-000000000001";
const courseId = "se-essentials";
const lessonId = "requirements";
const lessonKey = `${courseId}/${lessonId}`;
const cacheKey = `learner-progress:${userId}`;
const done: LessonProgress = { blocks: { quiz: { done: true, score: 1 } } };

type Call = { table: string; method: string; body: Record<string, unknown> | null; url: URL };
function fixture(handler?: (call: Call) => Response | Promise<Response>, storage = new Map<string, string>(), account = userId) {
  const calls: Call[] = [];
  const notifications: unknown[] = [];
  const db = createClient("https://learning.test", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const call = {
          table: url.pathname.split("/").at(-1)!,
          method: init?.method ?? "GET",
          body: init?.body ? JSON.parse(String(init.body)) : null,
          url,
        };
        calls.push(call);
        return handler?.(call) ?? (call.method === "GET"
          ? Response.json([]) : new Response(null, { status: 201 }));
      },
    },
  });
  const sync = new LearnerProgressSync({
    db, userId: account,
    storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); } },
    onChange: snapshot => notifications.push(snapshot),
  });
  return { sync, calls, storage, notifications };
}
const setDone = () => done;
function pendingCache(progress: ProgressMap) {
  return JSON.stringify({ version: 1, progress, pending: Object.keys(progress) });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}

// These tests use the real SDK. Merely calling upsert/insert without consuming
// its thenable does not reach this fetch, so the original bug cannot pass.
test("static progress and events issue real HTTP requests and survive reload", async () => {
  const f = fixture();
  await f.sync.initialize();
  f.sync.update(courseId, lessonId, setDone);
  await f.sync.flush();
  f.sync.update(courseId, lessonId, previous => ({ ...previous, completedAt: "2026-11-15T10:00:00Z" }));
  await f.sync.flush();
  await f.sync.logEvent(courseId, lessonId, "lesson_completed");
  const writes = f.calls.filter(c => c.table === "lesson_progress" && c.method === "POST");
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1].body?.block_results, done.blocks);
  assert.equal(writes[1].body?.completed_at, "2026-11-15T10:00:00Z");
  assert.equal(writes[1].body?.user_id, userId);
  assert.equal(f.calls.filter(c => c.table === "activity_events").length, 1);
  assert.equal(f.sync.snapshot.status.pending, 0);
  assert.equal(f.calls[0].url.searchParams.get("user_id"), `eq.${userId}`);
  const saved = writes[1].body;
  f.sync.dispose();
  const reload = fixture(() => Response.json([saved]), f.storage);
  await reload.sync.initialize();
  assert.deepEqual(reload.sync.snapshot.progress[lessonKey].blocks, done.blocks);
  assert.equal(reload.sync.snapshot.progress[lessonKey].completedAt, saved?.completed_at);
  reload.sync.dispose();
});

test("failed writes retain a durable pending snapshot across reload and retry", async () => {
  let fail = true;
  const handler = (c: Call) => c.method === "POST" && fail
    ? Response.json({ message: "denied", code: "42501" }, { status: 403 })
    : c.method === "GET" ? Response.json([]) : new Response(null, { status: 201 });
  const f = fixture(handler);
  await f.sync.initialize();
  f.sync.update(courseId, lessonId, setDone);
  await f.sync.flush();
  assert.equal(f.sync.snapshot.status.pending, 1);
  assert.match(f.sync.snapshot.status.error, /could not be synced/);
  assert.deepEqual(JSON.parse(f.storage.get(cacheKey)!).pending, [lessonKey]);
  f.sync.dispose();
  const reload = fixture(handler, f.storage);
  await reload.sync.initialize();
  await reload.sync.flush();
  assert.deepEqual(reload.sync.snapshot.progress[lessonKey].blocks, done.blocks);
  fail = false;
  await reload.sync.retry();
  assert.equal(reload.sync.snapshot.status.pending, 0);
  assert.equal(reload.sync.snapshot.status.error, "");
  assert.equal(JSON.parse(f.storage.get(cacheKey)!).pending.length, 0);
  reload.sync.dispose();
});

test("network exceptions are handled without losing pending work", async () => {
  const f = fixture(c => {
    if (c.method === "POST") throw new TypeError("offline");
    return Response.json([]);
  });
  await f.sync.initialize();
  f.sync.update(courseId, lessonId, setDone);
  await f.sync.flush();
  assert.equal(f.sync.snapshot.status.pending, 1);
  assert.match(f.sync.snapshot.status.error, /could not be synced/);
  f.sync.dispose();
});

test("legacy cache merges missing work, preserves remote conflicts and recovers completion", async () => {
  const local = { ...done, completedAt: "2026-11-15T10:00:00Z" };
  const storage = new Map([[cacheKey, JSON.stringify({ [lessonKey]: local })]]);
  const f = fixture(c => c.method === "GET" ? Response.json([{
    course_id: courseId, lesson_id: lessonId, completed_at: null,
    block_results: { quiz: { done: true, score: 0.5 }, other: { done: true } },
  }]) : new Response(null, { status: 201 }), storage);
  await f.sync.initialize();
  await f.sync.flush();
  assert.deepEqual(f.sync.snapshot.progress[lessonKey], {
    completedAt: local.completedAt,
    blocks: { quiz: { done: true, score: 0.5 }, other: { done: true } },
  });
  assert.equal(f.calls.filter(c => c.method === "POST").length, 1);
  f.sync.dispose();
});

test("pending current snapshots win over stale remote records", async () => {
  const storage = new Map([[cacheKey, pendingCache({ [lessonKey]: done })]]);
  const f = fixture(c => c.method === "GET" ? Response.json([{
    course_id: courseId, lesson_id: lessonId, completed_at: null,
    block_results: { quiz: { done: false }, earlier: { done: true } },
  }]) : new Response(null, { status: 201 }), storage);
  await f.sync.initialize();
  await f.sync.flush();
  assert.deepEqual(f.sync.snapshot.progress[lessonKey].blocks, {
    earlier: { done: true }, quiz: { done: true, score: 1 },
  });
  f.sync.dispose();
});

test("writes serialize so an older request cannot erase a newer activity", async () => {
  const started = deferred<void>();
  const release = deferred<Response>();
  let first = true;
  const f = fixture(c => {
    if (c.method === "POST" && first) {
      first = false;
      started.resolve();
      return release.promise;
    }
    return c.method === "GET" ? Response.json([]) : new Response(null, { status: 201 });
  });
  await f.sync.initialize();
  f.sync.update(courseId, lessonId, setDone);
  await started.promise;
  f.sync.update(courseId, lessonId, previous => ({ ...previous, blocks: { ...previous.blocks, second: { done: true } } }));
  assert.equal(f.calls.filter(c => c.method === "POST").length, 1);
  release.resolve(new Response(null, { status: 201 }));
  await f.sync.flush();
  const writes = f.calls.filter(c => c.method === "POST");
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1].body?.block_results, { ...done.blocks, second: { done: true } });
  assert.equal(f.sync.snapshot.status.pending, 0);
  f.sync.dispose();
});

test("remote read failure preserves cache and edits; retry reconciles before writing", async () => {
  let offline = true;
  const storage = new Map([[cacheKey, pendingCache({ [lessonKey]: done })]]);
  const f = fixture(c => {
    if (c.method === "GET") return offline
      ? Response.json({ message: "unavailable" }, { status: 400 }) : Response.json([]);
    return new Response(null, { status: 201 });
  }, storage);
  await f.sync.initialize();
  f.sync.update(courseId, lessonId, previous => ({ ...previous, completedAt: "now" }));
  assert.match(f.sync.snapshot.status.error, /Could not load/);
  assert.equal(f.calls.filter(c => c.method === "POST").length, 0);
  assert.deepEqual(f.sync.snapshot.progress[lessonKey].blocks, done.blocks);
  offline = false;
  await f.sync.retry();
  await f.sync.flush();
  assert.equal(f.sync.snapshot.progress[lessonKey].completedAt, "now");
  assert.equal(f.sync.snapshot.status.pending, 0);
  f.sync.dispose();
});

test("late responses and stale callbacks cannot cross account boundaries", async () => {
  const started = deferred<void>();
  const release = deferred<Response>();
  const a = fixture(c => {
    if (c.method === "POST") { started.resolve(); return release.promise; }
    return Response.json([]);
  });
  await a.sync.initialize();
  a.sync.update(courseId, lessonId, setDone);
  await started.promise;
  const before = a.storage.get(cacheKey);
  a.sync.dispose();
  const b = fixture(undefined, a.storage, "00000000-0000-4000-8000-000000000002");
  await b.sync.initialize();
  const noticeCount = a.notifications.length;
  release.resolve(new Response(null, { status: 201 }));
  await a.sync.flush();
  a.sync.update(courseId, lessonId, setDone);
  await a.sync.logEvent(courseId, lessonId, "stale");
  assert.equal(a.notifications.length, noticeCount);
  assert.equal(a.storage.get(cacheKey), before);
  assert.deepEqual(b.sync.snapshot.progress, {});
  assert.equal(b.calls.filter(c => c.method === "POST").length, 0);
  b.sync.dispose();
});

test("UUID dynamic courses never use browser progress writes or legacy migration", async () => {
  const dynamicId = "10000000-0000-4000-8000-000000000001";
  const storage = new Map([[cacheKey, JSON.stringify({ [`${dynamicId}/lesson`]: done })]]);
  const f = fixture(undefined, storage);
  await f.sync.initialize();
  assert.deepEqual(f.sync.snapshot.progress, {});
  f.sync.update(dynamicId, "lesson", setDone);
  await f.sync.flush();
  assert.equal(f.calls.filter(c => c.method === "POST").length, 0);
  assert.equal(f.sync.snapshot.status.pending, 0);
  f.sync.dispose();
});

test("anonymous progress stays local and storage failure is reported accurately", () => {
  const storage = new Map<string, string>();
  const sync = new LearnerProgressSync({
    db: null, userId: null,
    storage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => { storage.set(k, v); } },
    onChange() {},
  });
  sync.update(courseId, lessonId, setDone);
  assert.equal(sync.snapshot.status.pending, 0);
  assert.ok(storage.has("learner-progress"));
  const unavailable = new LearnerProgressSync({
    db: null, userId: null,
    storage: { getItem() { throw new Error("disabled"); }, setItem() { throw new Error("disabled"); } },
    onChange() {},
  });
  unavailable.update(courseId, lessonId, setDone);
  assert.deepEqual(unavailable.snapshot.progress[lessonKey], done);
  assert.equal(unavailable.snapshot.status.localSaved, false);
  sync.dispose(); unavailable.dispose();
});

test("event errors do not fail or undo a successfully saved lesson", async () => {
  const f = fixture(c => c.table === "activity_events"
    ? Response.json({ message: "denied", code: "42501" }, { status: 403 })
    : c.method === "GET" ? Response.json([]) : new Response(null, { status: 201 }));
  await f.sync.initialize();
  f.sync.update(courseId, lessonId, setDone);
  await f.sync.flush();
  await f.sync.logEvent(courseId, lessonId, "block_completed");
  assert.equal(f.sync.snapshot.status.error, "");
  assert.equal(f.sync.snapshot.status.pending, 0);
  assert.deepEqual(f.sync.snapshot.progress[lessonKey], done);
  f.sync.dispose();
});

test("edits after a failed legacy load win over older remote fields on retry", async () => {
  let offline = true;
  const storage = new Map([[cacheKey, JSON.stringify({ [lessonKey]: done })]]);
  const f = fixture(c => {
    if (c.method !== "GET") return new Response(null, { status: 201 });
    if (offline) return Response.json({ message: "offline" }, { status: 400 });
    return Response.json([{
      course_id: courseId, lesson_id: lessonId, completed_at: null,
      block_results: { quiz: { done: false } },
    }]);
  }, storage);
  await f.sync.initialize();
  f.sync.update(courseId, lessonId, previous => ({ ...previous, blocks: { quiz: { done: true, score: 0.75 } } }));
  offline = false;
  await f.sync.retry();
  await f.sync.flush();
  assert.deepEqual(f.sync.snapshot.progress[lessonKey].blocks.quiz, { done: true, score: 0.75 });
  f.sync.dispose();
});

test("repeated retries coalesce the initial read before any writes", async () => {
  const release = deferred<Response>();
  const f = fixture(() => release.promise);
  const first = f.sync.initialize();
  const second = f.sync.retry();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(f.calls.length, 1);
  assert.equal(f.sync.snapshot.status.syncing, true);
  release.resolve(Response.json([]));
  await Promise.all([first, second]);
  assert.equal(f.sync.snapshot.status.syncing, false);
  f.sync.dispose();
});

test("anonymous learners can retry browser storage after it becomes available", async () => {
  let disabled = true;
  const storage = new Map<string, string>();
  const notifications: boolean[] = [];
  const sync = new LearnerProgressSync({
    db: null, userId: null,
    storage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) {
        if (disabled) throw new Error("disabled");
        storage.set(key, value);
      },
    },
    onChange: snapshot => notifications.push(snapshot.status.localSaved),
  });
  sync.update(courseId, lessonId, setDone);
  assert.equal(notifications.at(-1), false);
  disabled = false;
  await sync.retry();
  assert.equal(notifications.at(-1), true);
  assert.deepEqual(JSON.parse(storage.get("learner-progress")!).progress[lessonKey], done);
  sync.dispose();
});
