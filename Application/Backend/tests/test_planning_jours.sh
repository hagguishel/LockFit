#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-/api/v1}"               # passe "" si pas de préfixe
API="http://localhost:3000${BASE}"

echo "🔎 Ping $API/plannings"
curl -sS -f -o /dev/null "$API/plannings" || {
  echo "❌ Impossible d’atteindre $API. Lance l’API (npm run start:dev) ou ajuste le préfixe (ex: '')"
  exit 1
}

echo "➡️  1) Créer un workout"
WID=$(curl -sS -f -X POST "$API/workouts" -H 'Content-Type: application/json' \
  -d '{"title":"Séance Pull","note":"Dos/Biceps"}' | jq -r '.id')
echo "   Workout: $WID"

echo "➡️  2) Créer un planning (05→10 oct.)"
PID=$(curl -sS -f -X POST "$API/plannings" -H 'Content-Type: application/json' \
  -d '{"nom":"Semaine 41","debut":"2025-10-05","fin":"2025-10-10"}' | jq -r '.id')
echo "   Planning: $PID"

echo "➡️  3) Ajouter un jour (2025-10-06)"
JID=$(curl -sS -f -X POST "$API/plannings/$PID/jours" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-06\",\"workoutId\":\"$WID\"}" | jq -r '.id')
echo "   Jour: $JID"

echo "➡️  4) PATCH → déplacer au 07"
curl -sS -f -X PATCH "$API/plannings/$PID/jours/$JID" -H 'Content-Type: application/json' \
  -d '{"date":"2025-10-07"}' | jq '.status,.date,.workoutId'

echo "➡️  5) FINISH"
curl -sS -f -X POST "$API/plannings/$PID/jours/$JID/finish" | jq '.status,.doneAt'

echo "➡️  6) DELETE"
curl -sS -f -X DELETE "$API/plannings/$PID/jours/$JID" -o /dev/null -w "   HTTP %{http_code}\n"

echo "✅ Terminé."
