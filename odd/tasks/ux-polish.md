# UX polish — enroll double press, skeletons everywhere, design pass
Objective: fix the double press on "Inscribirme", replace every content spinner with a screen-shaped skeleton, then a design pass. Branch `feat/ux-polish`.
Delivery: ask-on-risk, one work-unit commit per area. Runners: Vitest (`apps/mobile`, focused files only — no full suite, RAM); `tsc --noEmit` once by the parent; Playwright E2E from the scratchpad.

## Specs
- S1 Enroll: "tuve que darle como 2 veces para inscribirme y recién me inscribí en un curso. Eso está fallando ahí." One press must enroll and the button must not come back while the progress reloads.
- S2 Slowness: "Las cosas están siendo muy lentas." Measured: ~320 ms per round trip from this machine to Supabase sa-east-1; a request pays ~3 extra round trips (pool pre-ping, BEGIN, COMMIT). Not a code defect; production (Vercel gru1) sits next to the DB. Decision pending with the user.
- S3 Skeletons: "falta tener skeletons de todo, porque no hay... O sea, sale un loading más, entonces como que todo tiene que tener un skeleton y un skeleton bien formado." Every screen-level `LoadingState` and every spinner that stands in for content is replaced by a skeleton that mirrors that screen's loaded layout, built from `src/core/ui/skeleton.tsx` (`Skeleton`, `Bone`, `BoneLines`, `BoneCard`, `BoneRow`). Spinners inside buttons (a pending press) stay.
- S4 Design: "falta poner diseño a ciertas cosas como que no están funcionando bien, y como que debería tener un mejor diseño, porque siento que no como que no llama la atención mucho el diseño." User (2026-11-21): "no son como pantallas en sí, sino como que componentes exactos. Por ejemplo, el componente de los o sea, del breakpoint como que no está bien. Siento que como que hay cosas que hay que cambiar, o sea, porque ciertos botoncitos o cosas así." Confirmed: "breakpoint" = the location trail ("ESTÁS EN Catálogo › …"). Buttons: pending a screenshot.

## Tasks
- T1 S1 — inline — done: RED (2 failing with old behaviour) → GREEN 3/3 `use-enrollment.test.ts`; focused enrollment+catalog vitest 58 green; E2E one press → progress, button never returns; commit 91876d9
- T2 S3 primitive — inline — done: `src/core/ui/skeleton.tsx`, tsc 0, eslint clean
- T3 S3 learner screens (catalog, course detail, landing, my courses, lesson, enroll panel) — delegated (W1) — done
- T4 S3 lab, certificates, recipes, billing — delegated (W2) — done
- T5 S3 instructor, admin, forum/community — delegated (W3) — done: T3–T5 tsc 0, eslint clean on src/features + core/ui, no `<LoadingState` left; E2E with held API requests shows skeletons on 13 screens at 1280 and 390 px, no page errors (recetario reads the device store and loads instantly)
- T6 S4 trail — inline — done: RED 5 → GREEN 56/56 auth vitest; lab/compare/result/recetario get real places under Mis cursos (section lit, no self-link); "Estás en" kicker removed (kept in the a11y label); one line with ellipsis, phone shows parent + current; hover on parent links; tsc 0, eslint clean; E2E 1280/390 px
- T7 S4 buttons — pending which buttons
- T8 S2 load optimisation — delegated (W4) — done: statements/sessions cut on POST /enrollments 16/11→10/8, GET /enrollments/me 8/6→6/4 (N+1 gone: 2 courses 13→6), /enrollments/me/{slug} 9/7→6/4, /catalog/courses/{slug} 4/2→2/1; live GETs byte-identical before/after; `test_query_budget.py` RED 4→GREEN 4; parent: plan gate moved into EnrollInCourse (Risk item 2) — read equivalent (same order: not found → plan → already enrolled) and pinned by 2 new unit tests in `test_enrollment_use_cases.py` (21 green); live E2E one press enrolls, POST 15 s→11.6 s locally

## Log
- L1 (2026-11-21) user: "Mira, tuve que darle como 2 veces para inscribirme y recién me inscribí en un curso. Eso está fallando ahí. Las cosas están siendo muy lentas. Además, como que falta tener skeletons. Falta tener skeletons de todo, porque no hay... O sea, sale un loading más, entonces como que todo tiene que tener un skeleton y un skeleton bien formado. También falta poner diseño a ciertas cosas como que no están funcionando bien, y como que debería tener un mejor diseño, porque siento que no como que no llama la atención mucho el diseño."
- L2 Repro S1: POST /enrollments 15 s, then the button reappeared for 9 s while GET /enrollments/me/<slug> refetched. Cause: mutation resolved before the progress refetch. Fix: await the progress invalidation; `already_enrolled` counts as success.
- L3 Route: T3–T5 are independent units with disjoint edit surfaces (feature folders), each 5–10 screens, launched together (Writer trigger a). Parent owns git, tsc and E2E.
- L4 Seam check: writers stayed inside their surfaces; one shared-code change, `TILE_GAP`/`TILE_MIN_WIDTH`/`MAX_COLUMNS` exported from admin `overview-panel.tsx` for the admin skeleton grid.
- L5 Follow-ups not done (outside W4 surface): billing `current_entitlements` reads the user a second time on POST /enrollments; every authenticated request spends a whole session reading the user.
