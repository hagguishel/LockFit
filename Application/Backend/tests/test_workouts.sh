#!/usr/bin/env bash
BASE_URL=${BASE_URL:-"http://localhost:3002/api/v1"}

echo "ℹ️  Base URL: $BASE_URL"
echo

echo "==> Health"
curl -i "$BASE_URL/health"
echo
echo

echo "==> Création workout minimal (title seul)"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/workouts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Séance vide juste pour test",
    "items": []
  }')

echo "$CREATE_RESPONSE"

WORKOUT_ID=$(echo "$CREATE_RESPONSE" | grep -oP '(?<=\"id\":\")[^\"]+' | head -n1)
echo "ID créé: $WORKOUT_ID"

echo
echo "==> Liste des workouts"
curl -s "$BASE_URL/workouts"
echo

echo
echo "==> Finish sur le workout créé"
curl -s -X POST "$BASE_URL/workouts/$WORKOUT_ID/finish"
echo

echo
echo "==> Delete du workout créé"
curl -s -X DELETE "$BASE_URL/workouts/$WORKOUT_ID"
echo

echo
echo "✅ Test minimal terminé."
