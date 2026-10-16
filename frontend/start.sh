#!/bin/sh
set -e

# Штатный entrypoint nginx генерирует конфиг из шаблона только при CMD "nginx",
# а запуск идёт через этот скрипт — подставляем переменные ($BACKEND_URL, $PORT) сами.
envsubst '${BACKEND_URL} ${PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Starting SSR server..."
node /app/.output/server/index.mjs &
PID=$!
echo "Nitro server started (PID: $PID)"

echo "Starting nginx..."
nginx -g "daemon off;"
