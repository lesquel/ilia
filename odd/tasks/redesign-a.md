# Redesign A · "Aula clara"
Objective: apply design proposal A from the canvas (https://claude.ai/artifact/MddnUwnP3gNAc3D1mvZQFN#page-a) to the real app for students, instructors and admins. Branch `feat/redesign-a`.
Delivery: ask-on-risk, one work-unit commit per area. Runners: Vitest (`apps/mobile`, focused files only — no full suite, RAM); `tsc --noEmit` once by the parent; Playwright screenshots from the scratchpad.

## Specs
- S1 Foundation. Proposal A system: titles in Bricolage Grotesque 700–800, body stays the current sans; pill navigation (active section = dark pill `#111318` with white text); fixed color roles (primary `#0E58D6`, background `#F6F8FB`, surface `#FFFFFF`, ink `#111318`, soft ink `#4B5363`, line `#DCE2EB`, success `#1D6B3A`, warning `#9A5B00`); each course keeps its own color (`coverToneForCourseSlug`: wash/mid/ink) from cover to lesson; radius 20 for cards, 14 for buttons. On phones the sections move to a bottom tab bar.
- S2 Student home. Signed-in `/` becomes the student dashboard: "Hola, <nombre>. Te quedaste aquí." hero in the course's color with the next lesson, progress and "Continuar la lección"; "Tus cursos" cards with progress; side column with recent activity, last lab score, nearest certificate and a Lía line. Only real data; a block whose data the API does not give is left out, not invented.
- S3 Catalog and course. Catalog cards show progress and "Continuar" for enrolled courses, "Empezar" otherwise, plus an "En curso" filter. Course detail: a hero band in the course color, an overlapping progress card with "Continuar · lección N", the syllabus with done/current/next states in the course color, side cards (what you finish with, forum, certificate).
- S4 Lesson and lab. Lesson: top bar with step segments in the course color; on wide screens Lía speaks in a side panel next to the scene instead of a corner figure; primary buttons in the course color. Lab result: radial score, dimension bars, and "Qué cambió" highlighting what is new versus the previous attempt when there is one.
- S5 Instructor. Dashboard with KPI tiles, "Para corregir hoy" queue and drop-off by lesson (from existing roster insights); review screen in three columns (submission · Lía's proposal · your correction).
- S6 Admin. Overview with KPI tiles, users table, AI usage, in the same system.
- L1 user (2026-11-21): "SI ME GUSTA EL A HAZLO PORFA" — after choosing among the canvas proposals A/B/C.
- Assumption: no new backend endpoints in this feature; blocks that need data the API lacks (weekly streak, per-day activity) are skipped and listed as follow-ups.

## Tasks
- T1 S1 foundation — inline — done: RED→GREEN nav items/tab items/isImmersivePath/courseAccent; commit 8c5bf2c
- T2 S2 student home — delegated (W1) — done: 22 domain tests RED→GREEN; parent fix: phone hero chip clear of Lía
- T3 S3 catalog + course — delegated (W2) — done: catalog-progress + syllabus-rows tests RED→GREEN (51 green)
- T4 S4 lesson + lab — delegated (W3) — done: lesson-steps, prompt-diff, result-display tests RED→GREEN (87 green)
- T5 S5–S6 instructor + admin — delegated (W4) — done: instructor dashboard + admin domain tests RED→GREEN (61 green)
- T6 seam check — inline — done: tsc 0, eslint clean, 287 focused tests green, Playwright screenshots of home/catalog/course/lesson/lab (1440+390), instructor, review, admin; no page errors

## Log
- L1 (2026-11-21) user: "SI ME GUSTA EL A HAZLO PORFA"
- L2 Route: T1 first inline (every unit depends on its tokens, font and tone helper). T2–T5 are independent units with disjoint feature folders, each several screens, launched together (Writer trigger a). Parent owns git, installs, tsc and E2E.
- L3 Follow-ups (need backend data): weekly activity/streak (lesson completions have no timestamps); global lab submissions endpoint (home walks every activity); AI output and per-dimension scores in the instructor inbox; approve Lía's mark without override; admin plan/last-seen, per-day AI usage, provider-configured flag; catalog tool tags and total count.
- L4 Decisions to revisit: score bands 80/65 on the lab result vs scoreTone 70/40 elsewhere; "Intentar de nuevo" still only when not passed.
