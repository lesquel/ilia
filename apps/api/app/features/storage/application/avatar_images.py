"""Validation helpers for user-supplied profile images."""

MAX_AVATAR_BYTES = 5 * 1024 * 1024


def validate_avatar_image(data: bytes) -> str:
    """Return the image MIME type when the bytes match an allowed format."""
    if len(data) > MAX_AVATAR_BYTES:
        raise ValueError("avatar_image_too_large")

    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"

    raise ValueError("unsupported_avatar_image")
