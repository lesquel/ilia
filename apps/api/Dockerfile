# syntax=docker/dockerfile:1

# Two stages: one that installs, one that runs. The build stage carries the
# compilers `asyncpg` and `argon2-cffi` need to build wheels, and none of that
# belongs in an image that faces the internet.

FROM python:3.12-slim-bookworm AS builder

# `uv` is what the project locks with. Using pip here would resolve versions
# again and quietly ship something the lockfile never approved.
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# Dependencies first, in their own layer. Application code changes on every
# commit; the lockfile does not, so this layer survives most rebuilds.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project --no-dev

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev


FROM python:3.12-slim-bookworm AS runtime

# Not root. A container that is compromised should not also be a container that
# can rewrite its own filesystem.
RUN groupadd --system --gid 1001 ilia \
    && useradd --system --uid 1001 --gid ilia --create-home ilia

ENV PATH="/app/.venv/bin:$PATH" \
    # No .pyc writes at runtime: the bytecode is already compiled in the build
    # stage, and the filesystem is read-only in production anyway.
    PYTHONDONTWRITEBYTECODE=1 \
    # Unbuffered, or structured logs arrive in bursts and a crash loses the
    # lines that would have explained it.
    PYTHONUNBUFFERED=1

# Created and owned before anything is copied in: `COPY --chown` sets the
# ownership of what it copies, not of the directory it copies into.
RUN mkdir -p /app && chown ilia:ilia /app
WORKDIR /app

COPY --from=builder --chown=ilia:ilia /app /app

USER ilia

EXPOSE 8000

# Readiness, not liveness: an image whose database is unreachable is not ready
# to take traffic, and `docker compose` reads this to decide when dependants
# may start.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=4).status == 200 else 1)"

# One worker per container. Scaling is the orchestrator's job, and the
# in-process evaluation queue means a worker count above one would run the same
# recovery pass twice on boot.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
