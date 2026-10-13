# Admin panel polish

## Goal
The admin panel reads as part of the same product as the polished catalog, course, account and instructor screens, and its overview says something at a glance.

## Problem
The overview is eight grey boxes with no grouping or context, and the other tabs are unframed lists and forms.

## Scope
Branch `feat/admin-polish`, stacked on `feat/instructor-insights`. Frontend only: `apps/mobile/src/features/admin`. Framing and presentation; every admin operation, request, validation and confirmation stays as it is.

Out of scope: new admin operations, new API fields, changes to roles or audit behaviour.

## Constraints
- Every figure comes from data the panel already loads. No invented numbers or series.
- Destructive and privileged actions keep their existing confirmations and wording.
- UI copy in Spanish, same voice as the existing panel. Code, comments and commits in English.
- Focused tests only; never a full suite.

## Tasks
- [x] T1. Overview: grouped stat cards with icons and one chart built from the overview figures. Route: delegated.
- [x] T2. Tabs and the remaining sections (users and roles, cohorts, certificates, LLM and usage, audit): cards, tags, consistent fields. Route: delegated.

## Checks
`npx tsc --noEmit -p .`, `npx eslint src/features/admin`, `npx vitest run src/features/admin` (three small test files).

## Delivery
Forecast: about 450 authored lines. Feature-branch chain, same as the instructor work.

## Evidence
- T1 — commit `0ffe090`. Route: delegated (writer). RED: `npx vitest run src/features/admin/domain` 5 failed / 4 passed (`certificationFunnel is not a function`); GREEN: 9 passed. `npx tsc --noEmit -p .`: no errors. `npx eslint src/features/admin`: no findings. `npx vitest run src/features/admin`: 3 files, 13 tests passed. Also surfaced figures the overview already loaded (admins, total users, total and archived courses). Layout not observed in a browser by the writer.
- T2 — commit `0584d38`. Route: delegated (writer). No RED/GREEN: presentation only, no harness for the screen and no new pure logic. `npx tsc --noEmit -p .`: exit 0. `npx eslint src/features/admin`: exit 0. `npx vitest run src/features/admin`: 3 files, 13 tests passed. Sections split into sibling files (`users-panel`, `cohort-panel`, `usage-panel`, `audit-panel`). Layout not observed in a browser by the writer.
- Pending, outside the edit surface: `apps/mobile/src/features/certificates/presentation/revoke-panel.tsx` (the certificates tab) is only wrapped in a card; its fields and its destructive button keep their old look. The branch is at about 1,360 changed lines against a 450 forecast, mostly the move of sections into their own files.

## Next step
Look at `/admin` in the browser on both themes and at phone width; decide whether to restyle the revoke panel inside the certificates feature.
