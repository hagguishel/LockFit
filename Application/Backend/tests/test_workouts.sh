#!/usr/bin/env bash
set -euo pipefail

# ============================
# 🔧 Config
# ============================
BASE_URL=${BASE_URL:-"http://localhost:3002/api/v1"}
JQ=${JQ:-jq}

echo "ℹ️  Base URL: $BASE_URL"
command -v "$JQ" >/dev/null || { echo "❌ jq introuvable"; exit 1; }

# Helpers ---------------

fail() { echo "❌ $*" >&2; exit 1; }
ok()   { echo "✅ $*"; }
info() { echo; echo "==> $*"; }

curl_json() {
  # $1: method, $2: path, $3?: data
  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"
  local url="$BASE_URL$path"

  if [[ -n "$data" ]]; then
    curl -s -S -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
  else
    curl -s -S -X "$method" "$url"
  fi
}

assert_jq() {
  # $1: json, $2: jq filter (boolean expression), $3: message if fail
  local json="$1"; shift
  local filter="$1"; shift
  local msg="$1"
  local res
  res=$(echo "$json" | $JQ -e "$filter" >/dev/null 2>&1 && echo "true" || echo "false")
  [[ "$res" == "true" ]] || fail "$msg. Réponse: $(echo "$json" | $JQ '.')"
}

get_field() {
  # $1: json, $2: jq path
  echo "$1" | $JQ -r "$2"
}

# ============================
# 🧪 Tests
# ============================

# 0) Health
info "Health"
health=$(curl -si "$BASE_URL/health")
echo "$health" | grep -q "200 OK" || fail "Health ne répond pas 200"
ok "Health 200 OK"

# 1) Exercises disponibles (GET /exercises renvoie un tableau)
info "Vérifie le catalogue d'exercices"
ex_list=$(curl_json GET "/exercises")
assert_jq "$ex_list" 'type=="array"' "GET /exercises ne renvoie pas un tableau"
EXO_ID=$(echo "$ex_list" | $JQ -r '.[0].id')
[[ -n "${EXO_ID:-}" && "$EXO_ID" != "null" ]] || fail "Aucun exercise en base. Seed un exercice (Prisma Studio) puis relance."
ok "Exercises OK (exemple: $EXO_ID)"

# 2) Création workout minimal (sans items)
info "Création workout minimal (title seul)"
create_min=$(curl_json POST "/workouts" '{
  "title": "Séance vide juste pour test",
  "items": []
}')
WK_MIN_ID=$(get_field "$create_min" '.id')
assert_jq "$create_min" '.id and .title=="Séance vide juste pour test" and (.items|length)==0' "Création workout minimal invalide"
ok "Création workout minimal OK ($WK_MIN_ID)"

# 3) Listing global
info "Liste des workouts"
list_all=$(curl_json GET "/workouts")
assert_jq "$list_all" '.items and (.items|type)=="array"' "GET /workouts ne renvoie pas {items:[]}"
total_before=$(get_field "$list_all" '.total')
ok "Listing OK (total=$total_before)"

# 4) Finish le workout minimal
info "Finish sur workout minimal"
finish_min=$(curl_json POST "/workouts/$WK_MIN_ID/finish")
assert_jq "$finish_min" '.finishedAt != null' "finishedAt manquant après finish"
ok "Finish OK"

# 5) Création workout Live (1 item, 1 set)
info "Création workout Live (1 exercice, 1 set)"
create_live=$(curl_json POST "/workouts" '{
  "title": "Séance test live",
  "items": [
    {
      "order": 1,
      "exerciseId": "'$EXO_ID'",
      "sets": [{ "reps": 8, "weight": 60, "rest": 90, "rpe": 7 }]
    }
  ]
}')
WK_LIVE_ID=$(get_field "$create_live" '.id')
SET_ID=$(get_field "$create_live" '.items[0].sets[0].id')
assert_jq "$create_live" '.id and .items[0].sets[0].id' "Création workout live invalide"
ok "Création workout Live OK ($WK_LIVE_ID, set=$SET_ID)"

# 6) Live: complete set — happy path
info "Live: PATCH complete set (happy path)"
patch1=$(curl_json PATCH "/workouts/$WK_LIVE_ID/sets/$SET_ID/complete")
assert_jq "$patch1" '.completed == true' "Le set n’a pas été marqué completed=true"
ok "Complete set OK (1)"

# 7) Live: idempotence (re-patch)
info "Live: PATCH complete set (idempotence)"
patch2=$(curl_json PATCH "/workouts/$WK_LIVE_ID/sets/$SET_ID/complete")
assert_jq "$patch2" '.completed == true' "Idempotence échouée (devrait rester true)"
ok "Idempotence OK (2)"

# 8) Live: garde-fous — mauvais workout → 400
info "Live: garde-fous (mauvais workout → 400)"
# on crée un autre workout pour avoir un autre id
create_other=$(curl_json POST "/workouts" '{"title":"Autre","items":[{"order":1,"exerciseId":"'$EXO_ID'","sets":[{"reps":1}]}] }')
WK_OTHER_ID=$(get_field "$create_other" '.id')
bad_req=$(curl -s -o /tmp/live_bad.json -w "%{http_code}" -X PATCH "$BASE_URL/workouts/$WK_OTHER_ID/sets/$SET_ID/complete" -H "Content-Type: application/json")
[[ "$bad_req" == "400" ]] || fail "Attendu 400 pour set non lié (reçu $bad_req). Réponse: $(cat /tmp/live_bad.json)"
ok "Garde-fous 400 OK"

# 9) Live: set inexistant → 404
info "Live: set inexistant → 404"
notfound=$(curl -s -o /tmp/live_nf.json -w "%{http_code}" -X PATCH "$BASE_URL/workouts/$WK_LIVE_ID/sets/___BAD___/complete" -H "Content-Type: application/json")
[[ "$notfound" == "404" ]] || fail "Attendu 404 pour set inexistant (reçu $notfound). Réponse: $(cat /tmp/live_nf.json)"
ok "404 Not Found OK"

# 10) GET détail live: le set est bien completed
info "GET détail (vérifie completed)"
detail=$(curl_json GET "/workouts/$WK_LIVE_ID")
assert_jq "$detail" '.items[0].sets[0].completed == true' "Le set n’apparait pas completed dans le détail"
ok "Détail OK (completed visible)"

# 11) Filtres from/to + finished
info "Filtres from/to + finished"
now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
flt_from=$(curl_json GET "/workouts?from=$now_iso")
assert_jq "$flt_from" '.items|type=="array"' "from filter invalide (devrait renvoyer items:[])"
flt_finished=$(curl_json GET "/workouts?finished=true")
assert_jq "$flt_finished" '.items|type=="array"' "finished=true invalide"
ok "Filtres OK"

# 12) Update partiel (title)
info "Update partiel (title)"
upd=$(curl_json PATCH "/workouts/$WK_LIVE_ID" '{"title":"Séance live renommée"}')
assert_jq "$upd" '.title=="Séance live renommée"' "Update title non pris en compte"
ok "Update partiel OK"

# 13) Finish & Delete des deux workouts crées
info "Finish & Delete"
_=$(curl_json POST "/workouts/$WK_LIVE_ID/finish" | $JQ -e '.finishedAt != null') || fail "finish live KO"
del1=$(curl_json DELETE "/workouts/$WK_LIVE_ID")
assert_jq "$del1" '.ok==true' "Delete live KO"
del2=$(curl_json DELETE "/workouts/$WK_MIN_ID")
assert_jq "$del2" '.ok==true' "Delete minimal KO"
ok "Finish & Delete OK"

echo
echo "🎉 Tous les tests PASS. Backend “Live Entraînement” VALIDÉ."
