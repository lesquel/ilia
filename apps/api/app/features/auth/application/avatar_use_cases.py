"""Profile avatar operations and their storage ownership rules."""

import re
from dataclasses import dataclass
from datetime import timedelta
from uuid import uuid4

import httpx
import structlog

from app.features.auth.domain.entities import AVATAR_KEYS, User
from app.features.auth.domain.errors import (
    AvatarImageTooLargeError,
    InvalidAvatarImageError,
    InvalidAvatarKeyError,
    InvalidAvatarReferenceError,
)
from app.features.auth.domain.ports import UserRepository
from app.features.storage.application.avatar_images import MAX_AVATAR_BYTES, validate_avatar_image
from app.features.storage.domain.ports import ObjectStorage
from app.shared.errors import UnavailableError

logger = structlog.get_logger()
AVATAR_READ_TTL = timedelta(minutes=2)
AVATAR_UPLOAD_TTL = timedelta(minutes=5)
AVATAR_CONTENT_TYPES = ("image/jpeg", "image/png", "image/webp")
_AVATAR_REFERENCE = re.compile(r"^avatars/(?P<owner>[0-9a-f-]{36})/(?P<key>[0-9a-f]{32})$")


@dataclass(frozen=True)
class PreparedAvatarUpload:
    upload_url: str
    reference: str
    expires_in_seconds: int


def avatar_read_url(user: User, storage: ObjectStorage) -> str | None:
    """Return a private, short-lived photo URL or no URL for local storage."""
    if not user.avatar_ref or storage.provider == "local":
        return None
    return storage.read_url(user.avatar_ref, ttl=AVATAR_READ_TTL).url


class PrepareAvatarUpload:
    async def execute(
        self, *, user: User, storage: ObjectStorage, content_type: str
    ) -> PreparedAvatarUpload:
        if content_type not in AVATAR_CONTENT_TYPES:
            raise InvalidAvatarImageError()

        reference = f"avatars/{user.id}/{uuid4().hex}"
        try:
            signed = storage.write_url(
                reference,
                content_type=content_type,
                ttl=AVATAR_UPLOAD_TTL,
            )
        except (NotImplementedError, OSError) as exc:
            raise UnavailableError("Profile photo storage is not configured") from exc

        return PreparedAvatarUpload(
            upload_url=signed.url,
            reference=reference,
            expires_in_seconds=signed.expires_in_seconds,
        )


class AttachProfileAvatar:
    async def execute(
        self,
        *,
        user: User,
        users: UserRepository,
        storage: ObjectStorage,
        reference: str,
    ) -> User:
        match = _AVATAR_REFERENCE.fullmatch(reference)
        if match is None or match.group("owner") != str(user.id):
            raise InvalidAvatarReferenceError()

        try:
            data = await storage.read_bytes(reference, max_bytes=MAX_AVATAR_BYTES)
            validate_avatar_image(data)
        except ValueError as exc:
            await _discard_candidate(storage, reference)
            if str(exc) == "avatar_image_too_large":
                raise AvatarImageTooLargeError() from exc
            raise InvalidAvatarImageError() from exc
        except (NotImplementedError, httpx.HTTPError, OSError) as exc:
            await _discard_candidate(storage, reference)
            raise UnavailableError("The uploaded photo could not be verified") from exc

        previous = user.avatar_ref
        try:
            user.set_avatar_reference(reference)
            await users.update(user)
        except Exception:
            await _discard_candidate(storage, reference)
            raise

        if previous and previous != reference:
            await _delete_previous(storage, previous)
        return user


class SelectProfileAvatar:
    async def execute(
        self, *, user: User, users: UserRepository, storage: ObjectStorage, key: str
    ) -> User:
        if key not in AVATAR_KEYS:
            raise InvalidAvatarKeyError()
        previous = user.avatar_ref
        old_key = user.avatar_key
        user.choose_avatar(key)
        try:
            await users.update(user)
        except Exception:
            user.avatar_key = old_key
            user.avatar_ref = previous
            raise
        if previous:
            await _delete_previous(storage, previous)
        return user


class RemoveProfileAvatar:
    async def execute(
        self, *, user: User, users: UserRepository, storage: ObjectStorage
    ) -> User:
        old_key = user.avatar_key
        previous = user.clear_avatar()
        try:
            await users.update(user)
        except Exception:
            user.avatar_key = old_key
            user.avatar_ref = previous
            raise
        if previous:
            await _delete_previous(storage, previous)
        return user


async def _delete_previous(storage: ObjectStorage, reference: str) -> None:
    try:
        await storage.delete(reference)
    except Exception:
        logger.warning("avatar_object_delete_failed", reference=reference, exc_info=True)


async def _discard_candidate(storage: ObjectStorage, reference: str) -> None:
    try:
        await storage.delete(reference)
    except Exception:
        logger.warning("invalid_avatar_object_cleanup_failed", reference=reference, exc_info=True)
