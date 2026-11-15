import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeEffectiveQuota,
  enforceQuota,
  ROLE_DEFAULT_QUOTA,
} from "../src/lib/ai/quota";
import { classQuotaSchema } from "../src/lib/classes";
import { feedbackContextSchema } from "../src/lib/feedback-shared";
import { getProjectScenario } from "../src/lib/projects";
import { layoutStructuredDiagram } from "../src/lib/projects/diagram-layout";
import { buildMiniCourse } from "../src/lib/projects/minicourse";

const MIGRATIONS = [
  "0001_init.sql",
  "20261022050613_general_learning_platform.sql",
  "20261022180000_review_fixes.sql",
  "20261022203000_quota_params_and_owner_read.sql",
  "20261022235900_learning_preferences.sql",
  "20261023090000_simulation_sessions.sql",
  "20261031150000_generated_projects.sql",
  "20261101120000_learning_paths.sql",
  "20261102090000_classes.sql",
  "20261112183000_quotas_diagrams_feedback_profile.sql",
];

async function setupMigratedDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth;
    grant usage on schema auth to authenticated, anon, service_role;
    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz default now()
    );
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);

  for (const file of MIGRATIONS) {
    const sql = readFileSync(path.join(process.cwd(), "supabase/migrations", file), "utf8");
    await db.exec(sql);
  }
  // Verify latest migration is idempotent when re-applied.
  const latestSql = readFileSync(
    path.join(process.cwd(), "supabase/migrations", MIGRATIONS[MIGRATIONS.length - 1]),
    "utf8",
  );
  await db.exec(latestSql);
  return db;
}

async function asAuth<T = Record<string, unknown>>(
  db: PGlite,
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.exec(
      `set local role authenticated; select set_config('request.jwt.claim.sub', '${userId}', true);`,
    );
    const res = await tx.query<T>(sql, params);
    return res.rows;
  });
}

test("PostgreSQL migrations, downward quotas, owner-only class removal & feedback RLS", async () => {
  const db = await setupMigratedDb();

  const studentId = "11111111-1111-4111-8111-111111111111";
  const student2Id = "22222222-2222-4222-8222-222222222222";
  const instructorId = "33333333-3333-4333-8333-333333333333";
  const adminId = "44444444-4444-4444-8444-444444444444";

  await db.exec(`
    insert into auth.users (id, email) values
      ('${studentId}', 'student1@example.com'),
      ('${student2Id}', 'student2@example.com'),
      ('${instructorId}', 'teacher@example.com'),
      ('${adminId}', 'admin@example.com');

    insert into public.profiles (id, role) values
      ('${studentId}', 'student'),
      ('${student2Id}', 'student'),
      ('${instructorId}', 'instructor'),
      ('${adminId}', 'admin')
    on conflict (id) do update set role = excluded.role;
  `);

  // 1. Default student allowance (12 hits allowed, 13th blocked).
  for (let i = 1; i <= 12; i++) {
    const rows = await asAuth<{ ok: boolean }>(
      db,
      studentId,
      "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
    );
    assert.equal(rows[0].ok, true, `student default hit ${i} should succeed`);
  }
  const overStudentDefault = await asAuth<{ ok: boolean }>(
    db,
    studentId,
    "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
  );
  assert.equal(overStudentDefault[0].ok, false);

  // Reset usage before testing downward class cap & admin override.
  await db.exec("delete from public.ai_usage;");

  const strictClassId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const highCapClassId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await db.exec(`
    insert into public.classes (id, owner_id, name, join_code, quota_generation) values
      ('${strictClassId}', '${instructorId}', 'Strict Cohort', 'STRCT2', 3),
      ('${highCapClassId}', '${instructorId}', 'Inflated Attempt', 'HGCAP2', 25);

    insert into public.class_members (class_id, student_id) values
      ('${strictClassId}', '${studentId}'),
      ('${highCapClassId}', '${student2Id}');
  `);

  // Downward cap = 3 blocks hit 4.
  for (let i = 1; i <= 3; i++) {
    const rows = await asAuth<{ ok: boolean }>(
      db,
      studentId,
      "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
    );
    assert.equal(rows[0].ok, true, `strict class hit ${i} should succeed`);
  }
  assert.equal(
    (
      await asAuth<{ ok: boolean }>(
        db,
        studentId,
        "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
      )
    )[0].ok,
    false,
  );

  // Inflated class cap (25) still clamps downward at student default (12).
  for (let i = 1; i <= 12; i++) {
    const rows = await asAuth<{ ok: boolean }>(
      db,
      student2Id,
      "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
    );
    assert.equal(rows[0].ok, true, `clamped student hit ${i} should succeed`);
  }
  assert.equal(
    (
      await asAuth<{ ok: boolean }>(
        db,
        student2Id,
        "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
      )
    )[0].ok,
    false,
  );

  // Instructor role default allows 30 generation hits, blocks 31st.
  for (let i = 1; i <= 30; i++) {
    const rows = await asAuth<{ ok: boolean }>(
      db,
      instructorId,
      "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
    );
    assert.equal(rows[0].ok, true, `instructor hit ${i} should succeed`);
  }
  assert.equal(
    (
      await asAuth<{ ok: boolean }>(
        db,
        instructorId,
        "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
      )
    )[0].ok,
    false,
  );

  // Admin account override = 20 overrides strict class cap = 3 (student already has 4 hits).
  await db.exec(`update public.profiles set quota_generation = 20 where id = '${studentId}';`);
  for (let i = 5; i <= 20; i++) {
    const rows = await asAuth<{ ok: boolean }>(
      db,
      studentId,
      "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
    );
    assert.equal(rows[0].ok, true, `admin override hit ${i} should succeed`);
  }
  assert.equal(
    (
      await asAuth<{ ok: boolean }>(
        db,
        studentId,
        "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
      )
    )[0].ok,
    false,
  );

  // Admin override = 0 blocks immediately.
  await db.exec(`update public.profiles set quota_generation = 0 where id = '${studentId}';`);
  assert.equal(
    (
      await asAuth<{ ok: boolean }>(
        db,
        studentId,
        "select public.enforce_effective_ai_quota('generation', 12, 3600) as ok",
      )
    )[0].ok,
    false,
  );

  // Student can update allowed profile columns (display_name), but SQL column grants + guard_profile_role block quota/role edits.
  const updatedDisplay = await asAuth<{ display_name: string | null }>(
    db,
    student2Id,
    "update public.profiles set display_name = 'Alex' where id = $1 returning display_name",
    [student2Id],
  );
  assert.deepEqual(updatedDisplay, [{ display_name: "Alex" }]);

  await assert.rejects(
    asAuth(db, student2Id, "update public.profiles set quota_generation = 100 where id = $1", [student2Id]),
    /permission denied/,
  );
  await assert.rejects(
    asAuth(db, student2Id, "update public.profiles set role = 'admin' where id = $1", [student2Id]),
    /permission denied/,
  );

  // Defense-in-depth: even if column update privileges were present, private.guard_profile_role() blocks quota edits.
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.exec(
        `grant update (quota_generation) on public.profiles to authenticated;
         set local role authenticated;
         select set_config('request.jwt.claim.sub', '${student2Id}', true);`,
      );
      await tx.query("update public.profiles set quota_generation = 100 where id = $1", [student2Id]);
    }),
    /Only an administrator may change account quotas/,
  );

  // 2. Owner-only removal on class_members: self-delete returns 0 rows, owner delete returns 1 row.
  const selfDelete = await asAuth<{ student_id: string }>(
    db,
    studentId,
    "delete from public.class_members where class_id = $1 and student_id = $2 returning student_id",
    [strictClassId, studentId],
  );
  assert.equal(selfDelete.length, 0);

  const ownerDelete = await asAuth<{ student_id: string }>(
    db,
    instructorId,
    "delete from public.class_members where class_id = $1 and student_id = $2 returning student_id",
    [strictClassId, studentId],
  );
  assert.equal(ownerDelete.length, 1);

  // Re-enroll student into strictClassId to test assigned generated-project feedback access.
  await db.exec(`
    insert into public.class_members (class_id, student_id)
    values ('${strictClassId}', '${studentId}') on conflict do nothing;

    insert into public.generated_projects (id, owner_id, domain, topic, title, tagline, summary, draft, template_version, model)
    values
      ('gen-assigned0001', '${instructorId}', 'Healthcare', 'Assigned triage', 'Assigned Project', 'Tag', 'Sum', '{}'::jsonb, 1, 'test'),
      ('gen-private00001', '${instructorId}', 'Retail', 'Secret project', 'Private Project', 'Tag', 'Sum', '{}'::jsonb, 1, 'test');

    insert into public.class_projects (class_id, project_id)
    values ('${strictClassId}', 'gen-assigned0001');
  `);

  // 3. Hardened content_feedback RLS: built-in slug + assigned gen-* allowed; bogus/unassigned/oversized/rate-limited blocked.
  const builtInFeedback = await asAuth<{ id: string }>(
    db,
    studentId,
    `insert into public.content_feedback (reporter_id, project_id, kind, surface, target_id, target_label, message, context)
     values ($1, 'harbour-clinic', 'diagram_broken', 'learn', 'slide-1', 'Slide 1', 'Diagram arrow clips label.', '{"lens":"both"}'::jsonb)
     returning id`,
    [studentId],
  );
  assert.equal(builtInFeedback.length, 1);

  const assignedFeedback = await asAuth<{ id: string }>(
    db,
    studentId,
    `insert into public.content_feedback (reporter_id, project_id, kind, surface, message)
     values ($1, 'gen-assigned0001', 'content_error', 'desktop', 'Client mail contradicts rule.')
     returning id`,
    [studentId],
  );
  assert.equal(assignedFeedback.length, 1);

  await assert.rejects(
    asAuth(
      db,
      studentId,
      `insert into public.content_feedback (reporter_id, project_id, kind, surface, message)
       values ($1, 'not-a-real-slug', 'unclear', 'desktop', 'Should reject bogus project id.')`,
      [studentId],
    ),
    /row-level security/,
  );

  await assert.rejects(
    asAuth(
      db,
      studentId,
      `insert into public.content_feedback (reporter_id, project_id, kind, surface, message)
       values ($1, 'gen-private00001', 'unclear', 'desktop', 'Should reject unassigned gen-* id.')`,
      [studentId],
    ),
    /row-level security/,
  );

  const bigValue = "x".repeat(2100);
  await assert.rejects(
    asAuth(
      db,
      studentId,
      `insert into public.content_feedback (reporter_id, project_id, kind, surface, message, context)
       values ($1, 'harbour-clinic', 'unclear', 'report', 'Too big context payload.', jsonb_build_object('blob', $2::text))`,
      [studentId, bigValue],
    ),
    /check/i,
  );

  // Already inserted 2 reports for studentId this hour; insert 18 more to reach 20, then 21st blocks.
  for (let i = 3; i <= 20; i++) {
    const inserted = await asAuth<{ id: string }>(
      db,
      studentId,
      `insert into public.content_feedback (reporter_id, project_id, kind, surface, message)
       values ($1, 'harbour-clinic', 'unclear', 'primer', $2) returning id`,
      [studentId, `Batch report #${i}`],
    );
    assert.equal(inserted.length, 1);
  }
  await assert.rejects(
    asAuth(
      db,
      studentId,
      `insert into public.content_feedback (reporter_id, project_id, kind, surface, message)
       values ($1, 'harbour-clinic', 'unclear', 'primer', '21st report exceeds hourly cap')`,
      [studentId],
    ),
    /row-level security/,
  );

  // Unrelated student2 cannot read or resolve; owner can read/resolve gen-assigned0001; admin can read/resolve harbour-clinic.
  const outsiderRead = await asAuth(
    db,
    student2Id,
    "select id from public.content_feedback where id = $1",
    [assignedFeedback[0].id],
  );
  assert.equal(outsiderRead.length, 0);

  const ownerResolved = await asAuth<{ status: string }>(
    db,
    instructorId,
    "update public.content_feedback set status = 'resolved', resolution_note = 'Fixed!' where id = $1 returning status",
    [assignedFeedback[0].id],
  );
  assert.deepEqual(ownerResolved, [{ status: "resolved" }]);

  const adminResolved = await asAuth<{ status: string }>(
    db,
    adminId,
    "update public.content_feedback set status = 'resolved' where id = $1 returning status",
    [builtInFeedback[0].id],
  );
  assert.deepEqual(adminResolved, [{ status: "resolved" }]);
});

test("computeEffectiveQuota enforces downward-only class caps, multi-class min & admin overrides", () => {
  const base = computeEffectiveQuota("student", null, []);
  assert.equal(base.generation.limit, ROLE_DEFAULT_QUOTA.student.generation);
  assert.equal(base.roleplay.limit, ROLE_DEFAULT_QUOTA.student.roleplay);
  assert.equal(base.feedback.limit, ROLE_DEFAULT_QUOTA.student.feedback);

  const clamped = computeEffectiveQuota("student", null, [
    { classId: "c1", className: "Inflated", quotas: { generation: 99, roleplay: null, feedback: 15 } },
    { classId: "c2", className: "Strict", quotas: { generation: 4, roleplay: 10, feedback: 20 } },
  ]);
  assert.equal(clamped.generation.limit, 4);
  assert.equal(clamped.generation.source.kind, "class");
  assert.equal(clamped.roleplay.limit, 10);
  assert.equal(clamped.feedback.limit, 15);

  const neverRaised = computeEffectiveQuota("student", null, [
    { classId: "c1", className: "Inflated", quotas: { generation: 35, roleplay: 90, feedback: 100 } },
  ]);
  assert.equal(neverRaised.generation.limit, 12);
  assert.equal(neverRaised.roleplay.limit, 40);
  assert.equal(neverRaised.feedback.limit, 40);

  const overridden = computeEffectiveQuota(
    "student",
    { generation: 25, roleplay: 0, feedback: null },
    [{ classId: "c2", className: "Strict", quotas: { generation: 4, roleplay: 10, feedback: 20 } }],
  );
  assert.equal(overridden.generation.limit, 25);
  assert.equal(overridden.generation.source.kind, "account");
  assert.equal(overridden.roleplay.limit, 0);
  assert.equal(overridden.roleplay.source.kind, "account");
  assert.equal(overridden.feedback.limit, 20);
});

test("classQuotaSchema rejects class limits above platform student defaults or negative values", () => {
  const ok = classQuotaSchema.safeParse({ generation: 12, roleplay: 40, feedback: 0 });
  assert.equal(ok.success, true);

  assert.equal(classQuotaSchema.safeParse({ generation: 13, roleplay: null, feedback: null }).success, false);
  assert.equal(classQuotaSchema.safeParse({ generation: null, roleplay: 41, feedback: null }).success, false);
  assert.equal(classQuotaSchema.safeParse({ generation: -1, roleplay: null, feedback: null }).success, false);
});

test("enforceQuota issues exactly one RPC call without pre-queries", async () => {
  const rpcCalls: { fn: string; params: Record<string, unknown> }[] = [];
  const fromCalls: string[] = [];

  const makeMockDb = (ok: boolean) =>
    ({
      from(table: string) {
        fromCalls.push(table);
        throw new Error(`Unexpected pre-query to table ${table}`);
      },
      async rpc(fn: string, params: Record<string, unknown>) {
        rpcCalls.push({ fn, params });
        return { data: ok, error: null };
      },
    }) as unknown as SupabaseClient;

  await enforceQuota(makeMockDb(true), "user-123", "generation");
  assert.equal(fromCalls.length, 0);
  assert.deepEqual(rpcCalls, [
    {
      fn: "enforce_effective_ai_quota",
      params: { p_bucket: "generation", max_hits: 12, window_seconds: 3600 },
    },
  ]);

  await assert.rejects(
    () => enforceQuota(makeMockDb(false), "user-123", "generation"),
    (err: { status?: number }) => err.status === 429,
  );
});

test("feedbackContextSchema allows flat primitives only and rejects nested/oversized payloads", () => {
  const valid = feedbackContextSchema.safeParse({
    slideId: "slide-1",
    lens: "both",
    nodeCount: 5,
    passed: true,
    empty: null,
  });
  assert.equal(valid.success, true);

  assert.equal(feedbackContextSchema.safeParse({ nested: { a: 1 } }).success, false);
  assert.equal(feedbackContextSchema.safeParse({ items: ["a", "b"] }).success, false);

  const tooManyKeys: Record<string, string> = {};
  for (let i = 0; i < 13; i++) tooManyKeys[`k${i}`] = "v";
  assert.equal(feedbackContextSchema.safeParse(tooManyKeys).success, false);

  // 7 keys * 280 chars exceeds the 1800-char serialized budget while keeping each value <= 300.
  const oversized: Record<string, string> = {};
  for (let i = 0; i < 7; i++) oversized[`field_${i}`] = "a".repeat(280);
  assert.equal(feedbackContextSchema.safeParse(oversized).success, false);
});

test("layoutStructuredDiagram & buildMiniCourse produce finite diagrams without leaking secrets or Viva", () => {
  const scenario = getProjectScenario("harbour-clinic");
  assert.ok(scenario, "harbour-clinic scenario must load");

  const course = buildMiniCourse(scenario);
  assert.ok(course.slides.length >= 3);

  for (const slide of course.slides) {
    const layout = layoutStructuredDiagram(slide.structuredDiagram, "both");
    assert.ok(Number.isFinite(layout.width) && layout.width > 0);
    assert.ok(Number.isFinite(layout.height) && layout.height > 0);
    assert.ok(layout.nodes.length >= 3);
    for (const node of layout.nodes) {
      assert.ok(
        Number.isFinite(node.x) &&
          Number.isFinite(node.y) &&
          Number.isFinite(node.width) &&
          Number.isFinite(node.height),
        `node ${node.id} must have finite geometry`,
      );
      assert.equal(node.dimmed, false);
    }
    for (const edge of layout.edges) {
      assert.ok(Number.isFinite(edge.labelX) && Number.isFinite(edge.labelY));
      assert.ok(edge.path.length > 0);
    }
  }

  // Verify lane-based lens dimming on a comparison diagram.
  const comparisonSlide = course.slides.find((s) =>
    s.structuredDiagram.nodes.some((n) => n.lane === "trap" || n.tone === "trap") &&
    s.structuredDiagram.nodes.some((n) => n.lane === "sound" || n.tone === "sound"),
  );
  assert.ok(comparisonSlide, "expected at least one diagram contrasting trap vs sound lanes");

  const trapView = layoutStructuredDiagram(comparisonSlide.structuredDiagram, "trap");
  const soundView = layoutStructuredDiagram(comparisonSlide.structuredDiagram, "sound");

  for (const node of trapView.nodes) {
    const lane = node.lane ?? (node.tone === "trap" ? "trap" : node.tone === "sound" || node.tone === "accent" ? "sound" : "shared");
    if (lane === "trap" || lane === "shared") assert.equal(node.dimmed, false);
    if (lane === "sound") assert.equal(node.dimmed, true);
  }
  for (const node of soundView.nodes) {
    const lane = node.lane ?? (node.tone === "trap" ? "trap" : node.tone === "sound" || node.tone === "accent" ? "sound" : "shared");
    if (lane === "sound" || lane === "shared") assert.equal(node.dimmed, false);
    if (lane === "trap") assert.equal(node.dimmed, true);
  }

  // Security & scope boundary checks: zero leaked hidden facts/variants and zero Viva copy.
  const serialized = JSON.stringify(course);
  assert.equal(/\bviva\b/i.test(serialized), false, "PR #36 must not contain Viva references");

  for (const fact of scenario.facts) {
    assert.equal(serialized.includes(fact.text), false, `must not leak fact text: ${fact.id}`);
    assert.equal(serialized.includes(fact.reply), false, `must not leak fact reply: ${fact.id}`);
  }
  for (const req of scenario.requirements) {
    assert.equal(serialized.includes(req.label), false, `must not leak requirement checklist: ${req.id}`);
  }
  for (const item of scenario.brief) {
    assert.equal(serialized.includes(item.label), false, `must not leak brief checklist: ${item.id}`);
  }
  for (const variant of Object.values(scenario.variants)) {
    assert.equal(serialized.includes(variant.prSummary), false, `must not leak variant summary: ${variant.id}`);
    for (const file of variant.files) {
      for (const line of file.lines) {
        if (line.trim().length > 16) {
          assert.equal(serialized.includes(line), false, `must not leak code line from ${variant.id}`);
        }
      }
    }
  }
});
