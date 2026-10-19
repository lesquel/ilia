# Legal pages (Terms and Privacy)

## Objective
Add Terms of Use and Privacy Policy screens to the mobile/web app, link them from login and register, and require acceptance at registration.

## Problem / why
The app has no legal text. A platform that stores personal data of teachers and students in Ecuador needs a privacy policy (LOPDP) and terms of use before a demo or launch.

## Scope
- New routes `/terms` and `/privacy` (Spanish copy, matching the existing UI language).
- Links from login and register screens.
- Required acceptance checkbox on register (client-side gate; no API change).

## Constraints
- Data controller name and contact email are unknown: use `[RESPONSABLE]` and `[EMAIL DE CONTACTO]` placeholders. The user chose placeholders.
- Do not claim certifications or legal facts that are not verified.
- Focused tests only (RAM limits on the dev machine).

## Tasks
- [x] T1 — Legal screens, routes, links, register checkbox, focused tests. Route: delegated (2+ non-trivial files).

## Acceptance criteria
- `/terms` and `/privacy` render, scroll, and are reachable without login.
- Register submit stays disabled until the checkbox is checked.
- Focused tests and typecheck pass.

## Progress
- Branch `feat/legal-pages` created from `main` (7c1952d).
- T1 implemented (delegated writer). Files:
  - new `apps/mobile/src/app/terms.tsx`, `apps/mobile/src/app/privacy.tsx` (public, no auth gate)
  - new `apps/mobile/src/features/legal/` — `index.ts`, `domain/legal-content.ts` (static Spanish copy, placeholders `[RESPONSABLE]` / `[EMAIL DE CONTACTO]`, last update 19 de octubre de 2026), `domain/consent.ts` (`consentGate`), `domain/legal-content.test.ts`, `presentation/legal-document-screen.tsx`, `presentation/legal-screens.tsx`
  - `apps/mobile/src/features/auth/presentation/login-screen.tsx` — Términos · Privacidad links
  - `apps/mobile/src/features/auth/presentation/register-screen.tsx` — required consent checkbox (role checkbox + accessibilityState), submit disabled until checked with an explanatory hint, Términos · Privacidad links
  - `_layout.tsx` unchanged: no public-route allow-list exists; guards are per-route wrappers.
- Test-first: vitest runs only pure `src/**/*.test.ts` in node (no component renderer), so the gate logic lives in `consentGate` and was tested there. RED observed (modules missing), then GREEN.
- Verification:
  - `npx vitest run src/features/legal/domain/legal-content.test.ts`: 7 passed
  - `npx tsc --noEmit`: exit 0
  - `npx eslint <touched files>`: no issues
  - Not run: visual/device check of the screens.

- Commit "feat(mobile): add terms and privacy pages with register consent". Review assess: high risk, review due; RDD disabled, so no native review ran.

## Next step
Visual check of /terms, /privacy and register on web and phone; fill [RESPONSABLE] and [EMAIL DE CONTACTO].
