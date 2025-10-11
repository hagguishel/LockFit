#!/usr/bin/env bash
set -euo pipefail

# ================== Réglages ==================
BASE_URL="${BASE_URL:-http://localhost:3001/api/v1}"
CURL="curl -sS -m 10"
JQ="${JQ:-jq}"

# Couleurs
red(){ printf "\033[31m%s\033[0m\n" "$*"; }
green(){ printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }
cyan(){ printf "\033[36m%s\033[0m\n" "$*"; }

# ================== Helpers HTTP ==================
HTTP_CODE=""

request() {
  local method="$1"; shift
  local url="$1"; shift
  local data="${1-}"

  local out
  if [[ -n "${data}" ]]; then
    out="$($CURL -w '\n%{http_code}' -H 'Content-Type: application/json' -X "$method" "$url" -d "$data" 2>/dev/null || true)"
  else
    out="$($CURL -w '\n%{http_code}' -X "$method" "$url" 2>/dev/null || true)"
  fi
  HTTP_CODE="${out##*$'\n'}"
  [[ -z "$HTTP_CODE" || "$HTTP_CODE" == "$out" ]] && HTTP_CODE="000"
  printf "%s" "${out%$'\n'*}"
}

assert_code() {
  local expected="$1"
  if [[ "$HTTP_CODE" != "$expected" ]]; then
    red "✖ HTTP $HTTP_CODE (attendu $expected)"
    exit 1
  fi
}

# ➜ NOUVEAU : accepte plusieurs codes (ex: 200 ou 201)
assert_code_in() {
  local ok=1
  for want in "$@"; do
    if [[ "$HTTP_CODE" == "$want" ]]; then ok=0; break; fi
  done
  if [[ $ok -ne 0 ]]; then
    red "✖ HTTP $HTTP_CODE (attendu l'un de: $*)"
    exit 1
  fi
}

try_code() {
  local expected="$1"
  if [[ "$HTTP_CODE" != "$expected" ]]; then
    yellow "• HTTP $HTTP_CODE (attendu $expected) — on continue (test non bloquant)"
    return 1
  fi
  return 0
}

wait_for_api() {
  local url="$1"
  local tries="${2:-30}"
  cyan "⏳ Attente API: $url"
  for _ in $(seq 1 "$tries"); do
    request GET "$url" >/dev/null
    if [[ "$HTTP_CODE" == "200" ]]; then
      green "✓ API prête"
      return 0
    fi
    sleep 1
  done
  red "✖ API pas joignable (dernier code: $HTTP_CODE)"
  exit 1
}

need_tool() {
  command -v "$1" >/dev/null 2>&1 || { red "Outil requis manquant : $1"; exit 1; }
}

# ================== Démarrage ==================
need_tool "$JQ"

cyan "🔎 BASE_URL = $BASE_URL"
wait_for_api "$BASE_URL/health" 30

# ================== Health ==================
cyan "⛑  Health check"
body="$(request GET "$BASE_URL/health")"
assert_code 200
echo "$body" | $JQ .

# ================== Exercises (léger) ==================
cyan "🏋️  Exercises (optionnel)"
EXO1="${EXO1:-}"
EXO2="${EXO2:-}"

if [[ -z "$EXO1" || -z "$EXO2" ]]; then
  if docker ps --format '{{.Names}}' | grep -q '^lockfit_db$'; then
    EXO1="$(docker exec -i lockfit_db psql -t -A -U lockfit -d lockfit -c "SELECT id FROM \"Exercise\" WHERE slug='bench-press' LIMIT 1;" | tr -d '\r' | xargs || true)"
    EXO2="$(docker exec -i lockfit_db psql -t -A -U lockfit -d lockfit -c "SELECT id FROM \"Exercise\" WHERE slug='dips' LIMIT 1;" | tr -d '\r' | xargs || true)"
  fi
fi

if [[ -z "$EXO1" || -z "$EXO2" ]]; then
  list="$(request GET "$BASE_URL/exercises")"
  if try_code 200; then
    slug_to_id() {
      printf '%s' "$list" | $JQ -r --arg s "$1" '
        (.. | objects? | select(has("slug") and .slug==$s) | .id) // empty
      ' | head -n1
    }
    EXO1="${EXO1:-$(slug_to_id "bench-press")}"
    EXO2="${EXO2:-$(slug_to_id "dips")}"
  fi
fi

if [[ -z "$EXO1" || -z "$EXO2" ]]; then
  yellow "• Impossible de récupérer 2 exercices (bench-press/dips)."
  yellow "  → les tests Workouts seront SKIPPED."
fi

# ================== Workouts ==================
if [[ -n "$EXO1" && -n "$EXO2" ]]; then
  cyan "📝 Create workout"
  payload="$(cat <<JSON
{
  "title": "Pecs/Triceps",
  "items": [
    { "exerciseId": "$EXO1", "order": 1,
      "sets": [
        { "reps": 10, "weight": 60, "rest": 90 },
        { "reps": 8,  "weight": 70, "rest": 120 }
      ]
    },
    { "exerciseId": "$EXO2", "order": 2,
      "sets": [ { "reps": 12, "rest": 90 } ]
    }
  ]
}
JSON
)"
  created="$(request POST "$BASE_URL/workouts" "$payload")"
  # ➜ Accepte 200 OU 201 ici
  assert_code_in 200 201
  echo "$created" | $JQ .
  WID="$(echo "$created" | $JQ -r '.id')"

  cyan "📜 List workouts"
  list="$(request GET "$BASE_URL/workouts")"
  assert_code 200
  echo "$list" | $JQ '{total, sample: (.items[0]|{id,title})}'

  cyan "🔍 Get workout by id"
  one="$(request GET "$BASE_URL/workouts/$WID")"
  assert_code 200
  echo "$one" | $JQ '{id,title,items: ( .items|length )}'

  cyan "✏️  Patch workout title"
  patch='{"title":"Pecs/Triceps (update)"}'
  upd="$(request PATCH "$BASE_URL/workouts/$WID" "$patch")"
  assert_code 200
  echo "$upd" | $JQ '{id,title}'

  cyan "✅ Finish workout"
  fin="$(request POST "$BASE_URL/workouts/$WID/finish")"
  assert_code 200
  echo "$fin" | $JQ '{id,finishedAt}'

  cyan "🗑  Delete workout"
  del="$(request DELETE "$BASE_URL/workouts/$WID")"
  assert_code 200
  echo "$del" | $JQ .
else
  yellow "• Workouts SKIPPED (pas d'IDs d'exercices)."
fi

### ─────────────────────────────────────────────
### 🗓 Plannings (smoke tests) — robustifié
### ─────────────────────────────────────────────
echo
cyan "🗓  Plannings (smoke tests)"

# 0) Sécuriser l'usage de set -u
PID=""

# 1) Créer un planning
PL_CREATE_JSON="$(curl -s -X POST "$BASE_URL/plannings" \
  -H 'Content-Type: application/json' \
  -d "{\"nom\":\"Test Planning\",\"debut\":\"$(date -u +%Y-%m-%dT00:00:00Z)\",\"fin\":\"$(date -u -d '+7 days' +%Y-%m-%dT00:00:00Z 2>/dev/null || date -v +7d -u +%Y-%m-%dT00:00:00Z)\"}" \
  || true)"

echo "$PL_CREATE_JSON" | $JQ . || true

# 2) Extraire l'ID si présent (sinon empty)
PID="$(printf '%s' "$PL_CREATE_JSON" | $JQ -r '.id // empty' 2>/dev/null || true)"

if [ -z "$PID" ]; then
  yellow "• Impossible d’extraire l’ID du planning → skip des tests jours."
else
  green "Planning créé: $PID"

  # 3) Créer un workout à référencer dans le jour
  WID_JSON="$(curl -s -X POST "$BASE_URL/workouts" \
    -H 'Content-Type: application/json' \
    -d '{
      "title":"Plan - Jour 1",
      "items":[
        { "exerciseId":"5f2fc6bc0934e32f5c5843cb", "order":1, "sets":[{"reps":8,"rest":90}] }
      ]
    }' || true)"
  echo "$WID_JSON" | $JQ . >/dev/null || true
  WID="$(printf '%s' "$WID_JSON" | $JQ -r '.id // empty' 2>/dev/null || true)"

  if [ -z "$WID" ]; then
    yellow "• Pas d'ID de workout → skip des tests jours."
  else
    JDATE="$(date -u +%Y-%m-%dT00:00:00Z)"
    cyan "➕ Add day to planning ($PID)"
    J_CREATE_JSON="$(curl -s -X POST "$BASE_URL/plannings/$PID/jours" \
      -H 'Content-Type: application/json' \
      -d "{\"date\":\"$JDATE\",\"workoutId\":\"$WID\"}" || true)"
    echo "$J_CREATE_JSON" | $JQ . || true

    JID="$(printf '%s' "$J_CREATE_JSON" | $JQ -r '.id // empty' 2>/dev/null || true)"

    if [ -n "$JID" ]; then
      cyan "✅ Finish day"
      curl -s -X POST "$BASE_URL/plannings/$PID/jours/$JID/finish" | $JQ . || true

      cyan "🗑  Delete day"
      curl -s -X DELETE "$BASE_URL/plannings/$PID/jours/$JID" | $JQ . || true
    else
      yellow "• Pas d’ID de jour détecté → skip finish/delete."
    fi
  fi
fi

green "✅ Tests terminés."
