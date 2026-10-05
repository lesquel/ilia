# E2E UX polish

## Goal
Fix the non-blocking issues found during the 2026-10-05 Playwright E2E run (docente, estudiante, role boundaries).

## Scope
Branch `fix/e2e-ux-polish`. Frontend (`apps/mobile`) and, only if needed, backend (`apps/api`). No redesigns or new features beyond each item.

## TDD
Mode: off (no project/session configuration found). Ordinary checks: `npm run typecheck && npm run lint && npm test` in `apps/mobile`; `uv run ruff check . && uv run mypy app && uv run pytest -q` in `apps/api` when backend changes.

## Tasks
- [x] T1. `/my-courses` must not say "Terminaste la ruta" while a practice activity is still pending; align with the course page ("falta la práctica").
- [x] T2. Instructor course editor lists the activities already created for each lesson.
- [x] T3. Register shows a specific message when the API rejects the email (e.g. reserved `.local` domain, 422) instead of the generic "No pudimos crear tu cuenta".
- [ ] T4. Empty catalog with no search/filters shows an "no courses yet" message instead of "Prueba con otra búsqueda o quita los filtros".
- [ ] T5. Logging out from `/admin` must not fire an extra `GET /admin/overview` that returns 401.

## Route
Delegated direct (writer trigger: 2+ non-trivial files across T1–T5).

## Evidence
Full test suites were NOT run on purpose (the user's machine runs out of RAM). Checks per task are focused: `npx tsc --noEmit`, `npx eslint <changed files>`, `npx vitest run <changed test file>` (runner is vitest, not jest).

- T1: tsc clean, eslint clean, vitest catalog/domain/entities.test.ts 8 passed. Commit: 720cf4b. Root cause: My Courses used `progress.isComplete` (lessons only); now uses `isSyllabusFinished` (same rule as the course page) with the syllabus from `useCourse(slug)`.
- T2: tsc clean, eslint clean on course-editor-screen.tsx; no presentation tests exist for this screen, none added. Backend not changed: `/instructor/courses/{id}/detail` already returns `modules[].activities` and the client DTO mapper already parses them; the editor just never rendered them (activities belong to modules, not lessons, so they list per module). Commit: 4d8b329.
- T3: tsc clean, eslint clean, vitest auth/domain/entities.test.ts 9 passed. Root cause: the API's 422 is `schema_error` with FastAPI's `detail` list; the screen only mapped `validation_error`, so it fell to the generic message. New `isEmailFieldRejected(detail)` picks the email case. Commit: COMMIT_T3.

## Next step
Delegate T1–T5 to one writer, one commit per task.
