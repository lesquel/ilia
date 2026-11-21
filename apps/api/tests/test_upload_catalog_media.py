import asyncio
from pathlib import Path

import pytest

from app.core.config import Settings
from scripts import upload_catalog_media as mod


class FakeUploader:
    def __init__(self, existing: set[str] | None = None) -> None:
        self.objects: dict[str, str] = {k: "old" for k in existing or set()}
        self.puts: list[str] = []

    async def exists(self, key: str) -> bool:
        return key in self.objects

    async def put(self, key: str, path: Path, content_type: str) -> None:
        self.puts.append(key)
        self.objects[key] = content_type


def _media(tmp_path: Path, keys: list[str]) -> Path:
    for key in keys:
        target = tmp_path / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"x" * 10)
    return tmp_path


def _settings() -> Settings:
    return Settings(environment="local", storage_provider="local")


def test_catalog_keys_come_from_teacher_courses() -> None:
    keys = mod.catalog_keys()
    assert keys
    assert all(key.startswith("cursos/") and key.endswith(".mp4") for key in keys)


def test_dry_run_uploads_nothing_and_reports_missing(tmp_path) -> None:
    keys = mod.catalog_keys()
    root = _media(tmp_path, [keys[0], keys[0].replace(".mp4", ".vtt")])
    uploader = FakeUploader()

    plan = asyncio.run(mod.run(_settings(), apply=False, uploader=uploader, media_root=root))

    assert uploader.puts == []
    assert [i.key for i in plan.upload] == [keys[0], keys[0].replace(".mp4", ".vtt")]
    assert keys[1] in plan.missing


def test_apply_uploads_with_content_types_and_skips_present(tmp_path) -> None:
    keys = mod.catalog_keys()
    vtt = keys[0].replace(".mp4", ".vtt")
    root = _media(tmp_path, [keys[0], vtt, keys[1]])
    uploader = FakeUploader(existing={keys[1]})

    asyncio.run(mod.run(_settings(), apply=True, uploader=uploader, media_root=root))

    assert uploader.puts == [keys[0], vtt]
    assert uploader.objects[keys[0]] == "video/mp4"
    assert uploader.objects[vtt] == "text/vtt"

    uploader.puts.clear()
    asyncio.run(mod.run(_settings(), apply=True, uploader=uploader, media_root=root))
    assert uploader.puts == []


def test_local_adapter_refused_in_production() -> None:
    settings = Settings(
        environment="production",
        database_url="sqlite+aiosqlite:///x.db",
        jwt_secret="a-production-secret-that-is-long-enough-123",
        cookie_secure=True,
        storage_provider="local",
    )
    with pytest.raises(mod.UploadError, match="not configured"):
        asyncio.run(mod.run(settings, apply=False))
