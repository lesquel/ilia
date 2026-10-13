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
- [ ] T2. Student screens: my courses, delivery history, certificates, forum list and thread, plans, verify, lab layout, forgot/reset password. Route: delegated.
- [ ] T3. Consistency fixes L1–L8. Route: delegated.

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

## Next step
T2.
