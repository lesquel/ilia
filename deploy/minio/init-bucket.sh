#!/bin/sh
# Create the private media bucket and CORS so a browser can PUT/GET with
# a URL the API signed. Retries until MinIO accepts the alias — compose
# healthchecks are not always enough on a cold start.
set -eu

endpoint="${MINIO_ENDPOINT:-http://minio:9000}"
access="${ILIA_STORAGE_ACCESS_KEY:?ILIA_STORAGE_ACCESS_KEY}"
secret="${ILIA_STORAGE_SECRET_KEY:?ILIA_STORAGE_SECRET_KEY}"
bucket="${ILIA_STORAGE_BUCKET:-ilia}"

i=0
until mc alias set local "$endpoint" "$access" "$secret" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 30 ]; then
    echo "MinIO never accepted credentials at $endpoint" >&2
    exit 1
  fi
  sleep 1
done

mc mb --ignore-existing "local/${bucket}"

# Private bucket: only signed URLs. Anonymous read would make lesson
# media guessable.
mc anonymous set none "local/${bucket}"

# The SPA origin (same host as the edge) issues cross-origin PUTs to the
# MinIO port. Without CORS the browser blocks the upload even when the
# signature is correct.
cat >/tmp/cors.json <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF
mc cors set "local/${bucket}" /tmp/cors.json

echo "MinIO bucket ready: ${bucket}"
