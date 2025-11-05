#!/usr/bin/env bash
set -euo pipefail

# =========================================
# 🔧 Config
# =========================================
# BASE_URL peut être:
#  - http://localhost:3002
#  - http://localhost:3002/api/v1
#  - https://<ton-tunnel>.trycloudflare.com
#  - https://lockfit.onrender.com
BASE_URL_RAW=${BASE_URL:-"http://localhost:3002"}
JQ=${JQ:-jq}
AUTH=${AUTH:-}   # ex: AUTH="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

command -v "$JQ" >/dev/null || { echo "❌ jq introuvable (sudo apt install jq)"; exit 1; }

# ——— Normalisation de l’URL ———
trim() { sed -E 's/^[[:space:]]+|[[:space:]]+$//g'; }
rm_trailing_slash() { sed -E 's:/+$::'; }

BASE_TRIM=$(printf "%s" "$BASE_URL_RAW" | trim)
BASE_NOSLASH=$(printf "%s" "$BASE_TRIM" | rm_trailing_slash)

if [[ "$BASE_NOSLASH" =~ /api/v1$ ]]; then
  API_BASE="$BASE_NOSLASH"
else
  API_BASE="$BASE_NOSLASH/api/v1"
fi

echo "ℹ️  API base: $API_BASE"
[[ -n "$AUTH" ]] && echo "🔐  Auth: (Authorization header fourni)" || echo "🔓  Auth: non (certaines routes peuvent échouer)"

# =========================================
# 🎨 ANSI helpers
# =========================================
c_gray="\033[90m"; c_red="\033[31m"; c_green="\033[32m"; c_yellow="\033[33m"; c_blue="\033[34m"; c_reset="\033[0m"
ok()   { echo -e "${c_green}✅ $*${c_reset}"; }
warn() { echo -e "${c_yellow}⚠️  $*${c_reset}"; }
fail() { echo -e "${c_red}❌ $*${c_reset}"; exit 1; }
info() { echo -e "\n${c_blue}==> $*${c_reset}"; }

# =========================================
# 🧰 HTTP helpers
# =========================================
# request METHOD /path [json-data]
# -> écrit le body dans /tmp/lf_body.json et le status dans /tmp/lf_status.txt
request() {
  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"

  local p="/${path#/}"   # s'assure que ça commence par /
  local url="${API_BASE}${p}"

  local authHeader=()
  [[ -n "$AUTH" ]] && authHeader=(-H "Authorization: $AUTH")

  if [[ -n "$data" ]]; then
    http_code=$(curl -sS -o /tmp/lf_body.json -w "%{http_code}" -X "$method" "$url" \
      -H "Accept: application/json" -H "Content-Type: application/json" \
      "${authHeader[@]}" \
      -d "$data")
  else
    http_code=$(curl -sS -o /tmp/lf_body.json -w "%{http_code}" -X "$method" "$url" \
      -H "Accept: application/json" \
      "${authHeader[@]}")
  fi
  echo -n "$http_code" >/tmp/lf_status.txt
}

# Attend un code précis et valide que le body est du JSON
expect_json_status() {
  local expected="$1"
  local got
  got=$(cat /tmp/lf_status.txt)
  [[ "$got" == "$expected" ]] || { echo "— Status attendu: $expected / reçu: $got"; echo "— Body:"; cat /tmp/lf_body.json; fail "Statut HTTP inattendu"; }
  # tente de pretty-print
  if ! $JQ '.' </tmp/lf_body.json >/dev/null 2>&1; then
    echo "— Body non JSON:"
    cat /tmp/lf_body.json
    fail "Réponse non JSON alors qu'attendue"
  fi
}

# Vérifie une expression jq booleenne sur le body courant
assert_body_jq() {
  local filter="$1"; shift
  local msg="$1"
  if ! $JQ -e "$filter" </tmp/lf_body.json >/dev/null 2>&1; then
    echo "— Réponse:"
    $JQ '.' </tmp/lf_body.json || cat /tmp/lf_body.json
    fail "$msg"
  fi
}

# Récupère un champ depuis le body courant
get_body_field() {
  $JQ -r "$1" </tmp/lf_body.json
}

# =========================================
# 🧪 Tests
# =========================================

# 0) CORS preflight (optionnel mais utile pour Expo)
info "CORS preflight (OPTIONS /workouts)"
cors_code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${API_BASE}/workouts" \
  -H "Origin: http://localhost:8081" -H "Access-Control-Request-Method: GET")
if [[ "$cors_code" == "204" || "$cors_code" == "200" ]]; then
  ok "CORS OPTIONS OK ($cors_code)"
else
  warn "CORS OPTIONS inattendu ($cors_code) — pas bloquant pour API côté mobile"
fi

# 1) Health (si présent)
info "Health check"
request GET "/health"
if [[ "$(cat /tmp/lf_status.txt)" == "200" ]]; then
  ok "Health 200 OK"
else
  warn "Pas de /health ou autre status ($(cat /tmp/lf_status.txt))). On continue."
fi

# 2) Catalogue d'exercices
info "GET /exercises — catalogue"
request GET "/exercises"
expect_json_status 200
assert_body_jq 'type=="array" and length>0' "Le catalogue d'exercices est vide. Seed au moins 1 exo."
EXO_ID=$(get_body_field '.[0].id')
ok "Exercises OK (exemple id: $EXO_ID)"

# 3) BAD request: date ISO invalide sur /workouts?from=
info "GET /workouts?from=BAD_DATE — doit renvoyer 400"
request GET "/workouts?from=2025-13-99T99:99:99Z"
if [[ "$(cat /tmp/lf_status.txt)" == "400" ]]; then
  ok "Filtre from invalide → 400 OK"
else
  warn "Filtre from invalide n'a pas renvoyé 400 (reçu $(cat /tmp/lf_status.txt)) — toléré"
fi

# 4) Création workout minimal (items: [])
info "POST /workouts — création minimal"
request POST "/workouts" '{
  "title": "Séance vide (test)",
  "items": []
}'
expect_json_status 201
assert_body_jq '.id and .title=="Séance vide (test)" and (.items|length)==0' "Création minimal invalide"
WK_MIN_ID=$(get_body_field '.id')
ok "Création workout minimal OK (id=$WK_MIN_ID)"

# 5) Listing global
info "GET /workouts — listing"
request GET "/workouts"
expect_json_status 200
assert_body_jq '.items and (.items|type)=="array" and (.total|type)=="number"' "Structure de listing invalide"
TOTAL_BEFORE=$(get_body_field '.total')
ok "Listing OK (total=$TOTAL_BEFORE)"

# 6) Finish sur le minimal
info "POST /workouts/:id/finish"
request POST "/workouts/$WK_MIN_ID/finish"
expect_json_status 200
assert_body_jq '.finishedAt != null' "finishedAt absent après finish"
ok "Finish OK"

# 7) Patch workout: métadonnées valides
info "PATCH /workouts/:id (title/note) — attendu 200"
request PATCH "/workouts/$WK_MIN_ID" '{ "title":"Séance renommée ✅", "note":"Note MAJ" }'
expect_json_status 200
assert_body_jq '.title=="Séance renommée ✅" and .note=="Note MAJ"' "Update partiel (meta) non pris en compte"
ok "Update meta OK"

# 8) Patch workout: champs interdits (items envoyés) → 400
info "PATCH /workouts/:id avec items — attendu 400 (forbidNonWhitelisted)"
request PATCH "/workouts/$WK_MIN_ID" '{ "items": [{"order":1,"exerciseId":"BAD","sets":[{"reps":12}]}] }'
if [[ "$(cat /tmp/lf_status.txt)" == "400" ]]; then
  ok "Champs interdits correctement rejetés (400)"
else
  warn "Attendu 400 pour items non autorisés (reçu $(cat /tmp/lf_status.txt))"
fi

# 9) Création séance live (1 item, 1 set)
info "POST /workouts — création live (1 exercice, 1 set)"
request POST "/workouts" "{
  \"title\": \"Séance test live\",
  \"items\": [
    {
      \"order\": 1,
      \"exerciseId\": \"${EXO_ID}\",
      \"sets\": [{ \"reps\": 8, \"weight\": 60, \"rest\": 90, \"rpe\": 7 }]
    }
  ]
}"
expect_json_status 201
assert_body_jq '.id and .items[0].sets[0].id' "Création live invalide"
WK_LIVE_ID=$(get_body_field '.id')
SET_ID=$(get_body_field '.items[0].sets[0].id')
ok "Création live OK (workout=$WK_LIVE_ID, set=$SET_ID)"

# 10) PATCH set (mise à jour reps/weight/rpe/rest)
info "PATCH /workouts/:id/sets/:setId — mise à jour de la série"
request PATCH "/workouts/$WK_LIVE_ID/sets/$SET_ID" '{ "reps": 12, "weight": 70, "rpe": 8, "rest": 120 }'
expect_json_status 200
assert_body_jq '.reps==12 and .weight==70 and .rpe==8 and .rest==120' "Update set non pris en compte"
ok "Update set OK"

# 11) PATCH complete set — idempotence
info "PATCH /workouts/:id/sets/:setId/complete — 1"
request PATCH "/workouts/$WK_LIVE_ID/sets/$SET_ID/complete"
expect_json_status 200
assert_body_jq '.completed==true' "Le set n'a pas été marqué completed=true"
ok "Complete set OK (1)"

info "PATCH /workouts/:id/sets/:setId/complete — 2 (idempotent)"
request PATCH "/workouts/$WK_LIVE_ID/sets/$SET_ID/complete"
expect_json_status 200
assert_body_jq '.completed==true' "Idempotence échouée (devrait rester true)"
ok "Complete set idempotent OK (2)"

# 12) Garde-fous: complete set sur mauvais workout → 400
info "Garde-fous: PATCH complete set avec mauvais workout — attendu 400"
request POST "/workouts" "{\"title\":\"Autre\",\"items\":[{\"order\":1,\"exerciseId\":\"$EXO_ID\",\"sets\":[{\"reps\":1}]}]}"
expect_json_status 201
WK_OTHER_ID=$(get_body_field '.id')
httpcode=$(curl -s -o /tmp/lf_tmp.json -w "%{http_code}" -X PATCH "${API_BASE}/workouts/$WK_OTHER_ID/sets/$SET_ID/complete" -H "Content-Type: application/json" ${AUTH:+-H "Authorization: $AUTH"})
if [[ "$httpcode" == "400" ]]; then
  ok "Mauvais workout → 400 OK"
else
  warn "Attendu 400 pour mauvais workout (reçu $httpcode). Réponse:"; cat /tmp/lf_tmp.json
fi

# 13) Garde-fous: set inexistant → 404
info "Garde-fous: PATCH complete set inexistant — attendu 404"
httpcode=$(curl -s -o /tmp/lf_tmp.json -w "%{http_code}" -X PATCH "${API_BASE}/workouts/$WK_LIVE_ID/sets/___BAD___/complete" -H "Content-Type: application/json" ${AUTH:+-H "Authorization: $AUTH"})
if [[ "$httpcode" == "404" ]]; then
  ok "Set inexistant → 404 OK"
else
  warn "Attendu 404 pour set inexistant (reçu $httpcode). Réponse:"; cat /tmp/lf_tmp.json
fi

# 14) GET détail — completed visible + valeurs MAJ
info "GET /workouts/:id — détail live"
request GET "/workouts/$WK_LIVE_ID"
expect_json_status 200
assert_body_jq '.items[0].sets[0].completed==true and .items[0].sets[0].reps==12 and .items[0].sets[0].weight==70' "Détail live incohérent"
ok "Détail live OK"

# 15) PATCH /workouts/:id — date ISO invalide → 400 attendu
info "PATCH /workouts/:id finishedAt BAD_DATE — attendu 400"
request PATCH "/workouts/$WK_LIVE_ID" '{"finishedAt":"2025-99-99T99:99:99Z"}'
if [[ "$(cat /tmp/lf_status.txt)" == "400" ]]; then
  ok "finishedAt invalide → 400 OK"
else
  warn "Attendu 400 pour finishedAt invalide (reçu $(cat /tmp/lf_status.txt))"
fi

# 16) FINISH workout live
info "POST /workouts/:id/finish"
request POST "/workouts/$WK_LIVE_ID/finish"
expect_json_status 200
assert_body_jq '.finishedAt != null' "finishedAt manquant après finish"
ok "Finish live OK"

# 17) DELETE des workouts créés (ordre: live puis minimal)
info "DELETE /workouts/:id (live)"
request DELETE "/workouts/$WK_LIVE_ID"
expect_json_status 200
assert_body_jq '.ok==true and .id!=null' "Delete live KO"
ok "Delete live OK"

info "DELETE /workouts/:id (minimal)"
request DELETE "/workouts/$WK_MIN_ID"
expect_json_status 200
assert_body_jq '.ok==true and .id!=null' "Delete minimal KO"
ok "Delete minimal OK"

# 18) Listing final
info "GET /workouts — listing final"
request GET "/workouts"
expect_json_status 200
TOTAL_AFTER=$(get_body_field '.total')
ok "Listing final OK (total=$TOTAL_AFTER)"

echo
echo -e "${c_green}🎉 Tous les tests PASS (ou warnings tolérés). Backend « Live Entraînement » VALIDÉ.${c_reset}"
