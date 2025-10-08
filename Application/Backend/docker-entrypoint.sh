#!/usr/bin/env sh
set -e

echo "🔧 Prisma generate…"
npx prisma generate

echo "🗃️  Prisma migrate deploy…"
npx prisma migrate deploy

# Détecte automatiquement le fichier d'entrée (principal.js ou main.js)
APP_JS="dist/principal.js"
if [ ! -f "$APP_JS" ]; then
  APP_JS="dist/main.js"
fi

echo "🚀 Starting NestJS ($APP_JS)…"
node "$APP_JS"
