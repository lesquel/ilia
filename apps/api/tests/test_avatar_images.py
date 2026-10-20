import pytest

from app.features.storage.application.avatar_images import (
    MAX_AVATAR_BYTES,
    validate_avatar_image,
)


@pytest.mark.parametrize(
    ("data", "content_type"),
    [
        (b"\xff\xd8\xff\xe0payload", "image/jpeg"),
        (b"\x89PNG\r\n\x1a\npayload", "image/png"),
        (b"RIFF\x00\x00\x00\x00WEBPpayload", "image/webp"),
    ],
)
def test_accepts_supported_image_signatures(data: bytes, content_type: str) -> None:
    assert validate_avatar_image(data) == content_type


@pytest.mark.parametrize("data", [b"", b"<svg></svg>", b"not really an image", b"GIF89a"])
def test_rejects_unsupported_or_unrecognized_content(data: bytes) -> None:
    with pytest.raises(ValueError, match="unsupported_avatar_image"):
        validate_avatar_image(data)


def test_accepts_image_at_the_size_limit() -> None:
    data = b"\x89PNG\r\n\x1a\n" + b"x" * (MAX_AVATAR_BYTES - 8)

    assert validate_avatar_image(data) == "image/png"


def test_rejects_image_over_the_size_limit() -> None:
    data = b"\x89PNG\r\n\x1a\n" + b"x" * (MAX_AVATAR_BYTES - 7)

    with pytest.raises(ValueError, match="avatar_image_too_large"):
        validate_avatar_image(data)
