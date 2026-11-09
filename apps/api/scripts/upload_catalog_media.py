"""Upload the catalog's lesson media to the configured object storage.

Collects every resource key referenced by TEACHER_COURSES lessons (plus the
sibling `.vtt` of each) and maps `cursos/<x>` to `<repo>/media/cursos/<x>`.
Keys already in storage are skipped; keys with no local file are reported.
Dry run by default.

    set -a; source ../../.env.local; set +a
    uv run python -m scripts.upload_catalog_media
    uv run python -m scripts.upload_catalog_media --apply
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path
from typing import Protocol

import httpx

from app.content.teacher_catalog import TEACHER_COURSES
from app.core.config import Settings, get_settings
from app.features.storage.domain.ports import ObjectStorage
from app.features.storage.infrastructure.registry import StorageMisconfiguredError, build_storage

REPO_ROOT = Path(__file__).resolve().parents[3]
MEDIA_ROOT = REPO_ROOT / "media"
CONTENT_TYPES = {".mp4": "video/mp4", ".vtt": "text/vtt"}


class UploadError(Exception):
    """Something the operator must fix; the CLI exits non-zero."""


class MediaUploader(Protocol):
    async def exists(self, key: str) -> bool: ...

    async def put(self, key: str, path: Path, content_type: str) -> None: ...


class StorageUploader:
    """Uploads through the app's storage provider, via its presigned URLs."""

    def __init__(self, storage: ObjectStorage) -> None:
        self._storage = storage

    async def exists(self, key: str) -> bool:
        signed = self._storage.read_url(key, ttl=timedelta(minutes=5))
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
            response = await client.get(signed.url, headers={"Range": "bytes=0-0"})
        if response.status_code in (200, 206):
            return True
        if response.status_code in (403, 404):
            return False
        response.raise_for_status()
        return False

    async def put(self, key: str, path: Path, content_type: str) -> None:
        try:
            signed = self._storage.write_url(
                key, content_type=content_type, ttl=timedelta(minutes=30)
            )
        except NotImplementedError as exc:
            raise UploadError(
                "The configured storage cannot accept uploads. Set ILIA_STORAGE_PROVIDER=s3."
            ) from exc
        async with httpx.AsyncClient(timeout=600.0, follow_redirects=False) as client:
            response = await client.put(
                signed.url, content=path.read_bytes(), headers={"Content-Type": content_type}
            )
        response.raise_for_status()


@dataclass
class Item:
    key: str
    path: Path
    size: int
    content_type: str
    present: bool = False


@dataclass
class Plan:
    upload: list[Item] = field(default_factory=list)
    present: list[Item] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    missing_captions: list[str] = field(default_factory=list)


def catalog_keys() -> list[str]:
    keys: list[str] = []
    for course in TEACHER_COURSES:
        for _title, lessons in course["modules"]:
            for lesson in lessons:
                key = lesson[4] if len(lesson) > 4 else None
                if key and key not in keys:
                    keys.append(str(key))
    return keys


async def build_plan(uploader: MediaUploader, media_root: Path = MEDIA_ROOT) -> Plan:
    plan = Plan()
    for key in catalog_keys():
        candidates = [(key, True), (str(Path(key).with_suffix(".vtt")), False)]
        for candidate, required in candidates:
            path = media_root / candidate
            if not path.is_file():
                (plan.missing if required else plan.missing_captions).append(candidate)
                continue
            item = Item(
                key=candidate,
                path=path,
                size=path.stat().st_size,
                content_type=CONTENT_TYPES.get(path.suffix, "application/octet-stream"),
            )
            item.present = await uploader.exists(candidate)
            (plan.present if item.present else plan.upload).append(item)
    return plan


def format_plan(plan: Plan, *, apply: bool) -> str:
    mb = lambda n: f"{n / 1_000_000:.1f} MB"  # noqa: E731
    lines = [f"Catalog media ({'APPLY' if apply else 'DRY RUN'})", ""]
    lines.append(f"To upload ({len(plan.upload)}):")
    lines += [f"  ^ {i.key}  {mb(i.size)}  {i.content_type}" for i in plan.upload]
    lines.append(f"Already in storage ({len(plan.present)}):")
    lines += [f"  = {i.key}  {mb(i.size)}" for i in plan.present]
    lines.append(f"Local video missing, skipped ({len(plan.missing)}):")
    lines += [f"  ! {key}" for key in plan.missing]
    lines.append(f"Local caption missing, skipped ({len(plan.missing_captions)}):")
    lines += [f"  - {key}" for key in plan.missing_captions]
    total = sum(i.size for i in plan.upload)
    lines += [
        "",
        f"Summary: {len(plan.upload)} to upload ({mb(total)}), {len(plan.present)} present, "
        f"{len(plan.missing)} videos missing locally.",
    ]
    if not apply:
        lines.append("Dry run: nothing was uploaded. Re-run with --apply.")
    return "\n".join(lines)


async def run(
    settings: Settings,
    *,
    apply: bool,
    uploader: MediaUploader | None = None,
    media_root: Path = MEDIA_ROOT,
) -> Plan:
    if uploader is None:
        try:
            uploader = StorageUploader(build_storage(settings))
        except StorageMisconfiguredError as exc:
            raise UploadError(f"Storage is not configured: {exc}") from exc
    plan = await build_plan(uploader, media_root)
    print(format_plan(plan, apply=apply))
    if apply:
        for item in plan.upload:
            print(f"Uploading {item.key} ...", flush=True)
            await uploader.put(item.key, item.path, item.content_type)
        print(f"Done: {len(plan.upload)} files uploaded.")
    return plan


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--apply", action="store_true", help="upload (default: dry run)")
    args = parser.parse_args()
    try:
        asyncio.run(run(get_settings(), apply=args.apply))
    except UploadError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    except httpx.HTTPError as exc:
        print(f"ERROR: storage request failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
