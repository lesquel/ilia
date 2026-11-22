# Fewer DB round trips per request
Objective: one pooled session per HTTP request, a global "my lab submissions" endpoint for the home screen, and a configurable pool pre-ping. Branch `perf/request-session`.
Delivery: one work-unit commit per task. Runners: pytest (apps/api, focused files only — RAM), Vitest (apps/mobile, focused), tsc once.

## Specs
- S1 User: "si esta todas las consultas optimizadas?" → measured: cost is dominated by pooled sessions (each pays pre-ping + BEGIN + COMMIT, ~1.1 s locally); lesson 6 sessions/7.1 s, entitlements 4, mis cursos 4, lab 3, admin/instructor 2–3. User: "si haz todos" (all three proposals).
- S2 One session per request: every `Database.session()` block inside one HTTP request shares one AsyncSession owned by the request's task. Semantics kept: a block that writes commits when it ends (before the response); an exception rolls back that block; reads inside one request never see stale rows (populate_existing); other tasks (background evaluation, concurrent tasks) and code outside a request get their own session as today.
- S3 Global submissions: one endpoint returns the signed-in student's lab submissions across all activities, newest first, with what the home and evaluations screens need; the mobile app uses it instead of one request per activity.
- S4 Pre-ping: `pool_pre_ping` stays on by default (serverless functions freeze and pooled connections die); a setting lets local development turn it off.

## Tasks
- T1 S2 — inline — done: RED 8 → GREEN (6 unit tests in test_request_session.py, budget ceilings 1 session); all 45 API test files green (520 passed, 3 skipped); live: every endpoint 1 session, lección 7.1→2.6 s, mis cursos 5.3→2.6 s, entitlements 5.2→2.4 s, lab 4.2→2.4 s. Risk items 1 and 4 (commit timing, task ownership) → independent verifier
- T2 S3 — inline — done: GET /lab/submissions (one joined statement, newest first, activity + course names); API tests RED 3 → GREEN; evaluation tests 95 green; mobile `myHistory` test RED→GREEN, hook uses it, the per-activity walk is deleted; tsc 0; live 1 request 1.4 s
- T3 S4 — inline — done: `db_pool_pre_ping` setting (ILIA_DB_POOL_PRE_PING, default true), test RED→GREEN, README documents it and the request session

## Log
- L1 (2026-11-22) user: "si haz todos"
- L2 Measured before (in-process, live DB): auth/me 1q/1s, course detail 2q/1s, mis cursos 6q/4s, progreso 6q/4s, lección 7q/6s, certificados 2q/2s, entitlements 5q/4s, lab activity 5q/3s, lab intentos 2q/2s, lab resultado 5q/3s, admin overview 6q/2s, admin users 3q/3s, instructor courses 2q/2s, inbox 3q/3s.
- L3 Independent verifier on c246d08: no blockers; invariants 1,2,4,5 PASS. Advisories: `session.get` could return a held stale object (fixed: expunge_all after each outermost block, test RED→GREEN); nested blocks commit at the outermost end; a read keeps its pooled connection until the next write or request end (both documented in `request_scope`). The query-budget tests on the real app pin the middleware order (reversed order gives >1 session). All API test files green after the fix (524 passed, 3 skipped).
