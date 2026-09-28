# Bootstrap admin from environment

## Goal
Add an explicit, audited `make create-admin` flow that reads bootstrap administrator values from `.env`, creates the first admin safely, and supports inspecting the admin panel locally.

## Tasks
- [x] Add environment-backed bootstrap admin configuration and CLI provisioning.
- [x] Add Make target, tests, and local documentation.
- [x] Create the local demo admin and verify admin access.

## Evidence
- `make create-admin` created `admin@ilia.local` as the first administrator.
- `curl` login with the configured credentials succeeded.
- `GET http://localhost:8000/api/v1/admin/overview` returned an admin-only overview with `admins: 1`.
- `uv run ruff check app/core/config.py app/cli.py tests/integration/test_cli_bootstrap.py` passed.
- `uv run mypy app/cli.py app/core/config.py` passed.
- `git diff --check` passed.
- Integration tests remain skipped when `ILIA_TEST_DATABASE_URL` is not configured.

## Constraints
- No HTTP admin-provisioning endpoint was added.
- Repeated provisioning does not reset an existing password.
- Production provisioning is refused and first-admin/audit protections are preserved.
- Technical artifacts remain in English.
