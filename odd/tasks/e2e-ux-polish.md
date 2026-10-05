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
- [x] T4. Empty catalog with no search/filters shows an "no courses yet" message instead of "Prueba con otra búsqueda o quita los filtros".
- [x] T5. Logging out from `/admin` must not fire an extra `GET /admin/overview` that returns 401.
- [x] T6. "Mis cursos" header ("Ya terminaste lo que tenías abierto") and `ContinueHero` must not treat a course with a pending practice as finished.

## Route
Delegated direct (writer trigger: 2+ non-trivial files across T1–T5).

## Evidence
Full test suites were NOT run on purpose (the user's machine runs out of RAM). Checks per task are focused: `npx tsc --noEmit`, `npx eslint <changed files>`, `npx vitest run <changed test file>` (runner is vitest, not jest).

- T1: tsc clean, eslint clean, vitest catalog/domain/entities.test.ts 8 passed. Commit: 00376a1. Root cause: My Courses used `progress.isComplete` (lessons only); now uses `isSyllabusFinished` (same rule as the course page) with the syllabus from `useCourse(slug)`.
- T2: tsc clean, eslint clean on course-editor-screen.tsx; no presentation tests exist for this screen, none added. Backend not changed: `/instructor/courses/{id}/detail` already returns `modules[].activities` and the client DTO mapper already parses them; the editor just never rendered them (activities belong to modules, not lessons, so they list per module). Commit: 6d572b9.
- T3: tsc clean, eslint clean, vitest auth/domain/entities.test.ts 9 passed. Root cause: the API's 422 is `schema_error` with FastAPI's `detail` list; the screen only mapped `validation_error`, so it fell to the generic message. New `isEmailFieldRejected(detail)` picks the email case. Commit: 737d4b8.
- T4: tsc clean, eslint clean, vitest catalog/domain/entities.test.ts 10 passed. Root cause: the empty state was a fixed string. New `emptyCatalogMessage(filters)` returns the neutral "Todavía no hay cursos publicados" when no query/level is active. Commit: b25a275.
- T5: tsc clean, eslint clean, vitest auth/application/session-cache.test.ts 1 passed. Root cause: `useLogout.onSettled` called `queryClient.invalidateQueries()`, which refetches every mounted query; the admin screen was still mounted, so `useOverview` fired once more with no session (401). Now `dropSessionData` removes non-auth cached queries instead (no refetch). Commit: 3caf8ce.
- T6: Root cause: `progress.isComplete` counts lessons only, and `ListMyCourses` never passed passed activities to `compute_progress`. Now `CourseProgress` has `pending_activity_ids`/`is_finished` (is_complete unchanged), `ProgressResponse` adds `pending_activity_count` and `is_finished` (defaults 0/False), and the client uses `isFinished` in the header, hero and `primaryCourseToContinue`. Checks: pytest test_enrollment_domain.py 12 passed, test_enrollment_use_cases.py 19 passed; ruff check/format and mypy clean on changed files; tsc clean, eslint clean on src/features/enrollment, vitest resume.test.ts 4 passed. Commit: 2cd955a.

## Next step
All tasks done on branch; not pushed. Review and open a PR.
