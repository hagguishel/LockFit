#!/usr/bin/env bash
set -euo pipefail

# =========================
# LockFit API - Auth E2E Tests
# =========================
# This script runs end-to-end checks for the authentication flow:
# - /health
# - /auth/register  (idempotent: continues if already exists)
# - /auth/login     (with/without MFA)
# - /auth/mfa/setup (optional, if available)
# - /auth/mfa/enable (optional, if available)
# - /auth/mfa/verify OR /auth/login with totpCode (both paths supported)
# - /auth/refresh
# - /users/me (protected route)
# - Negative cases (bad password, bad token)
#
# Requirements: curl, jq. For MFA tests: oathtool (optional).
#
# Usage:
#   BASE_URL=http://localhost:3001/api/v1 EMAIL=test+auth@lockfit.dev PASSWORD='P@ssw0rd!' ./test_auth.sh
# Options:
#   SKIP_MFA=1  -> do not try to setup/verify MFA
#   MFA_SECRET=BASE32SECRET -> use an existing TOTP secret (skip /auth/mfa/setup)
# =========================

# ---------- Config ----------
BASE_URL="${BASE_URL:-http://localhost:3001/api/v1}"
EMAIL="${EMAIL:-test+auth@lockfit.dev}"
PASSWORD="${PASSWORD:-P@ssw0rd!}"
DISPLAY_NAME="${DISPLAY_NAME:-Auth Bot}"
SKIP_MFA="${SKIP_MFA:-0}"
MFA_SECRET="${MFA_SECRET:-}"
CURL="${CURL:-curl -sS -m 15}"
JQ="${JQ:-jq}"

# ---------- Colors ----------
ok(){ printf "\033[32m✔ %s\033[0m\n" "$*"; }
info(){ printf "\033[36mℹ %s\033[0m\n" "$*"; }
warn(){ printf "\033[33m⚠ %s\033[0m\n" "$*"; }
err(){ printf "\033[31m✘ %s\033[0m\n" "$*"; }

# ---------- Helpers ----------
_http() {
  local method="$1"; shift
  local url="$1"; shift
  local auth="${1:-}"; shift || true
  local data="${1:-}"

  local out code
  if [[ -n "$data" ]]; then
    out="$($CURL -w '\n%{http_code}' -H 'Content-Type: application/json' ${auth:+-H "Authorization: Bearer $auth"} -X "$method" "$url" -d "$data")"
  else
    out="$($CURL -w '\n%{http_code}' -H 'Content-Type: application/json' ${auth:+-H "Authorization: Bearer $auth"} -X "$method" "$url")"
  fi
  code="${out##*$'\n'}"
  body="${out%$'\n'$code}"
  printf "%s\n" "$code" "$body"
}

json_get() {
  local body="$1" path="$2"
  printf "%s" "$body" | $JQ -er "$path" 2>/dev/null || true
}

need_bin() {
  command -v "$1" >/dev/null 2>&1 || { err "Missing dependency: $1"; exit 1; }
}

# ---------- Checks ----------
need_bin curl
need_bin jq

info "Base URL: $BASE_URL"
info "Email   : $EMAIL"
info "MFA     : ${SKIP_MFA:+SKIPPED}${SKIP_MFA:+" "}"

# ---------- 1) Health ----------
read -r code body < <(_http GET "$BASE_URL/health")
if [[ "$code" =~ ^2 ]]; then
  ok "Health check OK ($code)"
else
  err "Health check failed ($code): $body"
  exit 1
fi

# ---------- 2) Register (idempotent) ----------
payload_register=$(printf '{"email":"%s","password":"%s","displayName":"%s"}' "$EMAIL" "$PASSWORD" "$DISPLAY_NAME")
read -r code body < <(_http POST "$BASE_URL/auth/register" "" "$payload_register")
if [[ "$code" == "201" || "$code" == "200" ]]; then
  ok "Register OK ($code)"
elif [[ "$code" == "409" || "$code" == "400" ]]; then
  warn "Register skipped ($code) -> likely already exists"
else
  err "Register failed ($code): $body"
  exit 1
fi

# ---------- 3) Login (initial) ----------
payload_login=$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")
read -r code body < <(_http POST "$BASE_URL/auth/login" "" "$payload_login")

if ! [[ "$code" =~ ^2 ]]; then
  err "Login failed ($code): $body"
  exit 1
fi

mfa_enabled=$(json_get "$body" '.user.mfaEnabled // .mfaEnabled // false')
access=$(json_get "$body" '.tokens.access // .access')
refresh=$(json_get "$body" '.tokens.refresh // .refresh')
login_challenge=$(json_get "$body" '.loginToken // empty')
mfa_required=$(json_get "$body" '.mfaRequired // false')

if [[ -n "$access" && -n "$refresh" && "$mfa_required" != "true" ]]; then
  ok "Login OK (no MFA required)"
else
  warn "Login indicates MFA flow (mfaEnabled=$mfa_enabled, mfaRequired=$mfa_required)"
fi

# ---------- 4) /users/me with whatever access we have ----------
if [[ -n "${access:-}" ]]; then
  read -r code body_me < <(_http GET "$BASE_URL/users/me" "$access")
  if [[ "$code" =~ ^2 ]]; then
    ok "/users/me accessible with access token"
  else
    warn "/users/me failed with access ($code): $body_me"
  fi
fi

# ---------- 5) MFA setup/enable (optional) ----------
totp_secret=""
if [[ "$SKIP_MFA" != "1" ]]; then
  if [[ -n "$MFA_SECRET" ]]; then
    totp_secret="$MFA_SECRET"
    info "Using provided MFA_SECRET"
  else
    # Try /auth/mfa/setup to get a secret
    if [[ -n "${access:-}" ]]; then
      read -r code body_mfa_setup < <(_http POST "$BASE_URL/auth/mfa/setup" "$access" "{}")
      if [[ "$code" =~ ^2 ]]; then
        totp_secret=$(json_get "$body_mfa_setup" '.secret // .base32 // empty')
        if [[ -n "$totp_secret" ]]; then
          ok "MFA setup returned a secret"
        else
          warn "MFA setup success but secret not found in payload"
        fi
      else
        warn "MFA setup endpoint not available or failed ($code)"
      fi
    fi
  fi

  if [[ -n "$totp_secret" ]]; then
    if command -v oathtool >/dev/null 2>&1; then
      totp_code="$(oathtool --totp -b "$totp_secret")"
      info "Generated TOTP code via oathtool"
    else
      warn "oathtool not found: skipping MFA enable/verify"
      totp_code=""
    fi

    if [[ -n "$totp_code" && -n "${access:-}" ]]; then
      # Try enabling MFA
      read -r code body_mfa_enable < <(_http POST "$BASE_URL/auth/mfa/enable" "$access" "$(printf '{"totpCode":"%s"}' "$totp_code")")
      if [[ "$code" =~ ^2 ]]; then
        ok "MFA enabled"
        mfa_enabled="true"
      else
        warn "MFA enable failed ($code): $body_mfa_enable"
      fi
    fi
  fi
fi

# ---------- 6) Login WITH MFA (both paths supported) ----------
if [[ "$mfa_enabled" == "true" || "$mfa_required" == "true" ]]; then
  # get a fresh TOTP code if we have a secret
  if [[ -n "$totp_secret" && $(command -v oathtool >/dev/null 2>&1; echo $?) -eq 0 ]]; then
    totp_code="$(oathtool --totp -b "$totp_secret")"
  else
    totp_code=""
  fi

  # Path A: /auth/login with totpCode
  payload_login_mfa=$(printf '{"email":"%s","password":"%s","totpCode":"%s"}' "$EMAIL" "$PASSWORD" "${totp_code:-000000}")
  read -r code body_login_mfa < <(_http POST "$BASE_URL/auth/login" "" "$payload_login_mfa")

  if [[ "$code" =~ ^2 ]]; then
    access=$(json_get "$body_login_mfa" '.tokens.access // .access')
    refresh=$(json_get "$body_login_mfa" '.tokens.refresh // .refresh')
    if [[ -n "$access" && -n "$refresh" ]]; then
      ok "Login with MFA (inline totpCode) OK"
    else
      warn "Login MFA OK but tokens missing"
    fi
  else
    warn "Login with inline totpCode failed ($code), trying verify flow"
    # Path B: challenge + /auth/mfa/verify
    if [[ -z "${login_challenge:-}" ]]; then
      # obtain a new loginToken if not kept
      read -r c b < <(_http POST "$BASE_URL/auth/login" "" "$payload_login")
      login_challenge=$(json_get "$b" '.loginToken // empty')
    fi
    if [[ -n "$login_challenge" && -n "$totp_code" ]]; then
      payload_verify=$(printf '{"loginToken":"%s","totpCode":"%s"}' "$login_challenge" "$totp_code")
      read -r code body_verify < <(_http POST "$BASE_URL/auth/mfa/verify" "" "$payload_verify")
      if [[ "$code" =~ ^2 ]]; then
        access=$(json_get "$body_verify" '.tokens.access // .access')
        refresh=$(json_get "$body_verify" '.tokens.refresh // .refresh')
        if [[ -n "$access" && -n "$refresh" ]]; then
          ok "MFA verify flow OK"
        else
          err "MFA verify OK but tokens missing"
          exit 1
        fi
      else
        err "MFA verify failed ($code): $body_verify"
        exit 1
      fi
    else
      warn "No loginToken or TOTP available; cannot test verify flow"
    fi
  fi
fi

# ---------- 7) /auth/refresh ----------
if [[ -n "${refresh:-}" ]]; then
  read -r code body_refresh < <(_http POST "$BASE_URL/auth/refresh" "" "$(printf '{"refresh":"%s"}' "$refresh")")
  if [[ "$code" =~ ^2 ]]; then
    new_access=$(json_get "$body_refresh" '.tokens.access // .access')
    new_refresh=$(json_get "$body_refresh" '.tokens.refresh // .refresh')
    if [[ -n "$new_access" ]]; then
      access="$new_access"
      refresh="${new_refresh:-$refresh}"
      ok "Refresh OK -> new access acquired"
    else
      warn "Refresh OK but access missing"
    fi
  else
    err "Refresh failed ($code): $body_refresh"
    exit 1
  fi
else
  warn "Refresh token not available; skipping /auth/refresh"
fi

# ---------- 8) /users/me (protected) ----------
if [[ -n "${access:-}" ]]; then
  read -r code body_me2 < <(_http GET "$BASE_URL/users/me" "$access")
  if [[ "$code" =~ ^2 ]]; then
    user_id=$(json_get "$body_me2" '.id // .user.id // empty')
    ok "/users/me OK (id=${user_id:-?})"
  else
    err "/users/me failed with refreshed access ($code): $body_me2"
    exit 1
  fi
fi

# ---------- 9) Negative tests ----------
# 9a) Wrong password
payload_bad_login=$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "WRONG$PASSWORD")
read -r code body_bad < <(_http POST "$BASE_URL/auth/login" "" "$payload_bad_login")
if [[ "$code" == "401" || "$code" == "400" ]]; then
  ok "Negative case (wrong password) -> $code"
else
  warn "Unexpected code for wrong password: $code"
fi

# 9b) Bad token on /users/me
read -r code body_bad2 < <(_http GET "$BASE_URL/users/me" "BAD.TOKEN.HERE")
if [[ "$code" == "401" || "$code" == "403" ]]; then
  ok "Negative case (bad token) -> $code"
else
  warn "Unexpected code for bad token on /users/me: $code"
fi

echo
ok "All auth tests completed"
