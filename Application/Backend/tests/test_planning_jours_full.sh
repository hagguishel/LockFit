# tests/test_planning_jours_full.sh
#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-/api/v1}"   # passe "" si pas de prefix
API="http://localhost:3000${BASE}"

echo "🔎 Ping $API/plannings"
curl -sS -f -o /dev/null "$API/plannings"

jqi() { jq -r "$1"; }
http() { curl -sS -o /dev/stderr -w "%{http_code}" "$@"; } # body -> stderr, code -> stdout

echo "➡️  1) Create workout"
WID=$(curl -sS -f -X POST "$API/workouts" -H 'Content-Type: application/json' \
  -d '{"title":"Pull","note":"Dos"}' | jqi .id)
echo "   WID=$WID"

echo "➡️  2) Create planning (2025-10-05 → 2025-10-10)"
PID=$(curl -sS -f -X POST "$API/plannings" -H 'Content-Type: application/json' \
  -d '{"nom":"S41","debut":"2025-10-05","fin":"2025-10-10"}' | jqi .id)
echo "   PID=$PID"

echo "➡️  3) Add a day 2025-10-06"
JID=$(curl -sS -f -X POST "$API/plannings/$PID/jours" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-06\",\"workoutId\":\"$WID\"}" | jqi .id)
echo "   JID=$JID"

echo "✅ Happy path checks"
curl -sS -f -X PATCH "$API/plannings/$PID/jours/$JID" -H 'Content-Type: application/json' -d '{"date":"2025-10-07"}' | jq '.status,.date'
curl -sS -f -X POST "$API/plannings/$PID/jours/$JID/finish" | jq '.status,.doneAt'
CODE=$(http -X DELETE "$API/plannings/$PID/jours/$JID")
[[ "$CODE" == "204" || "$CODE" == "200" ]] || { echo "❌ delete expected 200/204, got $CODE"; exit 1; }

echo "🧪 Error paths"

echo "• add same day twice → 409"
J1=$(curl -sS -f -X POST "$API/plannings/$PID/jours" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-08\",\"workoutId\":\"$WID\"}" | jqi .id)
CODE=$(http -X POST "$API/plannings/$PID/jours" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-08\",\"workoutId\":\"$WID\"}")
[[ "$CODE" == "409" ]] || { echo "❌ expected 409 on duplicate, got $CODE"; exit 1; }

echo "• add out-of-range date → 400"
CODE=$(http -X POST "$API/plannings/$PID/jours" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-15\",\"workoutId\":\"$WID\"}")
[[ "$CODE" == "400" ]] || { echo "❌ expected 400 out-of-range, got $CODE"; exit 1; }

echo "• add with unknown workout → 404"
CODE=$(http -X POST "$API/plannings/$PID/jours" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-09\",\"workoutId\":\"00000000-0000-0000-0000-000000000000\"}")
[[ "$CODE" == "404" ]] || { echo "❌ expected 404 unknown workout, got $CODE"; exit 1; }

echo "• PATCH conflict (move J1 onto duplicate) → 409"
W2=$(curl -sS -f -X POST "$API/workouts" -H 'Content-Type: application/json' -d '{"title":"Push"}' | jqi .id)
J2=$(curl -sS -f -X POST "$API/plannings/$PID/jours" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-09\",\"workoutId\":\"$W2\"}" | jqi .id)
CODE=$(http -X PATCH "$API/plannings/$PID/jours/$J2" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-08\",\"workoutId\":\"$WID\"}")
[[ "$CODE" == "409" ]] || { echo "❌ expected 409 on PATCH conflict, got $CODE"; exit 1; }

echo "• PATCH out-of-range → 400"
CODE=$(http -X PATCH "$API/plannings/$PID/jours/$J1" -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-10-01\"}")
[[ "$CODE" == "400" ]] || { echo "❌ expected 400 on PATCH out-of-range, got $CODE"; exit 1; }

echo "• PATCH invalid workoutId → 400"
CODE=$(http -X PATCH "$API/plannings/$PID/jours/$J1" -H 'Content-Type: application/json' \
  -d "{\"workoutId\":\"not-a-uuid\"}")
[[ "$CODE" == "400" ]] || { echo "❌ expected 400 invalid workoutId, got $CODE"; exit 1; }

echo "• FINISH idempotent (calling twice) → 200 both"
curl -sS -f -X POST "$API/plannings/$PID/jours/$J1/finish" > /dev/null
CODE=$(http -X POST "$API/plannings/$PID/jours/$J1/finish")
[[ "$CODE" == "200" ]] || { echo "❌ expected 200 on second finish, got $CODE"; exit 1; }

echo "• DELETE with wrong planningId → 404"
P2=$(curl -sS -f -X POST "$API/plannings" -H 'Content-Type: application/json' \
  -d '{"nom":"Other","debut":"2025-10-01","fin":"2025-10-31"}' | jqi .id)
CODE=$(http -X DELETE "$API/plannings/$P2/jours/$J1")
[[ "$CODE" == "404" ]] || { echo "❌ expected 404 delete wrong planningId, got $CODE"; exit 1; }

echo "• DELETE twice → 404"
CODE=$(http -X DELETE "$API/plannings/$PID/jours/$J1")
[[ "$CODE" == "204" || "$CODE" == "200" ]] || { echo "❌ expected 200/204 first delete, got $CODE"; exit 1; }
CODE=$(http -X DELETE "$API/plannings/$PID/jours/$J1")
[[ "$CODE" == "404" ]] || { echo "❌ expected 404 second delete, got $CODE"; exit 1; }

echo "✅ ALL CHECKS PASS"
