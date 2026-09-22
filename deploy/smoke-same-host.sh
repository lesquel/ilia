# Smoke: same-host edge + MinIO (no LLM key required)

Requires a filled `.env` from `docs/deploy.env.example` and
`docker compose up -d --build`.

```sh
set -eu
EDGE="${EXPO_PUBLIC_API_URL:-http://localhost:8080}"

echo "== ready =="
curl -fsS "$EDGE/health/ready" | tee /tmp/ilia-ready.json
grep -q '"storage":"s3"' /tmp/ilia-ready.json
# llm may still be local-stub until the key is pasted — that is expected.

echo "== register / login / me (cookie jar) =="
JAR=$(mktemp)
EMAIL="smoke-$(date +%s)@example.gob"
curl -fsS -c "$JAR" -b "$JAR" -H 'Content-Type: application/json' -H 'X-Client-Platform: web' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"SmokeTest1!\",\"full_name\":\"Smoke\"}" \
  "$EDGE/api/v1/auth/register" >/dev/null
curl -fsS -c "$JAR" -b "$JAR" -H 'Content-Type: application/json' -H 'X-Client-Platform: web' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"SmokeTest1!\"}" \
  "$EDGE/api/v1/auth/login" >/dev/null
curl -fsS -c "$JAR" -b "$JAR" -H 'X-Client-Platform: web' \
  "$EDGE/api/v1/auth/me" | grep -q "$EMAIL"

echo "OK: same-host cookies + storage=s3"
```
