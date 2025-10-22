#!/usr/bin/env bash
set -euo pipefail

# =========================
# LockFit API - Auth E2E Tests
# =========================

# ---------- Config ----------
BASE_URL="${BASE_URL:-http://localhost:3001/api/v1}"
EMAIL="${EMAIL:-test+auth@lockfit.dev}"
PASSWORD="${PASSWORD:-P@ssw0rd!}"
FIRST_NAME="${FIRST_NAME:-Auth}"
LAST_NAME="${LAST_NAME:-Bot}"
SKIP_MFA="${SKIP_MFA:-0}"
MFA_SECRET="${MFA_SECRET:-}"
DEBUG="${DEBUG:-0}"
PROTECTED_ME_PATH="${PROTECTED_ME_PATH:-/auth/mfa/secret}"

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

api_call() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local data="${4:-}"

  local args=(-sS -X "$method" -H "Content-Type: application/json")

  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$data" ]] && args+=(-d "$data")

  curl "${args[@]}" "${BASE_URL}${path}"
}

need_bin() {
  command -v "$1" >/dev/null 2>&1 || { err "Missing dependency: $1"; exit 1; }
}

# ---------- Checks ----------
need_bin curl
need_bin jq

info "Base URL: $BASE_URL"
info "Email   : $EMAIL"
[[ "$SKIP_MFA" == "1" ]] && info "MFA     : SKIPPED" || info "MFA     : ENABLED"
echo ""

# ---------- 1) Health ----------
response=$(api_call GET /health)
dump "$response"
if echo "$response" | jq -e '.ok' >/dev/null 2>&1; then
  ok "Health check OK"
else
  err "Health check failed: $response"
  exit 1
fi

# ---------- 2) Signup ----------
payload_signup=$(printf '{"email":"%s","password":"%s","firstName":"%s","lastName":"%s"}' \
  "$EMAIL" "$PASSWORD" "$FIRST_NAME" "$LAST_NAME")
response=$(api_call POST /auth/signup "" "$payload_signup" 2>&1 || true)
dump "$response"

if echo "$response" | jq -e '.id' >/dev/null 2>&1; then
  ok "Signup OK"
elif echo "$response" | jq -e '.statusCode' 2>&1 | grep -q "409\|400"; then
  warn "Signup skipped -> user already exists"
else
  warn "Signup response: $response"
fi

# ---------- 3) Login ----------
payload_login=$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")
response=$(api_call POST /auth/login "" "$payload_login")
dump "$response"

access=$(echo "$response" | jq -r '.accessToken // empty')
refresh=$(echo "$response" | jq -r '.refreshToken // empty')
mfa_required=$(echo "$response" | jq -r '.mfaRequired // false')
temp_session=$(echo "$response" | jq -r '.tempSessionId // empty')

if [[ -n "$access" && -n "$refresh" ]]; then
  ok "Login OK (tokens received)"
  info "Access: ${access:0:30}..."
  info "Refresh: ${refresh:0:30}..."
elif [[ "$mfa_required" == "true" ]]; then
  ok "Login OK (MFA required)"
  info "Temp session: ${temp_session:0:30}..."
else
  err "Login failed or tokens missing"
  err "Response: $response"
  exit 1
fi

# ---------- 4) Protected routes ----------
if [[ -n "${access:-}" ]]; then
  # Test /auth/mfa/secret (POST)
  response=$(api_call POST "$PROTECTED_ME_PATH" "$access" "{}" 2>&1 || true)
  dump "$response"
  if echo "$response" | jq -e '.secret' >/dev/null 2>&1; then
    ok "${PROTECTED_ME_PATH} accessible"
  else
    warn "${PROTECTED_ME_PATH} failed or not available"
  fi

  # Test /users/me (GET)
  response=$(api_call GET /users/me "$access" 2>&1 || true)
  dump "$response"
  if echo "$response" | jq -e '.id' >/dev/null 2>&1; then
    user_id=$(echo "$response" | jq -r '.id')
    ok "/users/me accessible (id: $user_id)"
  else
    warn "/users/me not available (may not exist)"
  fi
fi

# ---------- 5) MFA Setup ----------
totp_secret=""
if [[ "$SKIP_MFA" != "1" && -n "${access:-}" ]]; then
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
      warn "Could not generate MFA secret"
    fi
  fi

  # Enable MFA with TOTP
  if [[ -n "$totp_secret" ]] && command -v oathtool >/dev/null 2>&1; then
    totp_code=$(oathtool --totp -b "$totp_secret")
    info "Generated TOTP code: $totp_code"

    response=$(api_call POST /auth/mfa/enable "$access" "{\"totpCode\":\"$totp_code\"}" 2>&1 || true)
    dump "$response"

    if echo "$response" | jq -e '.message' 2>&1 | grep -qi "enabled\|success"; then
      ok "MFA enabled"
    else
      warn "MFA enable result: $response"
    fi
  elif [[ -z "$totp_secret" ]]; then
    warn "No TOTP secret available"
  else
    warn "oathtool not installed - skipping MFA enable"
  fi
fi

# ---------- 6) Login with MFA ----------
if [[ "$SKIP_MFA" != "1" && -n "${totp_secret:-}" ]] && command -v oathtool >/dev/null 2>&1; then
  info "Testing login with MFA..."

  response=$(api_call POST /auth/login "" "$payload_login")
  dump "$response"
  mfa_required=$(echo "$response" | jq -r '.mfaRequired // false')

  if [[ "$mfa_required" == "true" ]]; then
    totp_code=$(oathtool --totp -b "$totp_secret")
    payload_verify=$(printf '{"email":"%s","totpCode":"%s"}' "$EMAIL" "$totp_code")

    response=$(api_call POST /auth/mfa/verify-totp "" "$payload_verify" 2>&1 || true)
    dump "$response"

    access=$(echo "$response" | jq -r '.accessToken // empty')
    refresh=$(echo "$response" | jq -r '.refreshToken // empty')

    if [[ -n "$access" ]]; then
      ok "MFA verify OK (new tokens received)"
    else
      warn "MFA verify failed or tokens missing"
    fi
  fi
fi

# ---------- 7) Refresh token ----------
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
  warn "No refresh token available"
fi

# ---------- 8) Negative tests ----------
# Wrong password
payload_bad=$(printf '{"email":"%s","password":"WRONG%s"}' "$EMAIL" "$PASSWORD")
response=$(api_call POST /auth/login "" "$payload_bad" 2>&1 || true)
if echo "$response" | jq -e '.statusCode' 2>&1 | grep -q "401\|400"; then
  ok "Negative test: wrong password rejected"
else
  warn "Wrong password response: $response"
fi

# Bad token
response=$(api_call POST "$PROTECTED_ME_PATH" "INVALID.TOKEN" "{}" 2>&1 || true)
if echo "$response" | jq -e '.statusCode' 2>&1 | grep -q "401\|403"; then
  ok "Negative test: bad token rejected"
else
  warn "Bad token response: $response"
fi

# ---------- 9) Logout ----------
if [[ -n "${refresh:-}" ]]; then
  response=$(api_call POST /auth/logout "$refresh" "" 2>&1 || true)
  dump "$response"
  ok "Logout called"
fi

echo ""
ok "All auth tests completed"
