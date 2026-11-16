import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const owner = "00000000-0000-4000-8000-000000000011";
const peer = "00000000-0000-4000-8000-000000000012";

const MIGRATIONS = [
  "supabase/migrations/0001_init.sql",
  "supabase/migrations/20261022050613_general_learning_platform.sql",
  "supabase/migrations/20261022180000_review_fixes.sql",
  "supabase/migrations/20261022203000_quota_params_and_owner_read.sql",
  "supabase/migrations/20261022235900_learning_preferences.sql",
  "supabase/migrations/20261023090000_simulation_sessions.sql",
  "supabase/migrations/20261031150000_generated_projects.sql",
  "supabase/migrations/20261101120000_learning_paths.sql",
  "supabase/migrations/20261102090000_classes.sql",
  "supabase/migrations/20261112090000_public_gallery.sql",
];

test("public gallery migration preserves path grants, hides owner_id publicly, and restricts sharing toggle to owner", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls;
     create schema auth;
     create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
     grant usage on schema public, auth to anon, authenticated, service_role;
     grant execute on function auth.uid() to anon, authenticated, service_role;`,
  );

  for (let i = 0; i < MIGRATIONS.length; i++) {
    if (i === 1) {
      await db.exec("grant all on all tables in schema public to anon, authenticated, service_role;");
    }
    await db.exec(readFileSync(MIGRATIONS[i], "utf8"));
  }

  await db.exec(
    `insert into auth.users values ('${owner}','owner@example.test',now()), ('${peer}','peer@example.test',now());`,
  );

  await db.exec(
    `insert into public.learning_paths(id, owner_id, subject, domain, title, summary, plan, model)
     values ('path-gallery00001', '${owner}', 'Epidemiology', 'public health', 'Outbreak Path', 'Three steps', '{}'::jsonb, 'fake');`,
  );

  await db.exec(
    `insert into public.generated_projects
       (id, owner_id, domain, subject, topic, title, tagline, summary, draft, template_version, model, path_id, path_step, is_public)
     values
       ('gen-public000001', '${owner}', 'public health', 'Epidemiology', 'Water audit', 'Public Pump Audit', 'Inspect readings', 'Full summary one', '{"secret":true}'::jsonb, 1, 'fake', 'path-gallery00001', 1, false),
       ('gen-private00002', '${owner}', 'finance', 'Accounting', 'Ledger check', 'Private Ledger', 'Private tagline', 'Private summary', '{"secret":true}'::jsonb, 1, 'fake', null, null, false);`,
  );

  async function asUser(userId: string, sql: string) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`);
    try {
      return await db.exec(sql);
    } finally {
      await db.exec("reset role");
    }
  }

  async function asAnon(sql: string) {
    await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false);");
    try {
      return await db.exec(sql);
    } finally {
      await db.exec("reset role");
    }
  }

  // 1. Owner still has select on path_id, path_step plus subject and is_public.
  const ownCols = await asUser(
    owner,
    "select id, path_id, path_step, subject, is_public from public.generated_projects order by id",
  );
  assert.equal(ownCols[0].rows.length, 2);
  assert.equal(ownCols[0].rows[1].path_id, "path-gallery00001");
  assert.equal(ownCols[0].rows[1].path_step, 1);
  assert.equal(ownCols[0].rows[1].subject, "Epidemiology");

  // 2. Non-owner cannot toggle is_public; owner can toggle is_public but not title.
  const peerUpdate = await asUser(
    peer,
    "update public.generated_projects set is_public = true where id = 'gen-public000001' returning id",
  );
  assert.equal(peerUpdate[0].rows.length, 0);

  await assert.rejects(
    asUser(owner, "update public.generated_projects set title = 'Hijacked' where id = 'gen-public000001'"),
    /permission/,
  );

  const ownerUpdate = await asUser(
    owner,
    "update public.generated_projects set is_public = true where id = 'gen-public000001' returning id, is_public",
  );
  assert.equal(ownerUpdate[0].rows[0].is_public, true);

  // 3. Even after sharing, neither peer nor anon can read owner_id or rows directly from generated_projects.
  const peerDirect = await asUser(peer, "select id, owner_id from public.generated_projects");
  assert.equal(peerDirect[0].rows.length, 0);
  await assert.rejects(asAnon("select id, owner_id from public.generated_projects"), /permission/);

  // 4. Community discovery RPC works for anon and peer and exposes no owner_id or draft.
  for (const res of [
    await asAnon("select * from public.list_public_projects(10)"),
    await asUser(peer, "select * from public.list_public_projects(10)"),
  ]) {
    assert.equal(res[0].rows.length, 1);
    const row = res[0].rows[0] as Record<string, unknown>;
    assert.equal(row.id, "gen-public000001");
    assert.equal(row.subject, "Epidemiology");
    assert.equal("owner_id" in row, false);
    assert.equal("draft" in row, false);
  }

  await db.close();
});
