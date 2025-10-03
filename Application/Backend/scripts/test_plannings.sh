#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
NAME="Programme Test $(date +%s)"   # nom unique
FROM_OK="2025-10-01T00:00:00.000Z"
TO_OK="2025-10-28T23:59:00.000Z"

info()  { echo "👉 $*"; }
pass()  { echo "✅ $*"; }
fail()  { echo "❌ $*"; exit 1; }

jq_check() {
  command -v jq >/dev/null 2>&1 || fail "jq n'est pas installé (sudo apt-get install -y jq)."
}

jq_check

# 1) POST /plannings
info "POST /plannings"
CREATE_RES=$(curl -s -w '\n%{http_code}' -X POST "$BASE_URL/plannings" \
  -H 'Content-Type: application/json' \
  -d "{\"nom\":\"$NAME\",\"debut\":\"$FROM_OK\",\"fin\":\"$TO_OK\"}")
CREATE_BODY=$(echo "$CREATE_RES" | head -n 1)
CREATE_CODE=$(echo "$CREATE_RES" | tail -n 1)
[ "$CREATE_CODE" = "201" ] || { echo "$CREATE_BODY"; fail "POST /plannings doit renvoyer 201"; }
ID=$(echo "$CREATE_BODY" | jq -r '.id')
[ -n "$ID" ] || fail "ID manquant dans la réponse de création"
pass "Création OK (id=$ID)"

# 2) GET /plannings (liste)
info "GET /plannings"
LIST=$(curl -s "$BASE_URL/plannings")
echo "$LIST" | jq '.total,.items | length' >/dev/null || fail "Réponse JSON invalide"
echo "$LIST" | jq -e --arg id "$ID" '.items | any(.id == $id)' >/dev/null || fail "L'ID créé n'apparaît pas dans la liste"
pass "Liste OK (l'élément créé est présent)"

# 3) GET /plannings avec filtres chevauchement
info "GET /plannings?from=2025-10-01&to=2025-10-31"
FILTER=$(curl -s "$BASE_URL/plannings?from=2025-10-01&to=2025-10-31")
echo "$FILTER" | jq -e --arg id "$ID" '.items | any(.id == $id)' >/dev/null || fail "Le filtre n'inclut pas l'élément attendu"
pass "Filtres chevauchement OK"

# 4) GET /plannings pagination
info "GET /plannings?page=2&limit=50"
PAGE2=$(curl -s "$BASE_URL/plannings?page=2&limit=50")
echo "$PAGE2" | jq '.items,.total' >/dev/null || fail "Réponse pagination invalide"
pass "Pagination OK"

# 5) GET /plannings/:id (détail)
info "GET /plannings/$ID"
ONE=$(curl -s "$BASE_URL/plannings/$ID")
echo "$ONE" | jq -e --arg id "$ID" '.id == $id' >/dev/null || fail "GET :id ne renvoie pas le bon élément"
pass "Détail OK"

# 6) GET /plannings/:id (404 attendu)
info "GET /plannings/does-not-exist (404 attendu)"
NOT_FOUND_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/plannings/does-not-exist")
[ "$NOT_FOUND_CODE" = "404" ] || fail "GET :id doit renvoyer 404 pour un id inconnu"
pass "404 introuvable OK"

# 7) GET /plannings (erreurs de validation)
info "GET /plannings?from=NOPE (400 attendu)"
BAD_FROM_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/plannings?from=NOPE")
[ "$BAD_FROM_CODE" = "400" ] || fail "from invalide doit renvoyer 400"
pass "Validation from invalide OK"

info "GET /plannings?from=2025-10-10&to=2025-10-01 (400 attendu)"
BAD_RANGE_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/plannings?from=2025-10-10&to=2025-10-01")
[ "$BAD_RANGE_CODE" = "400" ] || fail "from>to doit renvoyer 400"
pass "Validation from>to OK"

echo
pass "Tous les tests plannings sont PASS ✅"
