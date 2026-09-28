# Admin tabbed layout

## Goal
Replace the monolithic admin dashboard with a coherent tabbed layout that separates overview, users, cohorts, certificates, LLM usage, and audit while preserving existing backend contracts and domain safety rules.

## Tasks
- [x] Map existing admin screen sections into independent tabs and reusable navigation.
- [x] Move certificate controls and LLM usage into their own tabs; preserve existing operations.
- [x] Add resilient loading, empty, error, and refresh states per tab.
- [x] Verify frontend behavior and document remaining CRUD phases.

## Delivered
- Tabs: Resumen, Usuarios y roles, Cohortes, Certificados, LLM y uso, Auditoría.
- Certificate revocation moved into its own tab while retaining the existing two-step safety flow.
- LLM usage moved out of the overview and now shows totals, cost configuration state, and top consumers.
- Users, cohorts, audit, usage, and overview have independent loading/error/empty/retry states where their existing APIs allow it.
- Existing backend contracts were preserved; no generic CRUD or secret exposure was added.

## Evidence
- `cd apps/mobile && npm test`: 22 files and 106 tests passed.
- Modified-area typecheck filter reported no errors in admin files.
- Full typecheck still reports 3 pre-existing Expo Router navigation errors outside this change.
- Full and focused lint remain blocked by the repository's existing ESLint JSON parse/configuration failure.
- `git diff --check` passed.

## Next phases
- Cohort update/archive with audit.
- Administrative course/content read-only view and safe publish actions.
- Safe read-only LLM configuration status, followed only by a separate secret-management decision.
- Global moderation and additional domain-specific admin operations.
