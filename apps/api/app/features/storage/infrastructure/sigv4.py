"""Presigned URLs for S3-compatible storage, signed by hand.

**Why not boto3.** We use one algorithm out of an SDK that brings tens of
megabytes and a service model for two hundred APIs. What we need is query-string
SigV4 — a documented HMAC chain — and it is small enough to read in full, which
matters more than usual for the code that decides who may read a file.

**Why hand-rolled signing is defensible here.** A wrong signature fails loudly:
the storage answers 403 and nothing is served. There is no silent-wrong mode
where a bad signature grants access. The tests below check it against the
example published in the AWS documentation, so a drift is caught here rather
than by a teacher whose video will not play.

Everything speaking the S3 API is covered by one adapter: AWS S3, Cloudflare R2,
MinIO, DigitalOcean Spaces, Backblaze B2.
"""

import hashlib
import hmac
from datetime import datetime, timedelta
from urllib.parse import quote

ALGORITHM = "AWS4-HMAC-SHA256"
# Presigned URLs carry no body to hash, and the payload is not known at signing
# time anyway. This is the literal S3 expects in its place.
UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD"


def _quote(value: str, *, safe: str = "") -> str:
    """Percent-encode the way SigV4 requires.

    Note `safe=""` by default: a slash inside a key must be encoded in the query
    string and must NOT be in the path. Getting that backwards is the classic
    way to sign something the server then reads differently.
    """
    return quote(value, safe=safe)


def _sign(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def signing_key(secret: str, date: str, region: str, service: str) -> bytes:
    """The derived key. Scoped to one day, one region and one service, which is
    what limits the damage if a signature is ever replayed elsewhere."""
    key = _sign(f"AWS4{secret}".encode(), date)
    key = _sign(key, region)
    key = _sign(key, service)
    return _sign(key, "aws4_request")


def presign(
    *,
    method: str,
    host: str,
    path: str,
    region: str,
    access_key: str,
    secret_key: str,
    now: datetime,
    ttl: timedelta,
    service: str = "s3",
    signed_headers: dict[str, str] | None = None,
    scheme: str = "https",
) -> str:
    """A URL valid for `ttl`, and only for `method` on `path`."""
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    date = now.strftime("%Y%m%d")
    scope = f"{date}/{region}/{service}/aws4_request"

    canonical_headers = {"host": host.strip()}
    canonical_headers.update(
        {
            name.strip().lower(): " ".join(value.strip().split())
            for name, value in (signed_headers or {}).items()
        }
    )
    signed_header_names = ";".join(sorted(canonical_headers))
    canonical_header_block = "".join(
        f"{name}:{canonical_headers[name]}\n" for name in sorted(canonical_headers)
    )

    query = {
        "X-Amz-Algorithm": ALGORITHM,
        "X-Amz-Credential": f"{access_key}/{scope}",
        "X-Amz-Date": stamp,
        "X-Amz-Expires": str(int(ttl.total_seconds())),
        "X-Amz-SignedHeaders": signed_header_names,
    }

    # Sorted by key, then by value: the server rebuilds this string from the
    # request it received, and any difference in order is a different signature.
    canonical_query = "&".join(
        f"{_quote(key)}={_quote(value)}" for key, value in sorted(query.items())
    )

    canonical_path = "/" + _quote(path.lstrip("/"), safe="/")

    canonical_request = "\n".join(
        [
            method,
            canonical_path,
            canonical_query,
            canonical_header_block,
            signed_header_names,
            UNSIGNED_PAYLOAD,
        ]
    )

    string_to_sign = "\n".join(
        [
            ALGORITHM,
            stamp,
            scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )

    signature = hmac.new(
        signing_key(secret_key, date, region, service),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return f"{scheme}://{host}{canonical_path}?{canonical_query}&X-Amz-Signature={signature}"
