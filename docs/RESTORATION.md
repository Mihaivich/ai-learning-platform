# General learning platform restoration

## Recovery baseline

- Branch: `restore/general-learning-platform`, based on upstream `main` at
  `35518d93ca297ba2667a7b0a628916e5f84e0350` (2026-10-27 inspection).
- Fork `main` at inspection: `8c0ecbea72cbd49b0a10b1723d3023c25ba89f65`.
- Recovery source: `82801c43d61d9324ab49eaa9f2ed50e265e59587`, before
  `0185d374cce07f81bb2b3a2df2d985f9028159ce` removed the course application.
- No main reset, blanket revert, cherry-pick, production deployment or live
  database operation is part of this restoration.

## Historical architecture audit

The historical snapshot and current main differ in 147 files. The deletion
removed roughly 18,000 lines of platform code and tests. Recovered files are
selected from that snapshot, with existing files reconciled separately:

| Area | Recovered implementation | Current code retained/adapted |
| --- | --- | --- |
| Course model | `src/lib/learning/{model,registry,repository,read,course-view}.ts` | One course model and one activity registry |
| Learner | Course/lesson/dashboard/onboarding/my-courses routes; learner store and progress logic | Desktop `useAuth` delegates to the same learner provider |
| Teaching | `/teach`, teaching components, Course Studio, invitations and student views | Existing Supabase role and ownership guards |
| AI builder | `generation.ts`, builder/tutor APIs, draft review and preference context | Current Gemini model chain, cooldowns, timeouts and secret redaction |
| Generic simulations | Editor, View, API, redaction and evaluation | Current engine/schema/conditions/http are byte-identical to the recovery snapshot and retained |
| Harbour Clinic | Existing immersive desktop and project runtime | Current client interview, evaluator, tracks, trust balancing, sounds and standalone routes |
| Tests | Deleted unit and Playwright platform tests | Current project, evaluator, quota and simulation tests retained |

The six existing migrations are unchanged between the historical snapshot and
upstream main. They already define courses, enrolments, invitations, attempts,
progress, learner preferences, quota functions and simulation sessions. Reuse
these tables; do not create a second course or simulation-session store.

Restored packages are the historical Markdown/GFM renderer, Tailwind typography
and Playwright, using the historical lockfile. Supabase package versions are
unchanged. Current server-side error redaction and service-key normalization
are preserved.

## Review locally

```bash
git fetch origin
git switch restore/general-learning-platform
npm ci
cp .env.example .env.local
npm run dev
```

Without credentials, browse the static catalogue, course lessons, local generic
simulations and Studio previews. Persistent authoring, project runs and the
gradebook require an isolated Supabase test project with the repository's
migrations. AI authoring/tutoring require a server-only `GEMINI_API_KEY`.
Never put the Gemini key or Supabase service key in a `NEXT_PUBLIC_` variable.

## Review commits

| Remote commit | Milestone |
| --- | --- |
| `a5886a872e167fb572c4136ec6f3d465769e84eb` | Recover the general platform and historical tests |
| `c6de8f2ed9fb43d6ad71648f5ebb0f365d5ca288` | Integrate immersive course activities, migrations and regression fixes |

The documentation commit follows these on the same branch. The GitHub connector
created the remote commits because terminal push authentication was unavailable;
the remote source trees were checked against local checkpoints `83f1357` and
`e080a22`, respectively. The full upstream ancestry remains intact. No force
update, main change, merge, PR or production deployment was performed.

## Recovered capabilities

- **Learning:** catalogue, course and lesson routes, dashboard, all historical
  activities, tutor context, saved attempts, lesson completion, local/remote
  progress reconciliation, profile and course-level preferences.
- **Teaching:** role-separated dashboard, course creation and editing, curriculum
  organization, preview, publication/unpublication/archive, settings, verified
  email invitations, enrolment management, student participation and submission
  views. This is the recovered authoring workspace, not a read-only replacement.
- **Student authoring:** `/my-courses` and private course Studio, including AI
  outline/lesson generation, revision proposals, review/accept/reject and preview.
- **AI:** `generateOutline`, `generateLesson`, `refineActivity`, `designSimulation`,
  schema checks, quotas and server-only calls. Recovered authoring functions use
  the current Gemini model chain; the builder has a 120-second server duration.
- **Generic simulations:** full declarative editor, generated proposal review,
  local preview, server validation/state transitions, persistence, concurrent-save
  conflict detection, public state projection, debrief and immutable attempts.
- **Subject neutrality:** the model and generation prompts accept any domain.
  The legacy metadata fallback is now `General`. English and business examples
  from the historical snapshot remain available alongside software courses.

The recovery snapshot contains earlier PR work, including Course Studio
(`764e843`), declarative simulation authoring (`1fba291`) and per-run simulation
evidence/projections (`b61a64b`). These implementations were recovered through
`82801c4`; their original commits are ancestors of the branch, not cherry-picked
or rewritten. `docs/GENERAL_LEARNING_PLATFORM.md` is recovered documentation.

## Harbour Clinic integration

`project` is a new entry in the existing Activity Registry, with a public
scenario selector in the editor and a specialized immersive renderer. It does
not replace the generic `simulation` activity.

The default AI Coding Agents course now includes a final Harbour Clinic lesson.
Any teacher can add the same activity to a saved course. Course launch URLs
carry course, lesson and activity IDs. The server verifies that those IDs refer
to an accessible project activity and that the selected scenario matches.
Sign-in retains this context and rejects external return URLs.

The existing desktop, runtime, AI evaluator, two tracks, sounds, window/draft
behavior, branching outcomes and report are retained. Both standalone and course
launches use the existing `project:<scenarioId>` session key. No existing run is
moved, rewritten or deleted, and no parallel engine is created.

On completion, `/api/activities` reads only the signed-in user's trusted project
session, checks scenario version and completion, and derives feedback through
the existing `projectView`. Browser-provided claims, scores, outcomes and text
cannot substitute for that evidence. A deterministic attempt UUID makes retries
idempotent per learner/run/course/lesson/activity. For a saved course, the four
AI Fluency cards become the existing gradebook's qualitative criteria, visible
in the teacher's student-submission page. Completion has no invented quiz score.

The desktop links back to the lesson and retries failed progress saves. The
lesson also recovers a completed run if the browser left before syncing. An
existing completed standalone run can satisfy a course activity. Preview opens
the teacher's own standalone practice session, with an explicit notice; it does
not create course gradebook records or a separate preview engine.

## Additive database changes

The six original migrations are unchanged. Two new migrations are required:

1. `20261027103619_protect_simulation_hidden_state.sql`: revoke browser-role
   SELECT on raw `simulation_sessions`, which contains hidden state. Existing
   project and generic simulation APIs already read through the server-only
   writer after authorization. All session data and RLS remain in place.
2. `20261027103817_restore_activity_registry_types.sql`: update the existing
   `private.course_document_ok` function to accept all nine registered activity
   types. The historical guard accepted only six and would reject Simulation,
   Code Review and Immersive Project. Also reject missing structural fields
   previously skipped by SQL NULL comparisons. No new course tables or duplicate
   models are introduced.

Both new migrations were applied twice to the isolated test database to check
repeatability. Tests save a course containing the three newly accepted activity
types and reject unknown types. Tests also prove that role escalation, foreign
course access, arbitrary enrolments, forged attempts and direct dynamic-progress
writes are denied, while instructors can read their students' evidence.

Course catalogue and accessible-course API payloads now redact simulation rules
before passing them to learner components. Existing formative course documents
and answer keys remain readable to authorized users through the Data API; this
restoration does not turn the platform into a secure examination system. Raw
runtime session state is no longer directly readable through that API.

**Compatibility:** external clients reading `simulation_sessions` directly must
switch to the authorized project/simulation APIs. This app's existing standalone
routes already use those APIs. Apply the new migrations to an isolated staging
database before reviewing persisted simulations; no migration was applied to a
hosted or production database during this work.

## Validation results

Final application checks, 2026-10-27:

| Command | Exact result |
| --- | --- |
| `npm ci --ignore-scripts` | Passed; 491 packages installed using the recovered lockfile |
| `npm run typecheck` | Exit 0; no TypeScript errors |
| `npm run lint` | Exit 0; no ESLint errors or warnings |
| `npm test` | 77 passed, 0 failed, 0 skipped; 3106.449604 ms on the final run |
| `npm run build` | Exit 0; compiled, type/lint checked, generated all 18 static pages and dynamic route manifests |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/tmp/devpath-chromium/chromium npm run test:e2e` | 16 passed, 0 failed; 10.8 seconds |
| `git diff --check` | Exit 0; no whitespace errors |

The Playwright CDN download returned a truncated archive in this environment.
The passing run used Chromium 153.0.8010.0 extracted from the temporary
`@sparticuz/chromium` 153.0.0 package; that package is not a project dependency.
PGlite executes the actual migration SQL and PostgreSQL RLS. Browser cloud APIs
are explicitly mocked for authoring/proposal and server-resume fixtures; real
unconfigured endpoints are exercised for rejection behavior.

Browser tests cover static learning, completion screen retention, simulation
resume and action-only requests, preview isolation, course editing and AI review,
preferences, both simulation editors, course-to-desktop return links, standalone
routes, invalid course contexts, unauthorized completion and teacher guards.
Project runtime tests exercise both tracks and branching outcomes; adapter tests
check real runtime completion evidence, stale versions, feedback and retry IDs.

The browser run exposed a historical completion-reset bug: registry validation
produced a new config object when the learner provider updated progress, causing
the local simulation effect to start over. SimulationView now stabilizes equal
configurations so the ending remains visible. The restored regression test
passes with the fix.

## Remaining verification and limitations

- **No isolated live Supabase or Gemini credentials were supplied.** Real OAuth
  and magic-link delivery, hosted PostgREST/schema cache behavior, live model
  generation/feedback, and a full signed-in teacher-to-student workflow require
  a staging smoke test. They are implemented and locally covered, not certified
  against a live deployment by this report.
- Docker, a local Supabase stack and a native PostgreSQL service were unavailable.
  Hosted database advisors and the old `test:postgres` superuser script were not
  run. Migration/authorization tests ran in PGlite instead. A CLI telemetry
  request was blocked by automatic review; no production access was needed.
- Teacher immersive preview uses the teacher's persisted standalone project run.
  It is not a separate disposable project sandbox. Generic simulation preview is
  local and does not write learner records.
- A completed standalone project may be credited in multiple assigned course
  activities. Separate mandatory runs per course were not introduced, to retain
  the current session identity and avoid competing stores.
- Existing historical limitations remain: sequential lesson generation, pasted
  references rather than file ingestion, formative assessment, and optimistic
  save conflicts rather than collaborative editing. See the recovered platform
  document for details.

## Staging review checklist

1. Check out the branch, run `npm ci`, configure `.env.local` for an isolated
   test instance, apply all eight migrations and run the checks above. For a new
   browser install, use `npx playwright install chromium`; the temporary path in
   the validation table is specific to this environment.
2. Create test instructor/student accounts. Assign the instructor role using a
   database administrator; the role is intentionally not self-service.
3. Visit `/teach/courses/new`. Create a mini-course in a non-software subject;
   edit/reorder lessons and activities, save, preview, publish, unpublish and
   archive. Check that another instructor cannot open or change it.
4. Generate an outline and lesson. Review/reject an output, edit a second and
   accept it. Generate a decision simulation; preview and edit its variables,
   stages/actions, gates/effects and completion rules before publishing.
5. Invite the student's confirmed email and claim the invitation from
   `/my-courses`. Check enrolment-only access, attempts, revision and progress.
6. Add an Immersive Project activity to a saved course. As the student, launch
   Harbour Clinic, finish either track, inspect the report, return to the lesson
   and complete it. Reload and retry recording the same run; confirm a single
   gradebook attempt. Open student results as the owning instructor and inspect
   the four qualitative criteria.
7. Resume a standalone project, restart it, test the other track and compare
   outcomes. Verify the course app still offers generic simulations and the
   original standalone project route still works.
