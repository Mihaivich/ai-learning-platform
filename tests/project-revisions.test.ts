import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";
import * as server from "../src/lib/supabase/server";
import { loadGeneratedScenario, updateOwnDraft } from "../src/lib/projects/generated/store";
import { tidewaterSwimDraft } from "../src/lib/projects/tidewater-swim";
import { matchesProjectVersion, projectSnapshot } from "../src/lib/projects/version";
import { summariseRun } from "../src/lib/classes";
import { stepStatuses } from "../src/lib/projects/generated/path";
import { getProjectScenario } from "../src/lib/projects";
import type { SimulationState } from "../src/lib/learning/simulation/engine";

const owner = "00000000-0000-4000-8000-000000000001";
const id = "gen-revisiontest";
const migration = "20261116100000_project_content_revisions.sql";
const require = createRequire(import.meta.url);

test("snapshot matching covers template, content, identity and legacy built-ins", () => {
  const builtIn = getProjectScenario("tidewater-swim")!;
  assert.ok(matchesProjectVersion(projectSnapshot(builtIn), builtIn));
  assert.ok(!matchesProjectVersion(null, builtIn));
  assert.ok(!matchesProjectVersion({ project: "other", version: builtIn.version }, builtIn));
  assert.ok(!matchesProjectVersion({ project: builtIn.id, version: builtIn.version - 1 }, builtIn));
  assert.ok(!matchesProjectVersion(projectSnapshot(builtIn), { ...builtIn, contentRevision: 2 }));
  assert.ok(matchesProjectVersion(projectSnapshot(builtIn), { ...builtIn, contentRevision: 1 }));
});

test("database edits invalidate API runs, teacher completion and learning-path progress together", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for (const file of readdirSync("supabase/migrations").sort()) {
    if (file === migration) continue;
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    if (file === "0001_init.sql") await db.exec("grant all on all tables in schema public to anon,authenticated,service_role");
  }
  await db.exec(`insert into auth.users values('${owner}','owner@example.test',now())`);
  await db.query(`insert into generated_projects(id,owner_id,domain,topic,title,tagline,summary,draft,template_version,model)
    values($1,$2,'software','test','Test','Test','Test',$3,1,'fake')`, [id, owner, JSON.stringify(tidewaterSwimDraft)]);
  const fix = readFileSync(`supabase/migrations/${migration}`, "utf8");
  await db.exec(fix);
  await db.exec(fix);
  assert.equal((await db.query<{ content_revision: number }>("select content_revision from generated_projects")).rows[0].content_revision, 2);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`);
  assert.equal((await db.query<{ content_revision: number }>("select content_revision from generated_projects")).rows[0].content_revision, 2);
  await assert.rejects(db.exec("update generated_projects set content_revision=1"), /permission/);
  await db.exec("reset role");

  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://revision.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  t.after(() => {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  });
  let session: Record<string, unknown> | null = null;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    if (url.pathname.endsWith("/generated_projects")) {
      if (method === "PATCH") {
        const patch = JSON.parse(String(init?.body));
        const result = await db.query("update generated_projects set draft=$1,title=$2,tagline=$3,summary=$4 where id=$5 and owner_id=$6 returning id",
          [JSON.stringify(patch.draft), patch.title, patch.tagline, patch.summary, url.searchParams.get("id")!.slice(3), url.searchParams.get("owner_id")!.slice(3)]);
        return Response.json(result.rows);
      }
      return Response.json((await db.query("select * from generated_projects where id=$1", [id])).rows[0]);
    }
    assert.ok(url.pathname.endsWith("/simulation_sessions"));
    if (method === "POST") session = JSON.parse(String(init?.body));
    if (method === "PATCH") {
      assert.equal(url.searchParams.get("version"), `eq.${session!.version}`);
      session = { ...session, ...JSON.parse(String(init?.body)) };
    }
    return Response.json(session);
  });
  const client = createClient("https://revision.invalid", "test-only-key", { auth: { persistSession: false } });
  const exports: Record<string, unknown> = {};
  const compiled = ts.transpileModule(readFileSync("src/app/api/projects/[scenarioId]/route.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  // Execute the real handlers, replacing only cookie-based authentication.
  runInNewContext(compiled, {
    exports, Response, Request, crypto, console,
    require: (name: string) => name === "@/lib/supabase/server"
      ? { ...server, requireAccount: async () => ({ db: client, user: { id: owner } }) }
      : name.startsWith("@/") ? require(`${process.cwd()}/src/${name.slice(2)}`) : require(name),
  });
  type Handler = (request: Request, context: { params: Promise<{ scenarioId: string }> }) => Promise<Response>;
  const post = (body: object) => (exports.POST as Handler)(new Request("https://app.invalid", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ scenarioId: id }) });
  const get = () => (exports.GET as Handler)(new Request("https://app.invalid"), { params: Promise.resolve({ scenarioId: id }) });
  assert.equal((await post({ op: "start" })).status, 200);
  function currentSession() { assert.ok(session); return session; }
  const initial = (await loadGeneratedScenario(id, owner))!;
  assert.equal(initial.contentRevision, 2);
  assert.ok(!matchesProjectVersion({ project: id, version: 1 }, initial));
  const state = currentSession().state as SimulationState;
  state.status = "completed";
  state.step = 5;
  currentSession().status = "completed";
  currentSession().outcome = "success";
  function summary(scenario: typeof initial) {
    const row = currentSession();
    return summariseRun(scenario, { activity_snapshot: row.activity_snapshot, state: row.state as SimulationState, status: String(row.status), outcome: row.outcome as string | null, updated_at: String(row.updated_at) });
  }
  function path(scenario: typeof initial) {
    return stepStatuses(3, [{ id, path_step: 1, content_revision: scenario.contentRevision! }], [{ course_id: `project:${id}`, status: String(currentSession().status), outcome: "success", activity_snapshot: currentSession().activity_snapshot }]);
  }
  assert.equal(summary(initial).status, "completed");
  assert.equal(summary({ ...initial, version: initial.version + 1 }).status, "not-started");
  assert.equal(path(initial)[1].status, "ready");
  await updateOwnDraft(id, owner, tidewaterSwimDraft);
  const unchanged = (await loadGeneratedScenario(id, owner))!;
  assert.equal(unchanged.contentRevision, 2);
  const changed = structuredClone(tidewaterSwimDraft);
  changed.interview.opening += " Please check the updated instructions.";
  await updateOwnDraft(id, owner, changed);
  const revised = (await loadGeneratedScenario(id, owner))!;
  assert.equal(revised.contentRevision, 3);
  assert.equal(revised.version, initial.version);
  assert.equal(summary(revised).status, "not-started");
  assert.deepEqual(path(revised).map((step) => step.status), ["playing", "locked", "locked"]);
  assert.deepEqual(await (await get()).json(), { view: null });
  assert.equal((await post({ op: "choose", actionId: "pick-product" })).status, 409);
  const oldRun = currentSession().run_id;
  assert.equal((await post({ op: "start" })).status, 200);
  assert.notEqual(currentSession().run_id, oldRun);
  assert.equal(currentSession().status, "active");
  assert.equal((currentSession().activity_snapshot as { contentRevision: number }).contentRevision, 3);
  assert.equal((await post({ op: "choose", actionId: "pick-product" })).status, 200);
  assert.equal(summary(revised).status, "active");
  assert.equal(summary(initial).status, "not-started");
  await updateOwnDraft(id, owner, changed);
  assert.equal((await loadGeneratedScenario(id, owner))!.contentRevision, 3);
  assert.equal((await get()).status, 200);
  const resumed = currentSession().run_id;
  assert.equal((await post({ op: "start" })).status, 200);
  assert.equal(currentSession().run_id, resumed);
  (currentSession().state as SimulationState).status = "completed";
  currentSession().status = "completed";
  currentSession().outcome = "success";
  assert.equal(summary(revised).status, "completed");
  assert.deepEqual(path(revised).map((step) => step.status), ["done", "ready", "locked"]);
  // A new project starts at revision 1; rerunning the migration does not reset it.
  await db.query(`insert into generated_projects(id,owner_id,domain,topic,title,tagline,summary,draft,template_version,model)
    select 'gen-newrevision',owner_id,domain,topic,title,tagline,summary,draft,template_version,model from generated_projects where id=$1`, [id]);
  await db.exec(fix);
  assert.equal((await db.query<{ content_revision: number }>("select content_revision from generated_projects where id='gen-newrevision'")).rows[0].content_revision, 1);
});
