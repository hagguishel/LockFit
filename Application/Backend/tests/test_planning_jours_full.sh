#!/usr/bin/env bash
set -euo pipefail

# ==========================
# 🧪 TEST PLANNING COMPLET
# ==========================

API_BASE="http://localhost:3002/api/v1"

echo "ℹ️  API = $API_BASE"
echo

# helper pour jq inline
jqi() { jq -r "$1"; }

# http() -> pour récupérer juste le code HTTP
http() {
  curl -sS -o /dev/stderr -w "%{http_code}" "$@"
}

echo "🔎 Ping $API_BASE/plannings"
curl -sS -f -o /dev/null "$API_BASE/plannings" || {
  echo "❌ Impossible d’atteindre $API_BASE. Lance l’API."
  exit 1
}

echo
echo "➡️  1) Create workout (format accepté par l'API)"
WID=$(curl -sS -f -X POST "$API_BASE/workouts" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Pull Day Test",
    "items": []
  }' | jqi .id)
echo "   WID=$WID"

echo
echo "➡️  2) Create planning (2025-10-05 → 2025-10-10)"
PID=$(curl -sS -f -X POST "$API_BASE/plannings" \
  -H 'Content-Type: application/json' \
  -d '{
    "nom": "S41",
    "debut": "2025-10-05",
    "fin": "2025-10-10"
  }' | jqi .id)
echo "   PID=$PID"

echo
echo "➡️  3) Add a day 2025-10-06 (link planning + workout)"
JID=$(curl -sS -f -X POST "$API_BASE/plannings/$PID/jours" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-06\",
    \"workoutId\": \"$WID\"
  }" | jqi .id)
echo "   JID=$JID"

echo
echo "✅ Happy path checks"

echo "• PATCH (move day -> 2025-10-07)"
curl -sS -f -X PATCH "$API_BASE/plannings/$PID/jours/$JID" \
  -H 'Content-Type: application/json' \
  -d '{
    "date": "2025-10-07"
  }' | jq '.status,.date,.workoutId'

echo "• FINISH (mark done)"
curl -sS -f -X POST "$API_BASE/plannings/$PID/jours/$JID/finish" \
  | jq '.status,.doneAt'

echo "• DELETE (remove the day)"
CODE_DELETE=$(http -X DELETE "$API_BASE/plannings/$PID/jours/$JID")
echo "   delete returned HTTP $CODE_DELETE (expected 200 ou 204)"

echo
echo "🧪 Error paths"

echo "• add same day twice → attendu 409"
J1=$(curl -sS -f -X POST "$API_BASE/plannings/$PID/jours" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-08\",
    \"workoutId\": \"$WID\"
  }" | jqi .id)

CODE=$(http -X POST "$API_BASE/plannings/$PID/jours" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-08\",
    \"workoutId\": \"$WID\"
  }")
echo "   HTTP $CODE (should be 409)"
[[ "$CODE" == "409" ]] || { echo "❌ expected 409 on duplicate, got $CODE"; exit 1; }

echo
echo "• add out-of-range date → attendu 400"
CODE=$(http -X POST "$API_BASE/plannings/$PID/jours" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-15\",
    \"workoutId\": \"$WID\"
  }")
echo "   HTTP $CODE (should be 400)"
[[ "$CODE" == "400" ]] || { echo "❌ expected 400 out-of-range, got $CODE"; exit 1; }

echo
echo "• add with unknown workout → attendu 404"
CODE=$(http -X POST "$API_BASE/plannings/$PID/jours" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-09\",
    \"workoutId\": \"00000000-0000-0000-0000-000000000000\"
  }")
echo "   HTTP $CODE (should be 404)"
[[ "$CODE" == "404" ]] || { echo "❌ expected 404 unknown workout, got $CODE"; exit 1; }

echo
echo "• PATCH conflict (move second day on top of first) → attendu 409"
# crée un 2e workout propre
W2=$(curl -sS -f -X POST "$API_BASE/workouts" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Push Day Test",
    "items": []
  }' | jqi .id)

# crée un 2e jour dans le même planning
J2=$(curl -sS -f -X POST "$API_BASE/plannings/$PID/jours" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-09\",
    \"workoutId\": \"$W2\"
  }" | jqi .id)

# essaie de déplacer J2 sur une date déjà occupée par J1
CODE=$(http -X PATCH "$API_BASE/plannings/$PID/jours/$J2" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-08\",
    \"workoutId\": \"$WID\"
  }")
echo "   HTTP $CODE (should be 409)"
[[ "$CODE" == "409" ]] || { echo "❌ expected 409 on PATCH conflict, got $CODE"; exit 1; }

echo
echo "• PATCH out-of-range → attendu 400"
CODE=$(http -X PATCH "$API_BASE/plannings/$PID/jours/$J1" \
  -H 'Content-Type: application/json' \
  -d "{
    \"date\": \"2025-10-01\"
  }")
echo "   HTTP $CODE (should be 400)"
[[ "$CODE" == "400" ]] || { echo "❌ expected 400 on PATCH out-of-range, got $CODE"; exit 1; }

echo
echo "• PATCH invalid workoutId → attendu 400"
CODE=$(http -X PATCH "$API_BASE/plannings/$PID/jours/$J1" \
  -H 'Content-Type: application/json' \
  -d "{
    \"workoutId\": \"not-a-uuid\"
  }")
echo "   HTTP $CODE (should be 400)"
[[ "$CODE" == "400" ]] || { echo "❌ expected 400 invalid workoutId, got $CODE"; exit 1; }

echo
echo "• FINISH idempotent (call twice) → attendu 200 les deux fois"
curl -sS -f -X POST "$API_BASE/plannings/$PID/jours/$J1/finish" > /dev/null
CODE=$(http -X POST "$API_BASE/plannings/$PID/jours/$J1/finish")
echo "   HTTP $CODE (should be 200)"
[[ "$CODE" == "200" ]] || { echo "❌ expected 200 on second finish, got $CODE"; exit 1; }

echo
echo "• DELETE with wrong planningId → attendu 404"
P2=$(curl -sS -f -X POST "$API_BASE/plannings" \
  -H 'Content-Type: application/json' \
  -d '{
    "nom": "Other",
    "debut": "2025-10-01",
    "fin": "2025-10-31"
  }' | jqi .id)

CODE=$(http -X DELETE "$API_BASE/plannings/$P2/jours/$J1")
echo "   HTTP $CODE (should be 404)"
[[ "$CODE" == "404" ]] || { echo "❌ expected 404 delete wrong planningId, got $CODE"; exit 1; }

echo
echo "• DELETE twice → attendu 200/204 puis 404"
CODE1=$(http -X DELETE "$API_BASE/plannings/$PID/jours/$J1")
echo "   1st delete HTTP $CODE1 (should be 200 or 204)"
[[ "$CODE1" == "204" || "$CODE1" == "200" ]] || { echo "❌ expected 200/204 first delete, got $CODE1"; exit 1; }

CODE2=$(http -X DELETE "$API_BASE/plannings/$PID/jours/$J1")
echo "   2nd delete HTTP $CODE2 (should be 404)"
[[ "$CODE2" == "404" ]] || { echo "❌ expected 404 second delete, got $CODE2"; exit 1; }

echo
echo "✅ ALL CHECKS PASS"
