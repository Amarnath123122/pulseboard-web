#!/bin/sh
# Writes the runtime config from env vars before nginx starts. Empty URLs mean "same origin" (behind a gateway).
set -eu
cat > /usr/share/nginx/html/config.json <<JSON
{ "apiUrl": "${API_URL-}", "authUrl": "${AUTH_URL-}", "wsUrl": "${WS_URL-ws://localhost:8080/ws/events}" }
JSON
