# Admin panel polish

## Goal
The admin panel reads as part of the same product as the polished catalog, course, account and instructor screens, and its overview says something at a glance.

## Problem
The overview is eight grey boxes with no grouping or context, and the other tabs are unframed lists and forms.

## Scope
Branch `feat/admin-polish`, stacked on `feat/instructor-insights`. Frontend only: `apps/mobile/src/features/admin`. Framing and presentation; every admin operation, request, validation and confirmation stays as it is.

Follow-ups approved by the product owner after review: T3 reaches into `apps/mobile/src/features/certificates/presentation/revoke-panel.tsx`; T4 adds a confirmation step to the role change (the request itself is unchanged).

Out of scope: new admin operations, new API fields, changes to roles or audit behaviour.

## Constraints
- Every figure comes from data the panel already loads. No invented numbers or series.
- Destructive and privileged actions keep their existing confirmations and wording.
- UI copy in Spanish, same voice as the existing panel. Code, comments and commits in English.
- Focused tests only; never a full suite.

## Tasks
- [x] T1. Overview: grouped stat cards with icons and one chart built from the overview figures. Route: delegated.
- [x] T2. Tabs and the remaining sections (users and roles, cohorts, certificates, LLM and usage, audit): cards, tags, consistent fields. Route: delegated.
- [x] T3. Certificates tab: restyle `RevokePanel` in the certificates feature to the admin field and button look, styled locally. Framing only; the revoke action is set apart by form (outline, warning icon, bordered sub-card), not by a danger hue. Route: delegated.
- [x] T4. Users tab: changing a role asks for an inline confirmation in the row before sending the request; one open at a time. Pure part in `domain/entities.ts`, test-first. Route: delegated.

## Checks
`npx tsc --noEmit -p .`, `npx eslint src/features/admin`, `npx vitest run src/features/admin` (three small test files).

## Delivery
Forecast: about 450 authored lines. Feature-branch chain, same as the instructor work.

## Evidence
- T1 — commit `0ffe090`. Route: delegated (writer). RED: `npx vitest run src/features/admin/domain` 5 failed / 4 passed (`certificationFunnel is not a function`); GREEN: 9 passed. `npx tsc --noEmit -p .`: no errors. `npx eslint src/features/admin`: no findings. `npx vitest run src/features/admin`: 3 files, 13 tests passed. Also surfaced figures the overview already loaded (admins, total users, total and archived courses). Layout not observed in a browser by the writer.
- T2 — commit `0584d38`. Route: delegated (writer). No RED/GREEN: presentation only, no harness for the screen and no new pure logic. `npx tsc --noEmit -p .`: exit 0. `npx eslint src/features/admin`: exit 0. `npx vitest run src/features/admin`: 3 files, 13 tests passed. Sections split into sibling files (`users-panel`, `cohort-panel`, `usage-panel`, `audit-panel`). Layout not observed in a browser by the writer.
- Pending, outside the edit surface: `apps/mobile/src/features/certificates/presentation/revoke-panel.tsx` (the certificates tab) is only wrapped in a card; its fields and its destructive button keep their old look. The branch is at about 1,360 changed lines against a 450 forecast, mostly the move of sections into their own files.
- T3 — commit `d486379`. Route: delegated (writer). No RED/GREEN: framing only, no new pure logic and no harness for the screen. `npx tsc --noEmit -p .`: exit 0. `npx eslint src/features/admin src/features/certificates`: exit 0. `npx vitest run src/features/certificates`: 1 file, 6 tests passed. Field and buttons are styled locally in the certificates feature (no import of the admin `ui.tsx`). The revoke step sits in its own bordered sub-card with a warning icon, restates "La anulación queda auditada y el certificado deja de validar." and uses an outlined button; no danger colour added. `RevokePanel` is rendered only by the admin certificates tab. This closes the pending note above. Layout not observed in a browser by the writer.
- T4 — commit `cc3671f`. Route: delegated (writer). RED: `npx vitest run src/features/admin/domain` 4 failed / 9 passed (`roleChangeQuestion is not a function`, `roleChangeNeedsConfirmation is not a function`); GREEN: `npx vitest run src/features/admin` 3 files, 17 tests passed. `npx tsc --noEmit -p .`: exit 0. `npx eslint src/features/admin src/features/certificates`: exit 0. `npx vitest run src/features/certificates`: 1 file, 6 tests passed. The role chips now open an inline question in the row ("¿Cambiar a Ana Pérez de Estudiante a Instructor?", Confirmar / Cancelar); the open question lives in `UsersPanel`, so only one exists, and paging or a new search drops it unsent. Confirmar sends the same `changeRole` request; the question closes when the request settles, and the existing error line stays in the row. The current role's chip stays disabled, as before. No client-side rule for own role or last admin existed or was added: those remain server refusals with their existing messages. `PrimaryButton` and `OutlineButton` gained an optional `accessibilityLabel`. The component wiring has no test harness; only the pure part is test-driven. Layout not observed in a browser by the writer.

## Next step
Look at `/admin` in the browser on both themes and at phone width: the certificates tab (revoke sub-card) and a role change with its confirmation in a narrow row. The branch is well past its 450-line forecast; decide the PR slicing before delivery.
