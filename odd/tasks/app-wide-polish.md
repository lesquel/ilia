# App-wide polish and consistency fixes

## Goal
Every signed-in student screen reads as the same product as the screens already polished (catalog, course, account, instructor, admin), and the inconsistencies found while reviewing them are fixed.

## Problem
Reviewed at 1600px on 2026-10-13, signed in as a student:
- My courses, delivery history, certificates, forum, plans, certificate verification and the lab are unframed or grey-on-grey, with bare empty states and mixed button styles (blue and black primaries on one screen).
- Several things are wrong rather than plain; they are listed as L1–L8 below.

## Scope
Branch `feat/app-wide-polish`, stacked on `feat/admin-polish`. Frontend in `apps/mobile`, plus one backend query fix (L7).

Out of scope: the landing hero and the lesson reader layout (already designed), new features, copy rewrites of course content, dark-theme token changes, the voseo/tuteo mix in UI copy (reported, not changed).

## Constraints
- No behaviour changes beyond L1–L8. Every request, validation, gate and message stays as it is.
- Every figure shown comes from data already loaded.
- UI copy in Spanish in the existing voice; code, comments, commits in English.
- Focused tests only; never a full suite.

## Tasks
- [x] T1. Shared surface primitives in `core/ui` and upgraded empty/loading/error states. Route: delegated.
- [x] T2. Student screens: my courses, delivery history, certificates, forum list and thread, plans, verify, lab layout, forgot/reset password. Route: delegated.
- [x] T3. Consistency fixes L1–L8. Route: delegated.

## Consistency fixes
- L1. My courses shows the course in progress twice (hero and again as the first card below).
- L2. The header trail says "ILIA" on `/evaluations`, and shows a course as its slug ("Introduccion a la ia para docentes") instead of its title.
- L3. Plans lists levels alphabetically ("Básico, Experto, Intermedio") instead of in learning order, and the free plan prints "Gratis" as both name and price.
- L4. The landing heading says "Los tres cursos" whatever the number of courses listed (four today).
- L5. In the lab, the checklist panel overlaps the right edge of the prompt card.
- L6. The admin audit list renders 20 rows but its footer reports the full count.
- L7. The instructor roster counts a lesson as completed from a progress row without checking `completed_at`; insights requires it, so the two can disagree.
- L8. `register-screen.tsx` keeps its own `MAX_NAME = 120` instead of the shared `FULL_NAME_MAX_LENGTH`.

## Checks
- Mobile: `npx tsc --noEmit -p .`, `npx eslint <changed dirs>`, `npx vitest run <changed test files>`.
- API (L7): focused pytest on the instructor tests with `ILIA_TEST_DATABASE_URL`, `ruff check`, `mypy app/features/instructor`.

## Delivery
Forecast: about 1,200 authored lines. Feature-branch chain; one work-unit commit per task, and L-fixes committed in small groups by area.

## Evidence
- T1 (`e1bb51e`): `core/ui/surface.tsx` added (Card, SubCard, SectionHeading, ScreenHeader, Field, FieldLabel, Tag, Fact, Primary/Outline buttons and links); `EmptyState` framed with optional `glyph` and `action`, existing props unchanged; `ErrorState` keeps no frame (it replaces whole screens that leave no room around a border) and gains an icon and the shared outline retry. Observed: `npx tsc --noEmit -p .` clean; `npx eslint src/core/ui` no issues. Layout unobserved in a browser.

- T2 (`8b0fb1b` my courses, `5550128` delivery history, `ce24e67` certificates and verify, `da477c5` forum, `93e03f8` plans, `51a5a59` lab, `ce49cb9` forgot/reset password): every screen now uses the T1 primitives. Observed: `npx tsc --noEmit -p .` clean; `npx eslint` over core/ui, the changed features and `src/app` no issues. Layouts unobserved in a browser: the writer cannot see one.
  - The continue block gives the cover a width on wide screens (it had none beside the copy and collapsed).
  - Reset password gains the same show/hide toggle as sign-in and sign-up.
  - `ErrorState` is not framed; the result screen is untouched and the lab takes its 1080 frame.

- T3: RED then GREEN observed for every fix with pure logic or a query.
  - L1 (`8b0fb1b`): `enrolmentsBesides` in enrollment `domain/entities.ts`; RED `enrolmentsBesides is not a function` (3 tests), GREEN.
  - L2 (`56baa54`): `resolveAppLocation(path, { courseTitle })`, `/evaluations` branch, `courseSlugInPath`; RED 3 + 2 tests, GREEN 20/20. The bar reads `catalogKeys.detail(slug)` from the query cache and makes no request. Only `/catalog/{slug}` itself loads the course detail; the lesson and forum routes do not, so there the title appears when the course page was visited earlier in the session (cache kept about 5 minutes after leaving it) and the slug otherwise.
  - L3 (`93e03f8`): `levelsLabel` filters `LEVELS`; `priceLine` returns null when the name already is the price; RED 3 tests, GREEN.
  - L4 (`566e191`): `featuredCoursesHeading` in a new landing `domain/entities.ts`; RED (module missing), GREEN 3/3. The landing lists at most three, so with four published it now reads "Los tres primeros cursos".
  - L5 (`51a5a59`): negative margin removed, row with a gap; no pure logic, unobserved in a browser.
  - L6 (`933e0ab`): `auditFooter` and `AUDIT_VISIBLE_ROWS`; RED 3 tests, GREEN.
  - L7 (`472c8de`): RED `assert 1 == 0` on `lessons_completed` for a row with `completed_at` NULL; GREEN, `pytest -q tests/integration/test_instructor_api.py` 58 passed; `ruff check` on the repository file clean; `mypy app/features/instructor` no issues.
  - L8 (`089ad2b`): `register-screen.tsx` imports `FULL_NAME_MAX_LENGTH`.
  - Final run: `npx tsc --noEmit -p .` clean; `npx eslint` (core/ui, enrollment, lab, certificates, forum, landing, auth, admin, billing, app) no issues; `npx vitest run` on the five changed domain test files 53 passed.
  - Pre-existing, not touched: `ruff` E501 on `tests/integration/test_instructor_api.py:39` (the `TABLES` string).

## Left as found
- The roster's "last activity" still reads `completed_at` only, while insights also counts `last_viewed_at` and submissions.
- A revoked certificate is "Revocado" on the screens and "Anulado" in `STATUS_LABELS` (certificates domain), which no screen uses.
- `statusLabel` for a submission is defined twice in the lab feature (`evaluations-screen.tsx`, `attempt-history.tsx`).
- The quota bar on plans fills with what was used while its sentence states what is left.
- Instructor and admin still carry their private `ui.tsx`; the migration to `core/ui/surface.tsx` is a separate task.
- `ModerateControl` keeps its own small field and button.
- The landing's closing block names "Prompting para docentes" as the first course in fixed copy.

- L2 follow-up (parent, inline): the header trail now loads the course title itself through `useCourse(slug)` (same key and freshness as the course page), so a lesson or forum opened directly shows the real title. One request on a direct entry, none when arriving from the course page. Checks: eslint clean on `account-bar.tsx`, `tsc --noEmit` clean, `vitest run src/features/auth/domain/app-location.test.ts` 20 passed; observed in headless Chrome at 1600px on `/catalog/introduccion-a-la-ia-para-docentes/forum` opened cold: trail reads "Catálogo › Introducción a la IA para docentes › Foro".

## Next step
Look at the student screens in a browser at phone and desktop widths (nothing here was observed rendered), then decide on the pull request slices: the branch is past the 400-line budget.
