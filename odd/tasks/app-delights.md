# App delights — 4 features from the E2E sweep
Objective: compare lab attempts, certificate QR share card, "Mi recetario", compact phone header. Branch `feat/app-delights`.
Delivery: ask-on-risk, one work-unit commit per feature. Runners: Vitest (`apps/mobile`, focused files only — no full suite, RAM), pytest unused (no API change).

## Specs
- S1 Compare attempts: "Comparar intentos en el laboratorio: ver el intento 1 al lado del intento 2, con el pedido, la nota y qué cambió." Mobile-only, reuses `GET /lab/activities/{id}/submissions` + `GET /lab/submissions/{id}`. Entry from the attempt history when the student has 2+ attempts.
- S2 Certificate QR: "Certificado con QR: una tarjeta para compartir con un QR que lleve a `/verify/<código>`." Share via native Share API / Web Share, fallback copy link.
- S3 Mi recetario: "guardar tus mejores pedidos del laboratorio para usarlos en clase." Assumption: stored locally per user through `KeyValueStore` (no migration on the live Supabase DB); not synced across devices. Cleared on logout like other session-scoped data.
- S4 Compact header: "Encabezado compacto en celular" — on widths < `breakpoint.compact` the nav must not wrap into two lines and the account pill must not take its own row.

## Tasks
- T1 S1 — delegated — done: vitest lab 6 files green (RED first); E2E compare 2 attempts PASS; parent fix: deltas rounded (`formatScoreDelta`, RED→GREEN)
- T2 S2 — delegated — done: vitest certificates green; E2E QR rendered + copied `/verify/ILIA-DEMO-2026` (mocked /certificates/me); parent fix: guessed `https://ilia.app` replaced by `EXPO_PUBLIC_WEB_URL`, phone hides Compartir when unset
- T3 S3 — delegated — done: vitest recipes+storage 17 green; E2E save→list→reload PASS; parent fixes: lint set-state-in-effect in `useRecipes`, save waits for activity title
- T4 S4 — inline — done: header height at 360/390px 216/181 → 81px; 1280px unchanged 58px

## Log
- L1 (2026-11-21) user: "los 4" / "osea haz los 4" — after the proposal of: 1) comparar intentos, 2) certificado con QR, 3) "Mi recetario", 4) encabezado compacto en celular.
- L2 Route: T1–T3 are independent units with disjoint edit surfaces launched together (Writer trigger a); T4 inline.
- L3 Verification: focused vitest (lab, certificates, recipes, core, auth) green; `tsc --noEmit` 0 errors; eslint clean on touched paths; Playwright E2E 10/10 checks, no page errors.
- L4 Next: set `EXPO_PUBLIC_WEB_URL` to the public web domain; recetario is device-local (not synced) by design for now.
