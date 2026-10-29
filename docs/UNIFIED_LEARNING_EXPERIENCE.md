# Unified learning experience

Working branch: `feat/unified-learning-experience`

## Baseline

- Functionally complete restoration: `restore/general-learning-platform`
- Visual shell and catalogue polish selectively taken from: `merge/restored-course-platform`
- Historical reference for the restored platform: `82801c43d61d9324ab49eaa9f2ed50e265e59587`

## Information architecture

| Route | Responsibility |
| --- | --- |
| `/` | Product introduction and featured content |
| `/courses` | Full course discovery library |
| `/dashboard` | Student learning dashboard (My Learning) |
| `/my-courses` | Personal creations / AI learning paths |
| `/teach` | Teaching Studio |
| `/projects/[scenarioId]` | Immersive project execution (kept; not in primary nav) |

## Auth and roles

- First-time authenticated users choose learn or teach intentions on `/onboarding`.
- Verified users may call `public.activate_instructor()` (via `/api/me/activate-instructor` or onboarding) to gain instructor access on the same account.
- Direct client updates to `profiles.role` remain blocked.
- Onboarding never grants `admin`.

## Migration required

Apply:

`supabase/migrations/20261029120000_onboarding_and_instructor_activation.sql`

Existing profiles are backfilled so returning users are not forced through intention choice again.

## Auth notes

- Choosing **teach** only marks onboarding complete inside `activate_instructor()` after a successful role grant. A failed activation (for example unverified email) does not leave `onboarding_completed_at` set.
- Magic-link confirm verifies OTP then redirects through `/auth/callback` so first-time onboarding is checked the same way as OAuth.
- Deploy `supabase/templates/magic_link.html` in the Supabase Auth email settings so links open `/auth/confirm` with `token_hash` instead of consuming the token on open.
