#!/usr/bin/env sh
set -e

APP_JS="dist/principal.js"
if [ ! -f "$APP_JS" ]; then
  APP_JS="dist/main.js"
fi

echo "🚀 Starting NestJS on port $PORT with $APP_JS…"
node "$APP_JS"
