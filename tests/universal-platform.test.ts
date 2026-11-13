import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { guideFor, nextStep } from "../src/components/projects/desktop/config";
import { getProjectScenario } from "../src/lib/projects";
import { inferDiscipline, projectListings } from "../src/lib/projects/catalog";
import { offlineEvaluator } from "../src/lib/projects/evaluate";
import { buildScenario } from "../src/lib/projects/generated/build";
import { checkProject } from "../src/lib/projects/generated/validate";
import { buildMiniCourse } from "../src/lib/projects/minicourse";
import {
  answerViva,
  askClient,
  chooseAction,
  endInterview,
  memoOf,
  projectView,
  requestChanges,
  sendBack,
  startProject,
  submitBrief,
  submitRequirements,
  type ProjectStep,
} from "../src/lib/projects/runtime";
import { itemCoveredBy } from "../src/lib/projects/composer";
import type { SimulationHistory } from "../src/lib/learning/simulation/engine";
import { wardGelAuditDraft } from "../src/lib/projects/ward-gel-audit";

test("polymorphic specialist artifacts label rows, clauses, and steps without code jargon", async () => {
  const cases = [
    { id: "ward-gel-audit", kind: "table", prefix: "row " },
    { id: "bean-and-bread", kind: "document", prefix: "§" },
    { id: "river-nitrate-lab", kind: "steps", prefix: "step " },
  ] as const;

  for (const item of cases) {
    const scenario = getProjectScenario(item.id)!;
    assert.equal(scenario.artifactKind, item.kind);

    let state = startProject(scenario);
    state = chooseAction(scenario, state, "pick-engineering").state;
    state = chooseAction(scenario, state, "call-grace").state;
    for (const fact of scenario.facts) {
      state = (await askClient(scenario, state, fact.text, offlineEvaluator)).state;
    }
    state = endInterview(scenario, state).state;
    state = (await submitRequirements(scenario, state, "placeholder", offlineEvaluator)).state;
    state = (await submitBrief(scenario, state, "placeholder brief missing constraints", offlineEvaluator)).state;

    const viewBefore = projectView(scenario, state, []);
    assert.equal(viewBefore.scenario.artifactKind, item.kind);
    assert.equal(viewBefore.work?.files[0]?.kind, item.kind);
    if (item.kind === "table") {
      assert.ok((viewBefore.work?.files[0]?.columns?.length ?? 0) >= 2);
    }
    const guideText = guideFor(viewBefore).join(" ");
    assert.match(guideText, /entry by entry/i);
    assert.doesNotMatch(guideText, /pull request/i);
    assert.doesNotMatch(nextStep(viewBefore) ?? "", /pull request/i);

    const flawed = scenario.variants.find((v) => v.id === state.variables.variant)!;
    const target = flawed.problemLines[0];
    state = requestChanges(scenario, state, target).state;

    const viewAfter = projectView(scenario, state, []);
    const label = viewAfter.work?.reviews[0]?.label ?? "";
    assert.ok(label.includes(`${item.prefix}${target.line}`), `expected "${item.prefix}${target.line}" in "${label}"`);
  }
});

test("table artifact validation rejects mismatched pipe-delimited cell counts", async () => {
  const broken = structuredClone(wardGelAuditDraft);
  broken.artifact = {
    ...broken.artifact!,
    good: [
      "Only two cells | 12",
      ...broken.artifact!.good.slice(1),
    ],
  };
  const check = await checkProject(buildScenario(broken, { id: "gen-broken1234" }), broken, { requireConcepts: true });
  assert.ok(check.problems.some((p) => p.includes("cells, expected 4")));
});

test("live stakeholder viva unlocks at release, grades defense, and boosts trust when strong", async () => {
  const scenario = getProjectScenario("ward-gel-audit")!;
  let state = startProject(scenario);
  // Hidden before release.
  assert.equal(projectView(scenario, state, []).viva, null);

  state = chooseAction(scenario, state, "pick-product").state;
  // Take quote (-1 trust -> 4) so trust has headroom below 10 to verify the +1 viva reward.
  state = chooseAction(scenario, state, "send-quote").state;
  for (const fact of Object.values(wardGelAuditDraft.facts)) {
    state = (await askClient(scenario, state, fact.sampleQuestion, offlineEvaluator)).state;
  }
  state = endInterview(scenario, state).state;
  state = (await submitRequirements(scenario, state, wardGelAuditDraft.samples.requirements, offlineEvaluator)).state;
  state = (await submitBrief(scenario, state, wardGelAuditDraft.samples.brief, offlineEvaluator)).state;
  state = chooseAction(scenario, state, "approve").state;

  const atRelease = projectView(scenario, state, []);
  assert.equal(state.stageId, "release");
  assert.ok(atRelease.viva);
  assert.equal(atRelease.viva.response, null);

  const trustBefore = Number(state.variables.trust);
  const defended = await answerViva(
    scenario,
    state,
    "We divide cases by patient-day occupancy rather than raw counts, stratify surgical transfers separately, and submit for committee zero-revision check.",
    offlineEvaluator,
  );
  assert.equal(projectView(scenario, defended.state, []).viva?.response?.rating, "strong");
  assert.equal(Number(defended.state.variables.trust), trustBefore + 1);

  // Cannot answer viva twice.
  await assert.rejects(
    () => answerViva(scenario, defended.state, "Another answer", offlineEvaluator),
    /already answered/,
  );

  const finished = chooseAction(scenario, defended.state, "release-measure").state;
  const finalView = projectView(scenario, finished, []);
  assert.equal(finalView.viva?.response?.rating, "strong");
  assert.ok(finalView.completion?.trust.changes.some((t) => t.reason.includes("sign-off explanation")));
  const diligenceCard = finalView.completion?.cards.find((c) => c.competency === "diligence");
  assert.ok(diligenceCard?.evidence.some((line) => line.includes("sign-off defense")));
});

test("3-act mini-course builder produces slides and trap cards for every built-in course without leaking hidden facts", () => {
  for (const listing of projectListings) {
    const scenario = getProjectScenario(listing.id)!;
    const course = buildMiniCourse(scenario);
    assert.ok(course.slides.length >= 6, `${listing.id} slides`);
    assert.equal(course.gameCards.length, 5, `${listing.id} game cards`);
    assert.ok(course.gameCards.some((c) => c.verdict === "trap"));
    assert.ok(course.gameCards.some((c) => c.verdict === "sound"));

    const serialised = JSON.stringify(course);
    for (const fact of scenario.facts) {
      assert.ok(!serialised.includes(fact.reply), `${listing.id} mini-course must not leak scripted client reply`);
    }
  }
  assert.equal(inferDiscipline("clinical nursing statistics"), "Data & Healthcare");
  assert.equal(inferDiscipline("environmental chemistry"), "Natural Sciences");
  assert.equal(inferDiscipline("privacy law & media"), "Law & Media");
});

test("public community gallery migration exposes safe listing columns when shared and never exposes draft JSON", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`,
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
  ];
  for (const file of migrations) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }

  const author = "00000000-0000-4000-8000-000000000011";
  const peer = "00000000-0000-4000-8000-000000000012";
  await db.exec(
    `insert into auth.users values ('${author}','author@example.test',now()),('${peer}','peer@example.test',now());`,
  );
  await db.exec(
    `insert into public.generated_projects (id, owner_id, domain, subject, topic, title, tagline, summary, draft, template_version, model)
     values ('gen-gallerytest01', '${author}', 'accounting', 'Financial Accounting', 'revenue cut-off', 'Harbour Books Audit', 'Check year-end invoices', 'Audit accrual cut-off.', '{"secret":"hidden-facts"}'::jsonb, 1, 'gemini');`,
  );

  async function asRole(role: "anon" | "authenticated", uid: string | null, sql: string) {
    await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${uid ?? ""}',false);`);
    try {
      return await db.exec(sql);
    } finally {
      await db.exec("reset role");
    }
  }

  // Private by default: peer and anon see 0 rows.
  const privatePeer = await asRole("authenticated", peer, "select id, title from public.generated_projects");
  assert.equal(privatePeer[0].rows.length, 0);
  const privateAnon = await asRole("anon", null, "select id, title from public.generated_projects");
  assert.equal(privateAnon[0].rows.length, 0);

  // Non-owner cannot publish someone else's course.
  const hijack = await asRole("authenticated", peer, "update public.generated_projects set is_public = true where id = 'gen-gallerytest01'");
  assert.equal(hijack[0].affectedRows, 0);

  // Owner publishes to the Community Gallery.
  await asRole("authenticated", author, "update public.generated_projects set is_public = true where id = 'gen-gallerytest01'");

  // Now anon and peer can read safe listing columns.
  const sharedPeer = await asRole("authenticated", peer, "select id, title, subject, is_public from public.generated_projects");
  assert.equal(sharedPeer[0].rows.length, 1);
  const sharedAnon = await asRole("anon", null, "select id, title, subject, is_public from public.generated_projects");
  assert.equal(sharedAnon[0].rows.length, 1);

  // Even when public, `draft` (hidden facts & flaws) remains strictly unreadable!
  await assert.rejects(
    asRole("authenticated", peer, "select draft from public.generated_projects where id = 'gen-gallerytest01'"),
    /permission denied/,
  );
  await assert.rejects(
    asRole("anon", null, "select draft from public.generated_projects where id = 'gen-gallerytest01'"),
    /permission denied/,
  );
});

test("mini-course studio has zero dependency on browser Web Speech APIs", () => {
  const studioSource = readFileSync("src/components/projects/minicourse/MiniCourseStudio.tsx", "utf8");
  const modelSource = readFileSync("src/lib/projects/minicourse.ts", "utf8");
  for (const forbidden of ["speechSynthesis", "SpeechSynthesisUtterance", "SpeechRecognition", "webkitSpeechRecognition"]) {
    assert.equal(studioSource.includes(forbidden), false, `MiniCourseStudio must not use ${forbidden}`);
    assert.equal(modelSource.includes(forbidden), false, `minicourse.ts must not use ${forbidden}`);
  }
});

test("every built-in course is 100% playable end-to-end with zero typing using click-first cards while preserving trap consequences", async () => {
  for (const listing of projectListings) {
    const scenario = getProjectScenario(listing.id)!;
    const history: SimulationHistory = [];
    const take = (step: ProjectStep) => {
      history.push(...step.events);
      return step.state;
    };

    let state = startProject(scenario);
    state = take(chooseAction(scenario, state, "pick-product"));
    state = take(chooseAction(scenario, state, "call-grace"));

    // 1. Interview: 8 suggested clickable questions (6 real + 2 distractors).
    const initialSuggestions = projectView(scenario, state, history).interview.suggestedQuestions;
    assert.equal(initialSuggestions.length, 8, `${listing.id} should offer 6 real + 2 distractor questions`);
    let distractorCount = 0;
    for (const q of initialSuggestions) {
      const res = await askClient(scenario, state, q, offlineEvaluator);
      if (res.revealed.length === 0) distractorCount++;
      state = res.state;
      // Asked question is immediately filtered out of remaining suggestions.
      assert.equal(projectView(scenario, state, history).interview.suggestedQuestions.includes(q), false);
    }
    assert.equal(distractorCount, 2, `${listing.id} should include 2 distractor questions that reveal no fact`);
    assert.equal(memoOf(state).interview.revealed.length, 6, `${listing.id} clickable questions must uncover all 6 facts`);
    state = take(endInterview(scenario, state));

    // 2. Requirements: 4 paired decision slots, zero typing.
    const reqView = projectView(scenario, state, history);
    assert.ok(reqView.requirementsComposer && reqView.requirementsComposer.length === 4);
    const rigorousReqText = reqView.requirementsComposer
      .map((slot) => {
        // Pick the option that covers at least one scenario requirement item.
        const rigorous = slot.options.find((opt) => scenario.requirements.some((item) => itemCoveredBy(opt.text, item)));
        const trap = slot.options.find((opt) => scenario.requirements.every((item) => !itemCoveredBy(opt.text, item)));
        assert.ok(rigorous, `${listing.id} ${slot.id} must have a rigorous option`);
        assert.ok(trap, `${listing.id} ${slot.id} must have a genuine trap option`);
        return rigorous.text;
      })
      .join(" ");
    state = take(await submitRequirements(scenario, state, rigorousReqText, offlineEvaluator));
    assert.equal(state.variables.hasMetric, true, `${listing.id} rigorous requirements cards set hasMetric`);

    // 3. Brief: verify picking a trap card in slot 1 triggers the problem flaw, while all-rigorous yields good.
    const briefView = projectView(scenario, state, history);
    assert.ok(briefView.briefComposer && briefView.briefComposer.length >= 3);
    const slotChoices = briefView.briefComposer.map((slot) => {
      const rigorous = slot.options.find((opt) => scenario.brief.some((item) => itemCoveredBy(opt.text, item)));
      const trap = slot.options.find((opt) => scenario.brief.every((item) => !itemCoveredBy(opt.text, item)));
      assert.ok(rigorous, `${listing.id} ${slot.id} must have a rigorous directive`);
      assert.ok(trap, `${listing.id} ${slot.id} must have a trap directive`);
      return { rigorous: rigorous.text, trap: trap.text };
    });

    // Branch check: picking trap in slot-1 (missing C1) + rigorous in slots 2 & 3 produces the problem-flawed deliverable!
    const flawedBriefText = [slotChoices[0]!.trap, ...slotChoices.slice(1).map((s) => s.rigorous)].join(" ");
    let flawedState = (await submitBrief(scenario, state, flawedBriefText, offlineEvaluator)).state;
    assert.notEqual(flawedState.variables.variant, "good", `${listing.id} trap brief card must produce a flawed variant`);

    // 4. Review: catch the flaw using clickable diagnosis card from work.noteOptions!
    const reviewView = projectView(scenario, flawedState, history);
    assert.equal(reviewView.work?.noteOptions.length, 4, `${listing.id} should offer 4 clickable diagnosis notes`);
    const currentVariant = scenario.variants.find((v) => v.id === flawedState.variables.variant)!;
    // Try each note option on fresh copies to verify at least one clickable card earns "strong" concept grading.
    const strongFixed = await Promise.all(
      reviewView.work!.noteOptions.map((opt) =>
        sendBack(scenario, flawedState, { reasonId: currentVariant.problemReason, explanation: opt.text }, offlineEvaluator),
      ),
    );
    const bestFix = strongFixed.find((step) => projectView(scenario, step.state, history).work?.reviews[0]?.explained?.rating === "strong");
    assert.ok(bestFix, `${listing.id} must have a clickable diagnosis card earning strong teach-back rating`);
    flawedState = bestFix.state;
    assert.equal(flawedState.variables.variant, "good");

    // 5. Perfect brief + Viva clickable defense cards -> 10/10 success!
    state = take(await submitBrief(scenario, state, slotChoices.map((s) => s.rigorous).join(" "), offlineEvaluator));
    assert.equal(state.variables.variant, "good");
    state = take(chooseAction(scenario, state, "approve"));

    const releaseView = projectView(scenario, state, history);
    assert.equal(releaseView.viva?.options.length, 4, `${listing.id} should offer 4 clickable Viva response cards`);
    const vivaRatings = await Promise.all(
      releaseView.viva!.options.map(async (opt) => {
        const res = await answerViva(scenario, state, opt.text, offlineEvaluator);
        return { step: res, rating: projectView(scenario, res.state, history).viva?.response?.rating };
      }),
    );
    assert.ok(vivaRatings.some((r) => r.rating === "strong"), `${listing.id} Viva cards must include a strong defense`);
    assert.ok(vivaRatings.some((r) => r.rating === "weak"), `${listing.id} Viva cards must include a weak trap`);

    const strongViva = vivaRatings.find((r) => r.rating === "strong")!;
    state = strongViva.step.state;
    state = take(chooseAction(scenario, state, "release-measure"));
    assert.equal(state.outcome, "success");
    assert.equal(state.variables.trust, 10);
  }
});
