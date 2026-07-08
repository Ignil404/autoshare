#!/bin/sh
set -e
node /app/.output/server/index.mjs &
PID=$!
echo "Nitro server started (PID: $PID)"
nginx -g "daemon off;"
