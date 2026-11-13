import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  buildHourlySeries,
  computeEffectiveQuota,
  currentHourWindowMs,
  ROLE_DEFAULT_QUOTA,
} from "../src/lib/ai/quota";
import { submitFeedbackSchema } from "../src/lib/feedback";
import { projectScenarios } from "../src/lib/projects";
import { layoutStructuredDiagram } from "../src/lib/projects/diagram-layout";
import { buildScenario } from "../src/lib/projects/generated/build";
import { accountProfileSchema, readAccountProfile } from "../src/lib/projects/generated/profile";
import { checkProject } from "../src/lib/projects/generated/validate";
import { buildMiniCourse } from "../src/lib/projects/minicourse";
import { wardGelAuditDraft } from "../src/lib/projects/ward-gel-audit";

test("3-tier AI quota precedence: role default -> instructor class cap -> admin override", () => {
  // 1. Role defaults differentiate students, instructors, and admins
  const studentDefault = computeEffectiveQuota("student", null, []);
  const instructorDefault = computeEffectiveQuota("instructor", null, []);
  const adminDefault = computeEffectiveQuota("admin", null, []);

  assert.equal(studentDefault.generation.limit, ROLE_DEFAULT_QUOTA.student.generation);
  assert.equal(instructorDefault.generation.limit, ROLE_DEFAULT_QUOTA.instructor.generation);
  assert.ok(instructorDefault.generation.limit > studentDefault.generation.limit);
  assert.ok(adminDefault.generation.limit > instructorDefault.generation.limit);

  // 2. Instructor class caps restrict (or adjust) students, taking the strictest cap across multiple classes
  const classCapped = computeEffectiveQuota("student", null, [
    {
      classId: "class-a",
      className: "ECON101",
      quotas: { generation: 6, roleplay: null, feedback: 25 },
    },
    {
      classId: "class-b",
      className: "STAT202",
      quotas: { generation: 3, roleplay: 15, feedback: null },
    },
  ]);

  assert.equal(classCapped.generation.limit, 3);
  assert.equal(classCapped.generation.sourceLabel, "Set by class: STAT202");
  assert.equal(classCapped.roleplay.limit, 15);
  assert.equal(classCapped.feedback.limit, 25);
  assert.equal(classCapped.feedback.sourceLabel, "Set by class: ECON101");

  // 3. Instructor class cap of 0 pauses a bucket cleanly
  const pausedGen = computeEffectiveQuota("student", null, [
    {
      classId: "exam-room",
      className: "Closed-Book Viva",
      quotas: { generation: 0, roleplay: 10, feedback: 20 },
    },
  ]);
  assert.equal(pausedGen.generation.limit, 0);

  // 4. Instructors are NOT capped by student class rules
  const instructorWithClass = computeEffectiveQuota("instructor", null, [
    {
      classId: "exam-room",
      className: "Closed-Book Viva",
      quotas: { generation: 0, roleplay: 5, feedback: 5 },
    },
  ]);
  assert.equal(instructorWithClass.generation.limit, ROLE_DEFAULT_QUOTA.instructor.generation);

  // 5. Administrator per-account override beats both role defaults and class caps
  const adminOverridden = computeEffectiveQuota(
    "student",
    { generation: 45, roleplay: null, feedback: 90 },
    [
      {
        classId: "class-b",
        className: "STAT202",
        quotas: { generation: 3, roleplay: 15, feedback: 20 },
      },
    ],
  );
  assert.equal(adminOverridden.generation.limit, 45);
  assert.equal(adminOverridden.generation.source.kind, "account");
  assert.equal(adminOverridden.roleplay.limit, 15); // falls back to class rule when account override is null
  assert.equal(adminOverridden.feedback.limit, 90);
});

test("buildHourlySeries produces 24 ordered hourly slots and aggregates bucket hits accurately", () => {
  const fixedNow = Date.UTC(2026, 10, 12, 10, 25, 0);
  const currentStart = currentHourWindowMs(fixedNow);
  const prevHourIso = new Date(currentStart - 3600_000).toISOString();
  const currentHourIso = new Date(currentStart).toISOString();
  const staleIso = new Date(currentStart - 30 * 3600_000).toISOString();

  const series = buildHourlySeries(
    [
      { bucket: "generation", window_start: prevHourIso, hits: 2 },
      { bucket: "roleplay", window_start: prevHourIso, hits: 5 },
      { bucket: "feedback", window_start: currentHourIso, hits: 4 },
      { bucket: "generation", window_start: currentHourIso, hits: 1 },
      { bucket: "generation", window_start: staleIso, hits: 99 },
    ],
    fixedNow,
  );

  assert.equal(series.length, 24);
  assert.equal(series[22].generation, 2);
  assert.equal(series[22].roleplay, 5);
  assert.equal(series[22].total, 7);
  assert.equal(series[23].generation, 1);
  assert.equal(series[23].feedback, 4);
  assert.equal(series[23].total, 5);
  assert.equal(
    series.reduce((sum, pt) => sum + pt.total, 0),
    12,
  );
});

test("every built-in mini-course slide produces a deterministic structured SVG layout and interactive lens filter", () => {
  for (const scenario of projectScenarios) {
    const miniCourse = buildMiniCourse(scenario);
    assert.ok(miniCourse.slides.length >= 4, `${scenario.id} should have at least 4 slides`);

    for (const slide of miniCourse.slides) {
      assert.ok(slide.structuredDiagram, `${scenario.id}:${slide.id} missing structuredDiagram`);
      assert.ok(slide.structuredDiagram.nodes.length >= 3 && slide.structuredDiagram.nodes.length <= 6);

      for (const lens of ["both", "trap", "sound"] as const) {
        const layout = layoutStructuredDiagram(slide.structuredDiagram, lens);
        assert.equal(layout.nodes.length, slide.structuredDiagram.nodes.length);
        for (const node of layout.nodes) {
          assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y));
          assert.ok(node.width > 0 && node.height > 0);
          assert.ok(node.titleLines.length >= 1);
          if (lens === "both") {
            assert.equal(node.dimmed, false);
          }
        }
        for (const edge of layout.edges) {
          assert.match(edge.path, /^M\s/);
          assert.ok(Number.isFinite(edge.labelX) && Number.isFinite(edge.labelY));
        }
      }
    }
  }
});

test("project validator accepts valid bespoke concept diagrams and catches broken node/edge references", async () => {
  const validScenario = buildScenario(wardGelAuditDraft, { id: "gen-validtest01" });
  const cleanCheck = await checkProject(validScenario, wardGelAuditDraft, { requireConcepts: true });
  assert.deepEqual(cleanCheck.problems, []);

  const brokenDraft = structuredClone(wardGelAuditDraft);
  brokenDraft.concepts!.problem.diagram = {
    caption: "Broken graph",
    nodes: [
      { id: "dup", label: "First", detail: "First node", tone: "neutral", lane: "shared" },
      { id: "dup", label: "Second", detail: "Duplicate id", tone: "trap", lane: "trap" },
      { id: "end", label: "End", detail: "End node", tone: "sound", lane: "sound" },
    ],
    edges: [
      { from: "dup", to: "ghost", label: "Missing target" },
      { from: "end", to: "end", label: "Self loop" },
    ],
  };

  const brokenScenario = buildScenario(brokenDraft, { id: "gen-brokentest1" });
  const brokenCheck = await checkProject(brokenScenario, brokenDraft, { requireConcepts: true });
  assert.ok(brokenCheck.problems.some((p) => /duplicate node id "dup"/i.test(p)));
  assert.ok(brokenCheck.problems.some((p) => /unknown node id/i.test(p)));
  assert.ok(brokenCheck.problems.some((p) => /loops to itself/i.test(p)));
});

test("unified account profile and feedback schemas validate and normalise legacy inputs", () => {
  const parsed = readAccountProfile({
    display_name: "  Alex Chan  ",
    background: "cs_student",
    experience: "some",
  });
  assert.deepEqual(parsed, {
    displayName: "Alex Chan",
    background: "a computer science student",
    level: "some",
  });

  assert.equal(
    accountProfileSchema.safeParse({
      displayName: "Dr. Lam",
      background: "Clinical epidemiology",
      level: "comfortable",
    }).success,
    true,
  );

  assert.equal(
    submitFeedbackSchema.safeParse({
      projectId: "ward-gel-audit",
      kind: "diagram_broken",
      surface: "primer",
      targetId: "concept-1-how",
      targetLabel: "Denominator bias",
      message: "Edge label overlaps on narrow viewport.",
      context: { nodeCount: 4 },
    }).success,
    true,
  );
});

test("postgres migration enforces quota guardrails, instructor class caps, and content feedback RLS", async () => {
  const teacher = "00000000-0000-4000-8000-000000000011";
  const otherTeacher = "00000000-0000-4000-8000-000000000012";
  const student = "00000000-0000-4000-8000-000000000013";
  const outsider = "00000000-0000-4000-8000-000000000014";
  const genProjId = "gen-teacherproj01";

  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls;
     create schema auth;
     create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
     grant usage on schema public, auth to anon, authenticated, service_role;
     grant execute on function auth.uid() to anon, authenticated, service_role;`,
  );

  const migrations = [
    "0001_init.sql",
    "20261022050613_general_learning_platform.sql",
    "20261022180000_review_fixes.sql",
    "20261022203000_quota_params_and_owner_read.sql",
    "20261022235900_learning_preferences.sql",
    "20261023090000_simulation_sessions.sql",
    "20261031150000_generated_projects.sql",
    "20261101120000_learning_paths.sql",
    "20261102090000_classes.sql",
    "20261112090000_public_gallery.sql",
    "20261112183000_quotas_diagrams_feedback_profile.sql",
  ];

  await db.exec(readFileSync(`supabase/migrations/${migrations[0]}`, "utf8"));
  await db.exec("grant all on all tables in schema public to anon, authenticated, service_role;");
  for (const file of migrations.slice(1)) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  // Verify idempotency by re-running the new migration a second time.
  await db.exec(readFileSync("supabase/migrations/20261112183000_quotas_diagrams_feedback_profile.sql", "utf8"));

  await db.exec(
    `insert into auth.users values
      ('${teacher}','teacher@example.test',now()),
      ('${otherTeacher}','other@example.test',now()),
      ('${student}','student@example.test',now()),
      ('${outsider}','outsider@example.test',now());
     update public.profiles set role = 'instructor' where id in ('${teacher}', '${otherTeacher}');
     insert into public.generated_projects (id, owner_id, domain, topic, title, tagline, summary, draft, template_version, model)
     values ('${genProjId}', '${teacher}', 'statistics', 'Ward gel audit', 'Ward Gel Audit', 'Tagline', 'Summary', '{}'::jsonb, 1, 'gemini-test');`,
  );

  async function asUser(id: string, sql: string) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
    try {
      return await db.exec(sql);
    } finally {
      await db.exec("reset role");
    }
  }

  // 1. Neither students nor instructors can self-edit profiles.quota_*
  await assert.rejects(
    asUser(student, "update public.profiles set quota_generation = 200 where id = auth.uid()"),
    /permission|administrator/,
  );
  await assert.rejects(
    asUser(teacher, "update public.profiles set quota_generation = 200 where id = auth.uid()"),
    /permission|administrator/,
  );

  // 2. Service role (administrator backend) CAN set account-level quota overrides
  await db.exec(`update public.profiles set quota_generation = 45 where id = '${student}'`);
  const studentProf = await asUser(student, "select quota_generation from public.profiles where id = auth.uid()");
  assert.equal(studentProf[0].rows[0].quota_generation, 45);

  // 3. Instructor creates a class, sets student hourly quotas, and student joins & reads them
  const createdClass = await asUser(
    teacher,
    "insert into public.classes (owner_id, name, join_code) values (auth.uid(), 'STAT 101', 'STAT26') returning id",
  );
  const classId = createdClass[0].rows[0].id as string;

  const updatedClass = await asUser(
    teacher,
    `update public.classes set quota_generation = 5, quota_roleplay = 20, quota_feedback = 25 where id = '${classId}' returning quota_generation, quota_roleplay, quota_feedback`,
  );
  assert.equal(updatedClass[0].rows[0].quota_generation, 5);
  assert.equal(updatedClass[0].rows[0].quota_roleplay, 20);

  // Other instructor cannot modify teacher's class quotas
  const otherAttempt = await asUser(
    otherTeacher,
    `update public.classes set quota_generation = 99 where id = '${classId}' returning id`,
  );
  assert.equal(otherAttempt[0].rows.length, 0);

  // Student joins via join_class and reads class quota limits, but cannot alter them
  await asUser(student, "select * from public.join_class('STAT26')");
  const memberRead = await asUser(
    student,
    `select quota_generation, quota_roleplay from public.classes where id = '${classId}'`,
  );
  assert.equal(memberRead[0].rows[0].quota_generation, 5);

  const studentTamper = await asUser(
    student,
    `update public.classes set quota_generation = 100 where id = '${classId}' returning id`,
  );
  assert.equal(studentTamper[0].rows.length, 0);

  // 4. consume_ai_quota supports instructor/admin caps > 100 (up to 500)
  const highCapOk = await asUser(teacher, "select public.consume_ai_quota('roleplay', 120, 3600) as ok");
  assert.equal(highCapOk[0].rows[0].ok, true);
  await assert.rejects(
    asUser(teacher, "select public.consume_ai_quota('roleplay', 501, 3600)"),
    /Invalid quota window/,
  );

  // 5. Content & Diagram feedback RLS: student reports -> owning instructor reads & resolves -> outsiders blocked
  await assert.rejects(
    asUser(
      student,
      `insert into public.content_feedback (reporter_id, project_id, kind, surface, message)
       values ('${outsider}', '${genProjId}', 'content_error', 'primer', 'Forged reporter')`,
    ),
    /row-level security/,
  );

  const insertedReport = await asUser(
    student,
    `insert into public.content_feedback (reporter_id, project_id, kind, surface, target_id, message, context)
     values (auth.uid(), '${genProjId}', 'diagram_broken', 'primer', 'concept-1-how', 'Node label clipped', '{"slide":"concept-1-how"}'::jsonb)
     returning id, status`,
  );
  const reportId = insertedReport[0].rows[0].id as string;
  assert.equal(insertedReport[0].rows[0].status, "open");

  // Outsider and non-owning instructor cannot see the report
  assert.equal(
    (await asUser(outsider, `select id from public.content_feedback where id = '${reportId}'`))[0].rows.length,
    0,
  );
  assert.equal(
    (await asUser(otherTeacher, `select id from public.content_feedback where id = '${reportId}'`))[0].rows.length,
    0,
  );

  // Owning instructor reads and resolves the report
  const ownerInbox = await asUser(
    teacher,
    `select id, kind, message from public.content_feedback where project_id = '${genProjId}'`,
  );
  assert.equal(ownerInbox[0].rows.length, 1);
  assert.equal(ownerInbox[0].rows[0].kind, "diagram_broken");

  const resolved = await asUser(
    teacher,
    `update public.content_feedback set status = 'resolved', resolution_note = 'Shortened node title', resolved_at = now()
     where id = '${reportId}' returning status`,
  );
  assert.equal(resolved[0].rows[0].status, "resolved");

  // Student cannot resolve their own report (only project owner or admin service_role)
  const studentResolve = await asUser(
    student,
    `update public.content_feedback set status = 'open' where id = '${reportId}' returning id`,
  );
  assert.equal(studentResolve[0].rows.length, 0);

  await db.close();
});
