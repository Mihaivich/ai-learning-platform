import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { studentClasses } from "../src/lib/classes";

test("roster migration imports, claims verified emails and enforces class isolation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`);
    for (const name of readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
    }
    const teacher = "00000000-0000-4000-8000-000000000001";
    const student = "00000000-0000-4000-8000-000000000002";
    const outsider = "00000000-0000-4000-8000-000000000003";
    const otherTeacher = "00000000-0000-4000-8000-000000000004";
    const later = "00000000-0000-4000-8000-000000000005";
    const cid = "10000000-0000-4000-8000-000000000001";
    const otherClass = "10000000-0000-4000-8000-000000000002";
    await db.exec(`insert into auth.users values
      ('${teacher}','teacher@example.com',now()),('${student}','student@example.com',now()),
      ('${outsider}','outsider@example.com',now()),('${otherTeacher}','other@example.com',now());
      update public.profiles set role='instructor' where id in ('${teacher}','${otherTeacher}');
      insert into public.classes(id,owner_id,name,join_code) values
      ('${cid}','${teacher}','Class A','ABCDEF'),('${otherClass}','${otherTeacher}','Class B','BCDEFG');`);
    async function as(id: string, sql: string) {
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`);
      try { return await db.exec(sql); } finally { await db.exec("reset role"); }
    }
    const rows = async (id: string, sql: string) => (await as(id, sql))[0].rows;
    const imported = await rows(teacher, `select * from public.import_class_roster('${cid}',array['Student@Example.com','student@example.com','later@example.com','cancel@example.com'])`);
    assert.deepEqual(imported, [
      { email: "cancel@example.com", status: "pending" },
      { email: "later@example.com", status: "pending" },
      { email: "student@example.com", status: "added" },
    ]);
    assert.deepEqual(await rows(teacher, `select * from public.import_class_roster('${cid}',array['student@example.com','later@example.com'])`), [
      { email: "later@example.com", status: "already-pending" }, { email: "student@example.com", status: "already-member" },
    ]);
    for (const actor of [student, outsider, otherTeacher]) {
      await assert.rejects(rows(actor, `select * from public.import_class_roster('${cid}',array['guess@example.com'])`), /ownership/);
      assert.deepEqual(await rows(actor, "select * from public.class_invitations"), []);
      await as(actor, `delete from public.class_invitations where class_id='${cid}'`);
    }
    await assert.rejects(as(student, `insert into public.class_invitations(class_id,email) values('${cid}','evil@example.com')`), /permission/);
    await assert.rejects(as(student, `insert into public.class_members(class_id,student_id) values('${cid}','${outsider}')`), /permission/);
    await assert.rejects(as(teacher, `select * from public.import_class_roster('${cid}',array['should-not-save@example.com','invalid'])`), /Invalid email/);
    assert.equal((await rows(teacher, "select * from public.class_invitations")).length, 2);
    await assert.rejects(as(teacher, `select * from public.import_class_roster('${cid}',array_fill('a@example.com'::text,array[501]))`), /500/);
    await db.exec(`insert into auth.users values('${later}','LATER@example.com',null)`);
    assert.equal((await rows(later, "select public.claim_class_invitations() as claimed"))[0].claimed, 0);
    assert.equal((await rows(outsider, "select public.claim_class_invitations() as claimed"))[0].claimed, 0);
    await db.exec(`update auth.users set email_confirmed_at=now() where id='${later}'`);
    assert.equal((await rows(later, "select public.claim_class_invitations() as claimed"))[0].claimed, 1);
    assert.equal((await rows(later, "select public.claim_class_invitations() as claimed"))[0].claimed, 0);
    assert.equal((await rows(later, `select * from public.class_members where class_id='${cid}'`)).length, 1);
    assert.equal((await rows(teacher, `select * from public.class_members where class_id='${cid}'`)).length, 2);
    await as(teacher, `delete from public.class_invitations where class_id='${cid}' and email='cancel@example.com'`);
    assert.deepEqual(await rows(teacher, "select * from public.class_invitations"), []);
    await db.exec(`insert into auth.users values('00000000-0000-4000-8000-000000000006','cancel@example.com',now())`);
    assert.equal((await rows("00000000-0000-4000-8000-000000000006", "select public.claim_class_invitations() as claimed"))[0].claimed, 0);
    // An existing member's pending entry is consumed without adding a duplicate.
    await db.exec(`insert into public.class_invitations(class_id,email) values('${cid}','student@example.com')`);
    await rows(student, "select public.claim_class_invitations()");
    assert.deepEqual(await rows(teacher, "select * from public.class_invitations"), []);
    // Existing join-code enrollment still works.
    await rows(outsider, "select * from public.join_class('ABCDEF')");
    assert.equal((await rows(teacher, `select * from public.class_members where class_id='${cid}'`)).length, 3);
    await db.exec("set role anon");
    await assert.rejects(db.exec("select public.claim_class_invitations()"), /permission/);
    await db.exec("reset role");
  } finally { await db.close(); }
});

test("Projects claims invitations before reading classes and exposes a retry on failure", async () => {
  const calls: string[] = [];
  const db = {
    async rpc(name: string) { calls.push(name); return { error: null }; },
    from(name: string) { calls.push(name); return { select() { return { async eq() { return { data: [] }; } }; } }; },
  };
  assert.deepEqual(await studentClasses(db as never, "student"), []);
  assert.deepEqual(calls, ["claim_class_invitations", "class_members"]);
  await assert.rejects(studentClasses({ async rpc() { return { error: { code: "unavailable" } }; } } as never, "student"), /reload Projects/);
});
