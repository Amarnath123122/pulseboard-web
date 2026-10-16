#!/bin/sh
# Writes the runtime config from env vars before nginx starts.
set -eu
cat > /usr/share/nginx/html/config.json <<JSON
{ "apiUrl": "${API_URL:-http://localhost:8000}", "wsUrl": "${WS_URL:-ws://localhost:8000/ws/events}" }
JSON
