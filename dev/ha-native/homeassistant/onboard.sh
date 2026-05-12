#!/bin/sh
set -eu

base_url="http://homeassistant:8123"
client_id="http://localhost:8123/"
redirect_uri="http://localhost:8123/"

until status="$(curl --fail --silent --show-error "${base_url}/api/onboarding")"; do
  sleep 2
done

if printf "%s" "${status}" | grep -q '"step":"user","done":true'; then
  echo "Home Assistant dev onboarding already completed."
  exit 0
fi

response="$(
  curl --fail --silent --show-error \
    -H "content-type: application/json" \
    --data "{\"name\":\"Dev\",\"username\":\"dev\",\"password\":\"dev\",\"client_id\":\"${client_id}\",\"language\":\"en\"}" \
    "${base_url}/api/onboarding/users"
)"
auth_code="$(printf "%s" "${response}" | sed -n 's/.*"auth_code"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [ -z "${auth_code}" ]; then
  echo "Failed to read onboarding auth_code from response: ${response}" >&2
  exit 1
fi

token_response="$(
  curl --fail --silent --show-error \
    -H "content-type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=authorization_code" \
    --data-urlencode "code=${auth_code}" \
    --data-urlencode "client_id=${client_id}" \
    "${base_url}/auth/token"
)"
access_token="$(printf "%s" "${token_response}" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [ -z "${access_token}" ]; then
  echo "Failed to read access_token from response: ${token_response}" >&2
  exit 1
fi

curl --fail --silent --show-error \
  -X POST \
  -H "authorization: Bearer ${access_token}" \
  "${base_url}/api/onboarding/core_config" >/dev/null

curl --fail --silent --show-error \
  -X POST \
  -H "authorization: Bearer ${access_token}" \
  "${base_url}/api/onboarding/analytics" >/dev/null

curl --fail --silent --show-error \
  -X POST \
  -H "authorization: Bearer ${access_token}" \
  -H "content-type: application/json" \
  --data "{\"client_id\":\"${client_id}\",\"redirect_uri\":\"${redirect_uri}\"}" \
  "${base_url}/api/onboarding/integration" >/dev/null

echo "Home Assistant dev login ready: dev / dev"
