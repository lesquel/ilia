# Profile Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let teachers edit their name, choose an illustrated avatar or upload a private profile photo, and show their current identity in account UI and course forums.

**Architecture:** Extend the existing auth user entity/repository and S3-compatible object storage port. Keep avatar references private and opaque; APIs issue short-lived read URLs only after authentication and forum access checks. Resolve current author profiles in forum responses and reuse one accessible avatar component in the React Native app.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, S3-compatible signed URLs, Expo SDK 57, React Native Web, Expo Image, Expo Image Picker, TanStack Query, pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-profile-personalization-design.md`

## Global Constraints

- Accept JPEG, PNG and WebP only; maximum upload size is 5 MiB; reject SVG and unrecognized content.
- Avatar keys are allowlisted; an avatar key and uploaded photo reference are mutually exclusive.
- Signed read URLs expire within 2 minutes and are issued only for the profile owner or after forum access checks.
- Current names and avatars apply to existing and new forum posts; email and certificate snapshots remain unchanged.
- Support web and native photo selection; avatar selection does not need photo library permission or configured object storage.
- Use existing theme tokens, visible focus, keyboard-accessible controls, accessible names/state, and touch targets of at least 44 × 44 CSS px.
- Do not expose private storage references or signed URLs in persistent client caches.

## Review Focus

- Wrong user or un-enrolled reader requesting another user's avatar: API rejects before minting a read URL; pin with route tests for owner, enrolled student, instructor/admin and outsider.
- Spoofed MIME or oversized upload: confirmation rejects bytes that are not an allowed image or exceed 5 MiB; pin with storage/application tests.
- Failed replacement/delete: keep the old profile reference until the new object is validated; pin with use-case tests.
- Renamed author on old thread/reply: response uses current name/avatar without exposing email; pin with forum response tests.
- Expired/unavailable image: client displays initials and supports keyboard/screen reader use; pin with profile/avatar component tests and manual web/native checks.

---

### Task 1: Add safe avatar storage operations

**Files:**
- Modify: `apps/api/app/features/storage/domain/ports.py`
- Modify: `apps/api/app/features/storage/infrastructure/s3.py`
- Modify: `apps/api/app/features/storage/infrastructure/local.py`
- Create: `apps/api/app/features/storage/application/avatar_images.py`
- Test: `apps/api/tests/features/storage/`

**Interfaces:**
- Produces `validate_avatar_image(data: bytes) -> str`, returning `image/jpeg`, `image/png`, or `image/webp`, and rejecting unsupported signatures or data over 5 MiB.
- Extends `ObjectStorage` with bounded object read/inspection and delete operations needed to confirm uploaded avatars and remove replaced files.

- [ ] Add tests for allowed JPEG/PNG/WebP signatures, invalid content, and the exact size limit; run and observe expected failures.
- [ ] Add tests for S3 signed GET/PUT/DELETE method construction and bounded object inspection; run and observe expected failures.
- [ ] Implement the validator and storage adapter operations; verify targeted storage tests and API lint/type checks.

### Task 2: Persist and serve account profile images

**Files:**
- Modify: `apps/api/app/features/auth/domain/entities.py`
- Modify: `apps/api/app/features/auth/domain/ports.py`
- Modify: `apps/api/app/features/auth/application/use_cases.py`
- Modify: `apps/api/app/features/auth/infrastructure/models.py`
- Modify: `apps/api/app/features/auth/infrastructure/sql_repository.py`
- Modify: `apps/api/app/features/auth/infrastructure/memory_repository.py`
- Modify: `apps/api/app/features/auth/interface/schemas.py`
- Modify: `apps/api/app/features/auth/interface/dependencies.py`
- Modify: `apps/api/app/features/auth/interface/router.py`
- Create: `apps/api/migrations/versions/a4f21b8c6d30_add_user_avatar.py` (down revision `3d9a6b1e7c20`)
- Test: `apps/api/tests/features/auth/`

**Interfaces:**
- User gains nullable `avatar_key` and `avatar_ref`; repository gains batch lookup by UUID for forum authors.
- `POST /auth/me/avatar-upload` prepares an owner-scoped upload and returns signed URL/reference; `POST /auth/me/avatar` validates and attaches the uploaded reference; `PUT /auth/me/avatar` selects an allowlisted illustration; `DELETE /auth/me/avatar` clears either choice.
- User responses expose `avatar_key` and short-lived `avatar_url`, never the storage reference.

- [ ] Add use-case and route tests for upload scope, confirmation validation, allowlisted selection, removal, owner read URL, old photo retained on failed replacement, and no raw reference in JSON; observe expected failures.
- [ ] Add nullable columns with reversible migration and implement user entity/repository changes plus batch lookup.
- [ ] Implement authenticated profile avatar routes and sign URLs for the current user; clear stale references only after a replacement validates, then delete the old object.
- [ ] Run auth/storage targeted tests, migration upgrade/downgrade checks, lint and type checks.

### Task 3: Return current author identities in the forum

**Files:**
- Modify: `apps/api/app/features/forum/interface/router.py`
- Modify: `apps/api/app/features/auth/domain/ports.py`
- Modify: `apps/api/app/features/auth/infrastructure/sql_repository.py`
- Modify: `apps/api/app/features/auth/infrastructure/memory_repository.py`
- Modify: `apps/api/app/features/forum/interface/dependencies.py` if needed for user/storage dependencies.
- Test: `apps/api/tests/features/forum/`

**Interfaces:**
- Thread and post response DTOs gain `author_avatar_key` and nullable `author_avatar_url`; user IDs remain server-side because no profile link is in scope.
- Forum list/detail handlers batch-load current authors and mint avatar read URLs only after existing enrollment/moderator access use cases succeed.

- [ ] Add tests for updated identity on old threads/replies, missing profile fallback, no email/reference exposure, and outsider denial before storage reads; observe expected failures.
- [ ] Implement batch lookup and response enrichment for forum list, detail, open-thread and reply responses.
- [ ] Run forum/auth targeted tests and API lint/type checks.

### Task 4: Build profile image and avatar selection UI

**Files:**
- Modify: `apps/mobile/package.json` and `apps/mobile/package-lock.json` (Expo-compatible `expo-image-picker` dependency)
- Modify: `apps/mobile/src/features/auth/domain/entities.ts`
- Modify: `apps/mobile/src/features/auth/domain/repository.ts`
- Modify: `apps/mobile/src/features/auth/data/auth-repository.ts`
- Modify: `apps/mobile/src/features/auth/application/use-auth.ts`
- Modify: `apps/mobile/src/features/auth/presentation/account-screen.tsx`
- Create: `apps/mobile/src/core/ui/profile-avatar.tsx`
- Create: `apps/mobile/src/features/auth/presentation/avatar-picker.tsx`
- Test: `apps/mobile/src/features/auth/` and `apps/mobile/src/core/ui/`

**Interfaces:**
- User gains nullable `avatarUrl` and `avatarKey`; profile repository methods prepare/confirm upload, choose illustration, and remove avatar.
- `ProfileAvatar` renders a photo, approved illustration, or existing initials fallback with stable dimensions and accessible naming.
- Account UI supports upload from browser file input and Expo Image Picker on native, plus a keyboard-operable illustrated avatar grid.

- [ ] Add domain/API mapper and avatar selector tests for key allowlist, selection state, initial fallback, failed loading, and owner-only profile mutation; observe expected failures.
- [ ] Install the Expo-compatible picker via `npx expo install expo-image-picker` and implement repository/query mutations with session cache refresh.
- [ ] Build shared `ProfileAvatar` and the accessible account editor, including replacing/removing, announcements, visible labels, errors/success and 44px controls.
- [ ] Run targeted mobile tests, `npm run typecheck`, lint, and a production web export.

### Task 5: Show current profiles in the app and verify end to end

**Files:**
- Modify: `apps/mobile/src/features/auth/presentation/account-bar.tsx`
- Modify: `apps/mobile/src/features/forum/domain/entities.ts`
- Modify: `apps/mobile/src/features/forum/data/forum-repository.ts`
- Modify: `apps/mobile/src/features/forum/presentation/forum-screen.tsx`
- Modify: `apps/mobile/src/features/forum/presentation/thread-screen.tsx`
- Test: `apps/mobile/src/features/forum/`

- [ ] Add tests for DTO mapping and rendering current names/avatars on thread rows, thread authors, and replies; observe expected failures.
- [ ] Replace initials-only account/forum identity rendering with shared `ProfileAvatar`; keep text names visible and use initials when URLs expire or images fail.
- [ ] Run the full API and mobile suites plus formatting/lint/type/build checks; perform web layout/accessibility checks at mobile and laptop widths and native picker smoke checks where a device runtime is available.
- [ ] Review the complete branch diff and update the plan checklist with verified evidence.
