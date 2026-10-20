"""Validation helpers for user-supplied profile images."""

import warnings
from io import BytesIO

from PIL import Image, UnidentifiedImageError

MAX_AVATAR_BYTES = 5 * 1024 * 1024
MAX_AVATAR_DIMENSION = 4096
MAX_AVATAR_PIXELS = 16_777_216

_IMAGE_FORMATS = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}


def validate_avatar_image(data: bytes) -> str:
    """Decode an allowed raster image and reject corrupt or oversized images."""
    if len(data) > MAX_AVATAR_BYTES:
        raise ValueError("avatar_image_too_large")

    if data.startswith(b"\xff\xd8\xff"):
        content_type = "image/jpeg"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        content_type = "image/png"
    elif len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        content_type = "image/webp"
    else:
        raise ValueError("unsupported_avatar_image")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                if image.format != _IMAGE_FORMATS[content_type]:
                    raise ValueError("unsupported_avatar_image")
                if getattr(image, "n_frames", 1) != 1:
                    raise ValueError("unsupported_avatar_image")
                width, height = image.size
                if (
                    width <= 0
                    or height <= 0
                    or width > MAX_AVATAR_DIMENSION
                    or height > MAX_AVATAR_DIMENSION
                    or width * height > MAX_AVATAR_PIXELS
                ):
                    raise ValueError("avatar_image_dimensions_exceeded")
                image.verify()

            # `verify` checks the container; `load` forces the decoder to
            # validate compressed pixel data before the object is attached.
            with Image.open(BytesIO(data)) as image:
                image.load()
    except ValueError:
        raise
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        SyntaxError,
        UnidentifiedImageError,
    ) as exc:
        raise ValueError("unsupported_avatar_image") from exc

    return content_type
