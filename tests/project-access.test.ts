import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { loadGeneratedScenario, loadPlayableListing } from "../src/lib/projects/generated/store";
import { tidewaterSwimDraft } from "../src/lib/projects/tidewater-swim";

const owner = "00000000-0000-4000-8000-000000000001";
const attacker = "00000000-0000-4000-8000-000000000002";
const student = "00000000-0000-4000-8000-000000000003";
const ownClass = "10000000-0000-4000-8000-000000000001";
const badClass = "10000000-0000-4000-8000-000000000002";
const project = "gen-privateproject";
const migration = "20261116090000_private_project_assignments.sql";

test("private projects require the same owner at assignment and play time", async (t) => {
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
  await db.exec(`insert into auth.users values ('${owner}','owner@example.test',now()),('${attacker}','attacker@example.test',now()),('${student}','student@example.test',now());
    update public.profiles set role='instructor' where id in ('${owner}','${attacker}');
    insert into classes(id,owner_id,name,join_code) values
      ('${ownClass}','${owner}','Legitimate class','ABCDEF'),('${badClass}','${attacker}','Other class','GHJKLM');`);
  await db.query(`insert into generated_projects(id,owner_id,domain,topic,title,tagline,summary,draft,template_version,model)
    values ($1,$2,'software','test','Private project','private','private',$3,1,'fake')`, [project, owner, JSON.stringify(tidewaterSwimDraft)]);
  async function as(userId: string, sql: string) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${userId}',false);`);
    try { return await db.exec(sql); } finally { await db.exec("reset role"); }
  }
  // Prove the original exploit is possible before applying the repair.
  await as(attacker, `insert into class_projects(class_id,project_id) values('${badClass}','${project}'); select * from join_class('GHJKLM');`);
  await as(owner, `insert into class_projects(class_id,project_id) values('${ownClass}','${project}'),('${ownClass}','harbour-clinic');`);
  const fix = readFileSync(`supabase/migrations/${migration}`, "utf8");
  await db.exec(fix);
  await db.exec(fix); // Safe to reapply; valid assignments are preserved.
  assert.equal((await db.query("select * from class_projects")).rows.length, 2);
  await assert.rejects(as(attacker, `insert into class_projects(class_id,project_id) values('${badClass}','${project}')`), /row-level security/);
  await assert.rejects(as(owner, `insert into class_projects(class_id,project_id) values('${badClass}','${project}')`), /row-level security/);
  await assert.rejects(as(owner, `insert into class_projects(class_id,project_id) values('${ownClass}','gen-nonexistent')`), /row-level security/);
  await assert.rejects(as(student, `insert into class_projects(class_id,project_id) values('${ownClass}','parcelpal')`), /row-level security/);
  await as(owner, `delete from class_projects where project_id='${project}'; insert into class_projects(class_id,project_id) values('${ownClass}','${project}')`);
  await as(attacker, `insert into class_projects(class_id,project_id) values('${badClass}','harbour-clinic')`);
  await as(student, "select * from join_class('ABCDEF')");
  // Inject a legacy/privileged cross-owner row: server checks must still deny it.
  await db.exec(`insert into class_projects(class_id,project_id) values('${badClass}','${project}')`);
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://review.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  t.after(() => {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  });
  let failTable = "";
  // Real Supabase queries, with HTTP responses backed by the migrated database.
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1);
    if (table === failTable) return Response.json({ code: "42501", message: "Access check unavailable" }, { status: 403 });
    const value = (key: string) => url.searchParams.get(key)?.replace(/^eq\./, "");
    let rows;
    if (table === "generated_projects") {
      rows = (await db.query("select owner_id,title,summary,path_id,draft from generated_projects where id=$1", [value("id")])).rows;
      return Response.json(rows[0]);
    } else if (table === "class_members") {
      rows = (await db.query("select class_id from class_members where student_id=$1", [value("student_id")])).rows;
    } else if (table === "class_projects") {
      const classes = url.searchParams.get("class_id")!.slice(4, -1).split(",");
      // Apply the actual requested owner filter; missing it reproduces the bug.
      const ownerFilter = value("classes.owner_id");
      rows = (await db.query(`select p.class_id from class_projects p join classes c on c.id=p.class_id
        where p.project_id=$1 and p.class_id=any($2::uuid[]) and ($3::uuid is null or c.owner_id=$3::uuid)`,
      [value("project_id"), classes, ownerFilter ?? null])).rows;
    } else throw new Error(`Unexpected request: ${url.pathname}`);
    return Response.json(rows);
  });
  assert.ok(await loadGeneratedScenario(project, owner));
  assert.ok(await loadGeneratedScenario(project, student));
  assert.ok(await loadPlayableListing(project, student));
  assert.equal(await loadGeneratedScenario(project, attacker), null);
  assert.equal(await loadPlayableListing(project, attacker), null);
  failTable = "class_members";
  await assert.rejects(loadGeneratedScenario(project, student), /Could not check project access/);
  failTable = "class_projects";
  await assert.rejects(loadPlayableListing(project, student), /Could not check project access/);
  failTable = "";
  await as(student, `delete from class_members where class_id='${ownClass}'`);
  assert.equal(await loadGeneratedScenario(project, student), null);
});
