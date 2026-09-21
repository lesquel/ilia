# ILIA pending iteration plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between a working MVP slice and a first Manta teacher cohort that can enroll, learn, get a real EVAL, and leave with a defensible certificate.

**Architecture:** The product is already a vertical slice (auth → catalog → enroll → lesson → lab → cert → forum → instructor → admin). Remaining work is not greenfield. Sequence it so the first charla is credible: content + real LLM + cohort ops + hosting, then MVP leftovers, then polish.

**Tech stack:** FastAPI + PostgreSQL 17, Expo (web-first), EVAL graph in Python (not LangGraph), LLM via httpx adapters, S3 for media, docker compose for pilot.

**Spec:** `docs/PRD_PRAXIS_AI_v0.1.md`, `docs/TRD_PRAXIS_AI_v0.1.md`, `docs/curriculum/ruta-docentes.md`, `.cursor/skills/diseno-curso-ilia/SKILL.md`

## Global constraints

- Mesa is `docs/curriculum/`. Never invent destreza codes or Ineval figures.
- Lesson voice is sala de profesores; Lía does not speak in the lesson.
- Web session is cookie `httpOnly`; web client and API must share a registrable domain.
- LLM default is `local-stub` until `ILIA_LLM_PROVIDER` is set; stub scores must never be treated as real.
- Do not scale API replicas until the evaluation queue and rate limiter leave in-process memory (TRD §5.2).
- Production storage cannot be local; S3 (or equivalent) is required for media.

---

## Snapshot (what is already done)

Most of the README “Estado” table is true. Auth, catalog, enroll, progress, text lessons, lab pipeline, forum, cert codes + public verify, billing gates, instructor authoring/review/roster, and admin metrics/roles/audit all exist in `apps/api` and `apps/mobile`.

**Stale README claims to fix while iterating:**

- Cohort **join** already works (`POST /enrollments` + `cohort_code`). Missing piece is **create**.
- Lesson **video player** exists (`lesson-player.tsx` + `expo-video`). Missing piece is media + `kind=video`.
- Stack table still says LangGraph / Expo *(propuesta)*; code has already chosen.

**Content already authored:** three courses, 19 text lessons, 3 labs in `apps/api/app/content/teacher_catalog.py`; six video guiones in `docs/curriculum/ruta-docentes.md`. **Phase 1 (code) is on `main` as of 2026-09-21.** Catalog seed: `python -m scripts.seed_catalog`. LLM keys and host remain operator work.

---

## Phase 0 — Decisions that unblock everything else

These are stakeholder answers, not coding. Do them first or the rest will be rework.

| Decision | Why it blocks | Owner |
|---|---|---|
| Host + domain (same registrable domain for web + API) | Cookie auth, TLS, CORS | Ops + Alcaldía |
| LLM provider + model + budget | Without this, lab grades are simulated | Product + ops |
| What “certificación” means in Manta (Alcaldía / ULEAM / MINEDUC) | In-app copy and issuance criteria | Eduardo + Alcaldía |
| Freemium numbers for the pilot (quotas, paid path in or out) | Plans are already DB rows; numbers are policy | Product |
| Certificate bar (score threshold, proyecto final yes/no) | Issue criteria already exist; must match pedagogy | Pedagogy |
| Who records the 6 videos, and when | Route promises face-on-camera; text-only is an explicit fallback | Content |
| Password recovery in or out of first charla | PRD MVP; lockout risk is already in register copy | Product |

- [ ] Capture answers in a short `docs/` note (or PRD v0.2 section) before Phase 1 ships to a real cohort.

---

## Phase 1 — First charla is real (P0)

Ship this as one vertical: a teacher from a Manta charla can join a cohort, take prompting, submit a lab that is actually judged, and get a certificate code.

### Task 1: Production catalog seed

**Files:**
- Modify: `apps/api/scripts/seed_demo.py`
- Modify: `README.md`, `apps/api/README.md`, `docs/deploy.env.example`
- Optionally create: a dedicated `apps/api/scripts/seed_catalog.py` that loads `teacher_catalog.py` without demo passwords

- [x] Split “demo instructor/password” from “canonical courses”. Courses must be seedable in the target environment without pretending it is throwaway.
- [x] Document the exact command in deploy README. A fresh compose today has **no courses**.
- [x] Verify: empty DB → seed → `GET /catalog` returns the three slugs `prompting-para-docentes`, `notebooklm-en-el-aula`, `evaluacion-asistida-por-ia`.

### Task 2: Connect a real LLM and prove it

**Files:**
- Modify: `docs/deploy.env.example`, compose / deploy docs
- Existing adapters: `apps/api/app/features/evaluation/infrastructure/llm/registry.py`
- Client already shows model name: `apps/mobile/src/features/lab/presentation/result-screen.tsx`

- [x] Document allowed providers and `/health/ready` (not `local-stub`). Engine is `RunEvaluation`, not LangGraph.
- [ ] Set `ILIA_LLM_PROVIDER` + `ILIA_LLM_API_KEY` for the target env. Confirm `/health/ready` does **not** report `local-stub`.
- [ ] Run one prompting lab end to end in the browser. Confirm feedback is no longer the “this is simulated” copy.

### Task 3: Cohort create (API + admin or instructor UI)

**Files:**
- Create: cohort create use case + router (admin first; instructor if product wants it)
- Modify: `apps/api/app/features/enrollment/` (today `id_for_code` only)
- Modify: `apps/mobile/src/features/admin/presentation/admin-screen.tsx` (or instructor roster)
- Existing join: `apps/mobile/src/features/enrollment/presentation/enroll-panel.tsx`

- [x] Add create/list cohorts with a human-readable code (e.g. `MANTA-SEP-01`).
- [x] Surface it in admin (minimum) so a charla is not created only via seed.
- [x] Keep student join as optional `cohort_code` on enroll. Do not add cohort at register unless Phase 0 says so.
- [x] Fix stale README lines that still say “join is missing”.

### Task 4: Hosting for cookie auth

**Files:**
- Modify: `docs/deploy.env.example`, root `README.md`
- Existing: `apps/mobile/src/core/api/http-client.ts`, `token-store.web.ts`

- [x] Document cookie domain, CORS, `EXPO_PUBLIC_API_URL` (baked at build) and the web smoke check. **Host still unchosen.**
- [ ] Pick host + two hostnames on one registrable domain (e.g. `ilia.gob.ec` + `api.ilia.gob.ec`).
- [ ] Set cookie domain, CORS, `EXPO_PUBLIC_API_URL`, rebuild the web image (URL is baked at build).
- [ ] Smoke: register → login → `/me` on web without putting tokens in localStorage.

### Task 5: Curricular anchoring on prompting

**Files:**
- Modify: `apps/api/app/content/teacher_catalog.py`
- Modify: `docs/curriculum/mapa-escolar-ecuador.md` checklist
- Create: `docs/curriculum/fichas/` (or fill skill fichas) for the prompting course
- Mesa: `docs/curriculum/lengua-literatura.md` (LL.3.3.3), `docs/curriculum/metricas-aprendizaje.md` (682 / 61,9 %)
- Skills: `.cursor/skills/diseno-curso-ilia/SKILL.md`, `.cursor/skills/voz-profesor-ilia/SKILL.md`

- [x] Prompting lessons/folio: grado 7.º, destreza **LL.3.3.3** visible but not as title, Ineval **682 / 61,9 %** or explicit “sin cifra”, recovery **LL.3.3.4** where relevant.
- [x] Commit the prompting ficha (skill forbids shipping without it).
- [x] Voice pass on `:::ejemplo` titles: “Prompt” → “Pedido” on teacher-facing surfaces.
- [x] Tick the checklist in `mapa-escolar-ecuador.md` only after the bodies match.

### Task 6: Honest certificate for the first cohort

**Files:**
- Existing issue/verify: `apps/api/app/features/certificates/`
- Client: `apps/mobile/src/features/certificates/`

- [x] Align issue criteria with Phase 0 (threshold, no fake “oficial” wording).
- [x] If PDF is out of first-charla scope, keep code + public verify and say so in UI. Do not imply descarga.

---

## Phase 2 — MVP leftovers the PRD already promised (P1)

Do after a charla can run. Each task is independently shippable.

### Task 7: Password recovery

PRD E-01. Register copy already warns about lockout.

- [ ] Backend: request + token + reset (email provider is a Phase 0/ops choice; if no email yet, document an instructor-assisted reset as a stopgap and still persist tokens).
- [ ] Client: forgot-password screens from login/register.
- [ ] Existing comment to extend: `apps/api/app/features/auth/application/use_cases.py` (~line 148).

### Task 8: S3 (or equivalent) and lesson video path

Player exists; local `write_url` raises `NotImplementedError` (`apps/api/app/features/storage/infrastructure/local.py`).

- [ ] Configure production storage. Instructor media on web already presigns.
- [ ] Record or attach at least V1 of prompting (`ruta-docentes.md`). Set lesson `kind=video` in instructor panel.
- [ ] HyperFrames lámina: render MP4 from `.cursor/skills/diseno-curso-ilia/assets/lamina-hyperframes.md` and attach to one lesson.
- [ ] Native instructor upload can wait (web-only is documented in `lesson-media-control.tsx`).

### Task 9: EVAL calibration + regression suite

TRD §13 called this the most important test. It is not in CI.

- [ ] Freeze a small set of reference prompts + human grades for the prompting lab.
- [ ] Run them against the chosen provider. Do not certify teachers on stub scores.
- [ ] Add a CI job that fails if the stub is used in the “real eval” path, or that scores the gold set when secrets exist.

### Task 10: Submission idempotency

TRD §8. Prevents double entitlement on retry.

- [ ] Add idempotency key on `SubmitPromptRequest` and honor it in `RunEvaluation` / submit use case.

### Task 11: Client MVP parity (student)

- [ ] Show `instructorName` on course detail (`course-detail-screen.tsx`).
- [ ] Catalog category filter if the API already has category; otherwise cut from mockup until data exists.
- [ ] Resume hub: either a real dashboard or a clearer “continuar” on `/my-courses` (mockup #6).
- [ ] Global attempt history (mockup #12) — can start as a section on `/account` or `/my-courses`.
- [ ] Profile / ritmo: only if Phase 0 wants it for the pilot; otherwise keep `/account` as password + identity.

### Task 12: NotebookLM + Evaluación fichas

- [ ] One ficha per remaining course. Eval example (noveno ciencias) must name a CN destreza from `docs/curriculum/cn-cs-ecuador.md` or state “docente elige materia”.

---

## Phase 3 — Docs, quality, scale, later product (P2)

Do not start these if Phase 1 is still open.

### Task 13: PRD/TRD v0.2 and README honesty

- [ ] Mark resolved: FastAPI, Postgres, Expo, cookie session, cohorts (join done / create in Phase 1).
- [ ] Keep open: deploy topology, SEO, browser matrix, Mickey Serrano, teachers-per-charla.
- [ ] Rename or subtitle `PRD_PRAXIS_AI_*` / `TRD_PRAXIS_AI_*` to ILIA. Leave mockup HTML as historical unless someone is still demoing it.
- [ ] Drop LangGraph from the stack table until it is a dependency.

### Task 14: Certificate PDF (or keep the cut)

- [ ] If Phase 0 required PDF: generate + signed download. If not: close E-08 as “código + verificación pública”.

### Task 15: Hardening that only matters at more than one replica

- [ ] External evaluation queue + shared rate-limit store (TRD §5.2).
- [ ] Token revocation table (optional, documented in API README).
- [ ] Admin LLM cost alerts (A-03).
- [ ] CD pipeline (CI already builds images with `push: false`).

### Task 16: Native and chrome polish

- [ ] Barlow via `expo-font`.
- [ ] Expo icon/splash (still template).
- [ ] Bottom nav at mobile width (mockup `.mobnav`).
- [ ] Lesson side syllabus.
- [ ] Instructor media on iOS/Android.
- [ ] Web bundle split for instructor/admin (`apps/mobile/README.md` 1.2 MB note).
- [ ] E2E critical paths (TRD §13) — not in CI today.

### Task 17: Later curriculum (tomes are ready, courses are not)

- [ ] Do not write matemática / CN / CS courses until the prompting route has been taught once.
- [ ] When you do: mesa tomes already exist; new courses go through `diseno-curso-ilia` + fichas, then `teacher_catalog.py`.

---

## Recommended execution order

```text
Phase 0 answers
    → Task 1 seed
    → Task 2 LLM
    → Task 3 cohort create
    → Task 4 hosting/cookies
    → Task 5 prompting anchors + ficha
    → Task 6 certificate copy/criteria
        → first charla
            → Phase 2 (7–12) in any order except 8 depends on storage
            → Phase 3 when the cohort is running
```

**Do not do in parallel with Phase 1:** LangGraph, payment provider, native stores, SEO/SSR, extra subject courses, multi-replica queue.

---

## Out of first-charla scope (explicit cuts)

- Payment integration
- Email verification (unless recovery needs it)
- Admin global catalog CMS
- Quiz lesson type
- Forum-per-module (keep course-scoped)
- Instructor analytics beyond roster
- Dark theme
- Transcode worker
- Push notifications

---

## Verification for Phase 1

1. Fresh deploy: migrate → seed catalog → bootstrap-admin.
2. `/health/ready` shows real LLM name, not `local-stub`.
3. Admin creates cohort `MANTA-…`.
4. Teacher registers, enrolls with that code, finishes a prompting lesson, submits the lab, sees non-stub scores.
5. Certificate code verifies on `/verify/[code]` without login.
6. Prompting lesson/folio shows LL.3.3.3 and the Ineval figure (or “sin cifra”) per mesa.
