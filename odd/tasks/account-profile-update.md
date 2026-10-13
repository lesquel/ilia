# Account profile update

## Goal
The "Tu cuenta" screen only changes the password. Let a signed-in person update their own name there, and give the screen the same card treatment as the rest of the polished screens.

## Problem
`/account` shows the name and email as plain text with no way to correct them. The API has no endpoint to update the profile (`/api/v1/auth` exposes register, login, refresh, logout, me, password-reset and password only).

## Scope
Branch `feat/account-profile-update`.

- Backend (`apps/api`, auth feature): `PATCH /api/v1/auth/me` accepting `full_name`, returning the updated `UserResponse`.
- Frontend (`apps/mobile`, auth feature): repository + hook + redesigned `account-screen.tsx`.

Out of scope: changing the email (needs verification of the new address; no mail provider yet), avatars, role changes, deleting the account.

## Constraints
- Same name rules as register (trimmed, non-empty, same max length).
- A person can only update their own profile; the endpoint reads the identity from the session.
- UI copy in Spanish, same voice as the existing auth screens. Code, comments and commits in English.
- Focused tests only. Never run a full suite: the user's machine runs out of RAM.

## Tasks
- [x] T0. Commit the UI polish already made in this session (catalog grid and cover, course detail, auth shell, enroll panel). Route: inline.
- [x] T1. Backend: `UpdateProfile` use case, repository support (SQL + memory), `PATCH /api/v1/auth/me`, tests. Route: delegated (writer trigger: 2+ non-trivial files).
- [ ] T2. Frontend: `updateProfile` in the auth repository, `useUpdateProfile` hook that refreshes the cached session user, and the redesigned account screen (profile card with editable name and read-only email, password card). Route: delegated (same writer).

## Acceptance
- `PATCH /api/v1/auth/me` with a valid name returns 200 and the new name; `GET /api/v1/auth/me` then returns it.
- Empty or over-long name is rejected with a 4xx and nothing changes.
- Without a session the endpoint returns 401.
- On `/account`, saving a new name updates the header account menu without a reload.
- The password form keeps working exactly as before.

## Checks
- API: `uv run pytest -q tests/test_auth_use_cases.py tests/test_auth_api.py`, `uv run ruff check <changed files>`, `uv run mypy <changed files>`.
- Mobile: `npx tsc --noEmit -p .`, `npx eslint <changed files>`, `npx vitest run <changed test file>`.

## Delivery
Forecast: about 350 authored lines. Strategy: ask-on-risk; single PR expected.

## Evidence
- T0: tsc clean, eslint clean on the six files; screenshots checked in headless Chrome at 1600px for catalog, course detail (signed out), login and register.
- T1: commit a3d1db9. RED: both test files failed at collection (`UpdateProfile`, `InvalidFullNameError`, `FULL_NAME_MAX_LENGTH` did not exist). GREEN: `pytest -q tests/test_auth_use_cases.py tests/test_auth_api.py` 57 passed; mypy clean on `app/features/auth`. `ruff check` and `ruff format --check` are clean on every changed file; both still report `infrastructure/models.py` (2 RUF012, one missing blank line), which fails the same way on the base commit and is outside this feature's edit surface. No port or repository change was needed: `UserRepository.update` already persists `full_name`. The name rule now lives in one domain helper shared by `User.register` and `User.rename`, and `FULL_NAME_MAX_LENGTH` feeds both request schemas. A blank name answers 422 `invalid_full_name`; an empty or over-long one answers 422 `schema_error`.

## Next step
T2.
