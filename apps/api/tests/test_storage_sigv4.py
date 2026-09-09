"""Presigned URLs, checked against AWS's own published example.

Signing is the part of storage that decides who may read a file, and it is
hand-rolled here rather than taken from an SDK. This file is the reason that is
defensible: if the implementation ever drifts, it fails here rather than at a
teacher whose video will not play.
"""

from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest

from app.features.storage.infrastructure.sigv4 import presign, signing_key

# The exact scenario from the AWS documentation's "Example: signature
# calculation for presigned URL" — same key, region, date and object.
AWS_EXAMPLE = {
    "access_key": "AKIAIOSFODNN7EXAMPLE",
    "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "region": "us-east-1",
    "host": "examplebucket.s3.amazonaws.com",
    "path": "/test.txt",
    "now": datetime(2013, 5, 24, 0, 0, 0, tzinfo=UTC),
    "ttl": timedelta(seconds=86400),
}
EXPECTED_SIGNATURE = "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"


class TestAgainstTheDocumentedExample:
    def test_the_derived_signing_key_matches(self) -> None:
        key = signing_key(AWS_EXAMPLE["secret_key"], "20130524", "us-east-1", "s3")

        # The documented intermediate value. Checked separately from the final
        # signature so a failure says which half is wrong.
        assert key.hex() == "dbb893acc010964918f1fd433add87c70e8b0db6be30c1fbeafefa5ec6ba8378"

    def test_the_signature_matches(self) -> None:
        url = presign(method="GET", service="s3", **AWS_EXAMPLE)
        signature = parse_qs(urlparse(url).query)["X-Amz-Signature"][0]

        assert signature == EXPECTED_SIGNATURE


class TestUrlShape:
    def make(self, **over: object) -> str:
        # `method` lives in the merged dict, not as a separate keyword: passing
        # it both ways is how the override silently stopped applying.
        return presign(**{"method": "GET", **AWS_EXAMPLE, **over})  # type: ignore[arg-type]

    def test_it_carries_everything_the_storage_needs_to_verify(self) -> None:
        params = parse_qs(urlparse(self.make()).query)

        assert params["X-Amz-Algorithm"] == ["AWS4-HMAC-SHA256"]
        assert params["X-Amz-SignedHeaders"] == ["host"]
        assert params["X-Amz-Expires"] == ["86400"]
        assert "X-Amz-Signature" in params

    def test_the_secret_never_appears_in_the_url(self) -> None:
        # The access key identifies which credential signed it and is meant to
        # travel. The secret is what makes the signature unforgeable.
        url = self.make()

        assert AWS_EXAMPLE["access_key"] in url
        assert AWS_EXAMPLE["secret_key"] not in url

    def test_a_different_method_is_a_different_signature(self) -> None:
        # Otherwise a read URL would also authorise a write, and anyone holding
        # a link to a video could replace it.
        read = parse_qs(urlparse(self.make(method="GET")).query)["X-Amz-Signature"]
        write = parse_qs(urlparse(self.make(method="PUT")).query)["X-Amz-Signature"]

        assert read != write

    def test_a_different_object_is_a_different_signature(self) -> None:
        # A signature that covered only the bucket would let one lesson's link
        # be edited into another's.
        first = parse_qs(urlparse(self.make(path="/uno.mp4")).query)["X-Amz-Signature"]
        second = parse_qs(urlparse(self.make(path="/dos.mp4")).query)["X-Amz-Signature"]

        assert first != second

    def test_a_key_with_slashes_keeps_them_in_the_path(self) -> None:
        # Encoding them would sign a different object than the one requested.
        url = self.make(path="/lecciones/2026/clase-1.mp4")

        assert urlparse(url).path == "/lecciones/2026/clase-1.mp4"

    @pytest.mark.parametrize("key", ["clase 1.mp4", "clase#uno.mp4", "clase?uno.mp4"])
    def test_awkward_characters_are_encoded_rather_than_breaking_the_url(self, key: str) -> None:
        url = self.make(path=f"/{key}")
        parsed = urlparse(url)

        # The query must still parse: an unencoded `?` or `#` in the key would
        # truncate the signature and every such upload would 403.
        assert "X-Amz-Signature" in parse_qs(parsed.query)
        assert " " not in parsed.path
