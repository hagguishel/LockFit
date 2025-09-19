#!/usr/bin/env bash
set -euo pipefail

say() { printf "• %s\n" "$*"; }
ok()  { printf "✅ %s\n" "$*"; }
err() { printf "❌ %s\n" "$*" >&2; }

ROOT="$(pwd)"
API_DIR="${ROOT}/lockfit-api"
APP_DIR="${ROOT}/lockfit-app"

echo "=== Installation des dépendances locales (sans global) ==="

# 0) Node/npm requis
if ! command -v node >/dev/null 2>&1; then err "Node.js introuvable"; exit 1; fi
if ! command -v npm  >/dev/null 2>&1; then err "npm introuvable"; exit 1; fi
ok "Node $(node -v) — npm $(npm -v)"

# 1) Backend
if [[ -d "$API_DIR" ]]; then
  say "Backend → $API_DIR"
  cd "$API_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  ok "Dépendances backend installées."
else
  err "Dossier lockfit-api introuvable."
fi

# 2) Frontend
if [[ -d "$APP_DIR" ]]; then
  say "Frontend → $APP_DIR"
  cd "$APP_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  ok "Dépendances frontend installées."
else
  err "Dossier lockfit-app introuvable."
fi

echo
ok "Terminé. Utilisation :"
echo "  - Démarrer le backend :  cd lockfit-api && npm run start:dev"
echo "  - Prisma (si besoin) :   cd lockfit-api && npx prisma generate"
echo "  - Démarrer l'app :       cd lockfit-app && npx expo start"
