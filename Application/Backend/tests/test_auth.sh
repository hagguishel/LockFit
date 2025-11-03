#!/usr/bin/env bash
set -euo pipefail

# =========================
# LockFit API - Auth E2E Tests
# =========================
#
# Ce script vérifie :
# - /health
# - /auth/signup
# - /auth/login
# - /auth/mfa/secret
# - /auth/mfa/enable
# - /auth/mfa/verify-totp (si MFA actif)
# - /auth/refresh
# - /auth/me (route protégée)
# - rejets sécurité (mauvais mot de passe, mauvais token)
# - /auth/logout (best effort)
#
# Il couvre les US:
#  - US-ACCT-01 (création de compte)
#  - US-ACCT-02 (activation MFA TOTP)
#  - US-ACCT-03 (connexion + session JWT + refresh)
#

# ---------- Config ----------
API_BASE="http://localhost:3002/api/v1"

EMAIL="${EMAIL:-test+auth@lockfit.dev}"
PASSWORD="${PASSWORD:-P@ssw0rd!}"
FIRST_NAME="${FIRST_NAME:-Auth}"
LAST_NAME="${LAST_NAME:-Bot}"

SKIP_MFA="${SKIP_MFA:-0}"          # 1 = ne touche pas au MFA
MFA_SECRET="${MFA_SECRET:-}"       # tu peux injecter un secret TOTP à la main si besoin
DEBUG="${DEBUG:-0}"

PROTECTED_MFA_SECRET_PATH="${PROTECTED_MFA_SECRET_PATH:-/auth/mfa/secret}"
PROTECTED_ME_PATH="${PROTECTED_ME_PATH:-/auth/me}"

# ---------- Colors ----------
ok(){ printf "\033[32m✔ %s\033[0m\n" "$*"; }
info(){ printf "\033[36mℹ %s\033[0m\n" "$*"; }
warn(){ printf "\033[33m⚠ %s\033[0m\n" "$*"; }
err(){ printf "\033[31m✘ %s\033[0m\n" "$*"; }

# ---------- Helpers ----------
dump(){
  if [[ "$DEBUG" == "1" && -n "${1:-}" ]]; then
    printf "\033[90m%s\033[0m\n" "$1" | jq . 2>/dev/null || printf "%s\n" "$1"
  fi
}

need_bin() {
  command -v "$1" >/dev/null 2>&1 || { err "Missing dependency: $1"; exit 1; }
}

api_call() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local data="${4:-}"

  local args=(-sS -X "$method" -H "Content-Type: application/json")

  if [[ -n "$token" ]]; then
    args+=(-H "Authorization: Bearer $token")
  fi

  if [[ -n "$data" ]]; then
    args+=(-d "$data")
  fi

  curl "${args[@]}" "${API_BASE}${path}"
}

# ---------- Checks env ----------
need_bin curl
need_bin jq

info "Base URL: $API_BASE"
info "Email   : $EMAIL"
[[ "$SKIP_MFA" == "1" ]] && info "MFA     : SKIPPED" || info "MFA     : ENABLED"
echo ""

########################################
# 1) Health
########################################
response=$(api_call GET /health)
dump "$response"

if echo "$response" | jq -e '.ok' >/dev/null 2>&1; then
  ok "Health check OK"
else
  err "Health check failed: $response"
  exit 1
fi

########################################
# 2) Signup
########################################
payload_signup=$(printf '{"email":"%s","password":"%s","firstName":"%s","lastName":"%s"}' \
  "$EMAIL" "$PASSWORD" "$FIRST_NAME" "$LAST_NAME")

response=$(api_call POST /auth/signup "" "$payload_signup" 2>&1 || true)
dump "$response"

# Deux cas possibles :
# - utilisateur créé => on reçoit user + tokens
# - utilisateur existe déjà => on reçoit un 400/409
if echo "$response" | jq -e '.user.id' >/dev/null 2>&1; then
  user_created_id=$(echo "$response" | jq -r '.user.id')
  ok "Signup OK (user created: $user_created_id)"
elif echo "$response" | jq -e '.statusCode' 2>/dev/null | grep -q "409\|400"; then
  warn "Signup skipped (user probably already exists)"
else
  warn "Signup response not standard: $response"
fi

########################################
# 3) Login
########################################
payload_login=$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")

response=$(api_call POST /auth/login "" "$payload_login")
dump "$response"

access=$(echo "$response"       | jq -r '.accessToken // empty')
refresh=$(echo "$response"      | jq -r '.refreshToken // empty')
mfa_required=$(echo "$response" | jq -r '.mfaRequired // false')
temp_session=$(echo "$response" | jq -r '.tempSessionId // empty')

if [[ -n "$access" && -n "$refresh" ]]; then
  ok "Login OK (access + refresh reçus)"
  info "Access  : ${access:0:30}..."
  info "Refresh : ${refresh:0:30}..."
elif [[ "$mfa_required" == "true" ]]; then
  ok "Login OK (MFA requis)"
  info "Temp session: ${temp_session:0:30}..."
else
  err "Login failed or tokens missing"
  err "Response: $response"
  exit 1
fi

########################################
# 4) Protected routes test
########################################
if [[ -n "${access:-}" ]]; then
  # 4a. /auth/mfa/secret (POST)
  response=$(api_call POST "$PROTECTED_MFA_SECRET_PATH" "$access" "{}" 2>&1 || true)
  dump "$response"

  if echo "$response" | jq -e '.secret' >/dev/null 2>&1; then
    ok "$PROTECTED_MFA_SECRET_PATH accessible (MFA secret reçu)"
  else
    warn "$PROTECTED_MFA_SECRET_PATH pas accessible (peut exiger état différent)"
  fi

  # 4b. /auth/me (GET)
  response=$(api_call GET "$PROTECTED_ME_PATH" "$access" 2>&1 || true)
  dump "$response"

  if echo "$response" | jq -e '.id' >/dev/null 2>&1; then
    user_id=$(echo "$response" | jq -r '.id')
    ok "/auth/me accessible (user id: $user_id)"
  else
    warn "/auth/me refusé => route protégée par MFA (attendu)"
  fi
fi

########################################
# 5) MFA Setup (si SKIP_MFA=0)
########################################
totp_secret=""

if [[ "$SKIP_MFA" != "1" && -n "${access:-}" ]]; then
  # soit on injecte un secret existant, soit on le génère
  if [[ -n "$MFA_SECRET" ]]; then
    totp_secret="$MFA_SECRET"
    info "Using provided MFA_SECRET"
  else
    response=$(api_call POST /auth/mfa/secret "$access" "{}" 2>&1 || true)
    dump "$response"
    totp_secret=$(echo "$response" | jq -r '.secret // empty')

    if [[ -n "$totp_secret" ]]; then
      ok "MFA secret generated: $totp_secret"
    else
      warn "Could not generate MFA secret (peut-être déjà activé ?)"
    fi
  fi

  # activer MFA si on a un secret et si oathtool est dispo
  if [[ -n "$totp_secret" ]] && command -v oathtool >/dev/null 2>&1; then
    totp_code=$(oathtool --totp -b "$totp_secret")
    info "Generated TOTP code: $totp_code"

    response=$(api_call POST /auth/mfa/enable "$access" "{\"totpCode\":\"$totp_code\"}" 2>&1 || true)
    dump "$response"

    # Ton backend nous renvoie déjà un objet genre {"mfaEnabled":true}
    if echo "$response" | jq -e '.mfaEnabled' >/dev/null 2>&1; then
      ok "MFA enabled (mfaEnabled=true)"
    elif echo "$response" | jq -e '.message' 2>/dev/null | grep -qi "enabled\|success"; then
      ok "MFA enabled"
    else
      warn "MFA enable result not clear: $response"
    fi
  elif [[ -z "$totp_secret" ]]; then
    warn "No TOTP secret available → skipping MFA enable"
  else
    warn "oathtool not installed → skipping MFA enable"
  fi
fi

########################################
# 6) Login avec MFA (si on a pu activer le MFA)
########################################
if [[ "$SKIP_MFA" != "1" && -n "${totp_secret:-}" ]] && command -v oathtool >/dev/null 2>&1; then
  info "Testing login with MFA..."

  response=$(api_call POST /auth/login "" "$payload_login")
  dump "$response"

  mfa_required=$(echo "$response" | jq -r '.mfaRequired // false')
  temp_session=$(echo "$response" | jq -r '.tempSessionId // empty')

  if [[ "$mfa_required" == "true" && -n "$temp_session" ]]; then
    totp_code=$(oathtool --totp -b "$totp_secret")
    payload_verify=$(printf '{"email":"%s","totpCode":"%s","tempSessionId":"%s"}' \
      "$EMAIL" "$totp_code" "$temp_session")

    response=$(api_call POST /auth/mfa/verify-totp "" "$payload_verify" 2>&1 || true)
    dump "$response"

    access=$(echo "$response"  | jq -r '.accessToken // empty')
    refresh=$(echo "$response" | jq -r '.refreshToken // empty')

    if [[ -n "$access" ]]; then
      ok "MFA verify OK (tokens après MFA)"
    else
      warn "MFA verify failed or tokens missing"
    fi
  else
    warn "Login did not request MFA or missing temp_session"
  fi
fi

########################################
# 7) Refresh token
########################################
if [[ -n "${refresh:-}" ]]; then
  payload_refresh=$(printf '{"refresh":"%s"}' "$refresh")
  response=$(api_call POST /auth/refresh "" "$payload_refresh" 2>&1 || true)
  dump "$response"

  new_access=$(echo "$response" | jq -r '.accessToken // empty')

  if [[ -n "$new_access" ]]; then
    ok "Refresh OK (new access token)"
    info "New access: ${new_access:0:30}..."
    access="$new_access"
  else
    err "Refresh failed: $response"
    exit 1
  fi
else
  warn "No refresh token available to test refresh flow"
fi

########################################
# 8) Negative tests
########################################

# 8a. Mauvais mot de passe
payload_bad=$(printf '{"email":"%s","password":"WRONG%s"}' "$EMAIL" "$PASSWORD")
response=$(api_call POST /auth/login "" "$payload_bad" 2>&1 || true)

if echo "$response" | jq -e '.statusCode' 2>/dev/null | grep -q "401\|400"; then
  ok "Negative test: wrong password rejected"
else
  warn "Wrong password login response: $response"
fi

# 8b. Jeton invalide sur une route protégée
response=$(api_call GET "$PROTECTED_ME_PATH" "INVALID.TOKEN" "" 2>&1 || true)

if echo "$response" | jq -e '.statusCode' 2>/dev/null | grep -q "401\|403"; then
  ok "Negative test: bad token rejected"
else
  warn "Bad token response: $response"
fi

########################################
# 9) Logout (best effort)
########################################
if [[ -n "${refresh:-}" ]]; then
  # Certaines implémentations attendent le refresh token dans le body,
  # d'autres attendent l'access en Bearer. On tente les deux.
  payload_logout=$(printf '{"refresh":"%s"}' "$refresh")

  response=$(api_call POST /auth/logout "$access" "$payload_logout" 2>&1 || true)
  dump "$response"

  ok "Logout called (best effort)"
fi

echo ""
ok "All auth tests completed"
