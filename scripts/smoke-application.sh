#!/usr/bin/env bash
#
# Smoke-test a built JAR or native image over HTTP.
#
# API behavior lives in the integration tests. This checks what packaging can break:
# UI assets on the classpath, deep-link forwarding, and live SSE. Without the reflection
# hint, a native build can strip the stream message type, and a failed emitter write is
# easy to mistake for a client that went away.
#
# Usage: scripts/smoke-application.sh [base-url]
set -euo pipefail

base_url="${1:-http://127.0.0.1:8080}"
smoke_directory="$(mktemp -d)"
sse_pid=""

cleanup() {
  if [[ -n "${sse_pid}" ]] && kill -0 "${sse_pid}" 2>/dev/null; then
    kill "${sse_pid}" 2>/dev/null || true
    wait "${sse_pid}" 2>/dev/null || true
  fi
  rm -r -- "${smoke_directory}"
}
trap cleanup EXIT INT TERM

fail() {
  printf 'Smoke check failed: %s\n' "$1" >&2
  exit 1
}

json_field() {
  node -e '
    const fs = require("node:fs");
    const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const value = process.argv[2].split(".").reduce((node, key) => node[key], body);
    if (value === undefined || value === null) process.exit(2);
    process.stdout.write(String(value));
  ' "$1" "$2"
}

serves_spa() {
  local path="$1"
  local file="${smoke_directory}/page.html"
  local status
  status="$(curl --silent --show-error --output "${file}" --write-out '%{http_code}' "${base_url}${path}")"
  [[ "${status}" == "200" ]] || fail "${path} returned HTTP ${status}"
  grep -q '<div id="root"' "${file}" || fail "${path} did not serve the React entry point"
}

wait_for_stream_text() {
  local expression="$1"
  for _ in $(seq 1 100); do
    if grep -Eq "${expression}" "${smoke_directory}/stream.txt" 2>/dev/null; then
      return
    fi
    sleep 0.1
  done
  [[ -s "${smoke_directory}/stream.err" ]] && sed -n '1,80p' "${smoke_directory}/stream.err" >&2
  fail "SSE stream did not contain ${expression}"
}

for _ in $(seq 1 180); do
  curl --fail --silent "${base_url}/actuator/health" >"${smoke_directory}/health.json" && break
  sleep 1
done
grep -q '"status"[[:space:]]*:[[:space:]]*"UP"' "${smoke_directory}/health.json" \
  || fail "actuator health was not UP"

serves_spa /
asset_path="$(node -e '
  const fs = require("node:fs");
  const match = fs.readFileSync(process.argv[1], "utf8").match(/(?:src|href)="(\/assets\/[^"]+)"/);
  if (match) process.stdout.write(match[1]);
' "${smoke_directory}/page.html")"
[[ -n "${asset_path}" ]] || fail "the entry point referenced no Vite asset"
curl --fail --silent "${base_url}${asset_path}" >/dev/null || fail "Vite asset was not served"

curl --fail --silent --show-error \
  --header 'Content-Type: application/json' \
  --data '{"name":"Smoke"}' \
  --output "${smoke_directory}/inbox.json" \
  "${base_url}/api/inboxes" || fail "inbox creation failed"
inbox_id="$(json_field "${smoke_directory}/inbox.json" id)"
endpoint="$(json_field "${smoke_directory}/inbox.json" endpoint)"

serves_spa "/inboxes/${inbox_id}"

curl --silent --show-error --no-buffer --max-time 30 \
  --header 'Accept: text/event-stream' \
  "${base_url}/api/inboxes/${inbox_id}/stream" \
  >"${smoke_directory}/stream.txt" 2>"${smoke_directory}/stream.err" &
sse_pid=$!
wait_for_stream_text '^event:[[:space:]]*heartbeat'

curl --fail --silent --show-error \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{"smoke":true}' \
  --output "${smoke_directory}/receipt.json" \
  "${base_url}${endpoint}" || fail "capture failed"
event_id="$(json_field "${smoke_directory}/receipt.json" id)"

wait_for_stream_text '^event:[[:space:]]*webhook-captured'
wait_for_stream_text "^id:[[:space:]]*${event_id}"

serves_spa "/inboxes/${inbox_id}/events/${event_id}"

printf 'Application smoke checks passed at %s\n' "${base_url}"
