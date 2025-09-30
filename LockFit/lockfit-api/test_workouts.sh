#!/usr/bin/env bash
# Test complet CRUD Workouts pour LockFit
# Prérequis : serveur Nest lancé sur http://localhost:3000 et jq installé

set -euo pipefail

BASE="http://localhost:3000/api/v1"

need() { command -v "$1" >/dev/null || { echo "⚠️  Installez '$1' (ex: sudo apt install -y $1)"; exit 1; }; }
need jq
need curl

line() { printf '\n%s\n' "------------------------------------------------------------"; }
ok()   { echo "✅ $*"; }
ko()   { echo "❌ $*" >&2; exit 1; }

line
echo "🩺  (0) Healthcheck"
curl -sS "$BASE/health" | jq .
ok "Health OK"

line
echo "🆕 (1) CREATE workout"
CREATE_BODY='{"title":"Push Day","note":"Chest","finishedAt":"2025-09-30T10:00:00Z"}'
CREATE_RESP=$(curl -sS -X POST "$BASE/workouts" -H "Content-Type: application/json" -d "$CREATE_BODY")
echo "$CREATE_RESP" | jq .
ID=$(echo "$CREATE_RESP" | jq -r '.id')
[ -n "$ID" ] || ko "Pas d'id retourné par le POST"
ok "Créé avec id=$ID"

line
echo "📜 (2) LIST workouts"
curl -sS "$BASE/workouts" | jq .
ok "Liste OK"

line
echo "🔎 (3) GET /workouts/:id"
curl -sS "$BASE/workouts/$ID" | jq .
ok "Détail OK"

line
echo "✏️  (4) PATCH /workouts/:id (mise à jour partielle)"
PATCH_BODY='{"note":"Chest + Shoulders","finishedAt":"2025-09-30T11:00:00Z"}'
curl -sS -X PATCH "$BASE/workouts/$ID" -H "Content-Type: application/json" -d "$PATCH_BODY" | jq .
ok "Mise à jour OK"

line
echo "🏁 (5) POST /workouts/:id/finish (marquer terminé maintenant)"
curl -sS -X POST "$BASE/workouts/$ID/finish" | jq .
ok "Finish OK"

line
echo "⏳ (6) LIST filtrée (from/to) — exemple dernières 24h"
FROM=$(date -u -d '1 day ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT00:00:00Z")
TO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
curl -sS "$BASE/workouts?from=$FROM&to=$TO" | jq .
ok "Filtre from/to OK"

line
echo "🗑️  (7) DELETE /workouts/:id"
curl -sS -X DELETE "$BASE/workouts/$ID" | jq .
ok "Suppression OK"

line
echo "🚫 (8) GET après suppression → on attend 404"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/workouts/$ID")
if [ "$CODE" = "404" ]; then
  ok "404 bien retourné après suppression"
else
  ko "Attendu 404, reçu $CODE"
fi

line
ok "Tests CRUD terminés avec succès 🎉"
