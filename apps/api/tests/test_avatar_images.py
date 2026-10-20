from io import BytesIO

import pytest
from PIL import Image

from app.features.storage.application.avatar_images import (
    MAX_AVATAR_BYTES,
    validate_avatar_image,
)


def encoded_image(image_format: str, size: tuple[int, int] = (1, 1)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, "white").save(output, format=image_format)
    return output.getvalue()


@pytest.mark.parametrize(
    ("data", "content_type"),
    [
        (encoded_image("JPEG"), "image/jpeg"),
        (encoded_image("PNG"), "image/png"),
        (encoded_image("WEBP"), "image/webp"),
    ],
)
def test_accepts_supported_image_signatures(data: bytes, content_type: str) -> None:
    assert validate_avatar_image(data) == content_type


@pytest.mark.parametrize("data", [b"", b"<svg></svg>", b"not really an image", b"GIF89a"])
def test_rejects_unsupported_or_unrecognized_content(data: bytes) -> None:
    with pytest.raises(ValueError, match="unsupported_avatar_image"):
        validate_avatar_image(data)


def test_rejects_a_file_that_only_has_a_supported_signature() -> None:
    with pytest.raises(ValueError, match="unsupported_avatar_image"):
        validate_avatar_image(b"\x89PNG\r\n\x1a\nnot a decoded PNG")


def test_accepts_image_at_the_size_limit() -> None:
    image = encoded_image("PNG")
    data = image + b"x" * (MAX_AVATAR_BYTES - len(image))

    assert validate_avatar_image(data) == "image/png"


def test_rejects_image_over_the_size_limit() -> None:
    image = encoded_image("PNG")
    data = image + b"x" * (MAX_AVATAR_BYTES + 1 - len(image))

    with pytest.raises(ValueError, match="avatar_image_too_large"):
        validate_avatar_image(data)


def test_rejects_images_with_excessive_dimensions() -> None:
    data = encoded_image("PNG", (4097, 1))

    with pytest.raises(ValueError, match="avatar_image_dimensions_exceeded"):
        validate_avatar_image(data)


def test_rejects_animated_images() -> None:
    output = BytesIO()
    frames = [Image.new("RGB", (1, 1), color) for color in ("red", "blue")]
    frames[0].save(output, format="WEBP", save_all=True, append_images=frames[1:])

    with pytest.raises(ValueError, match="unsupported_avatar_image"):
        validate_avatar_image(output.getvalue())
