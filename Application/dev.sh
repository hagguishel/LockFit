#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACK_DIR="$ROOT_DIR/Backend"
FRONT_DIR="$ROOT_DIR/Frontend"
BACK_ENV="$BACK_DIR/.env"
FRONT_ENV="$FRONT_DIR/.env"
LOG="/tmp/cloudflared.lockfit.log"

# ----------------- Flags -----------------
FORCE_LOCAL_DB=0
NO_EXPO=0
NO_TUNNEL=0
OFFLINE=0
LAN=0
HOST_IP=""
NO_MIGRATE=0

for arg in "${@:-}"; do
  case "$arg" in
    --local-db)   FORCE_LOCAL_DB=1 ;;
    --no-expo)    NO_EXPO=1 ;;
    --no-tunnel)  NO_TUNNEL=1 ;;
    --offline)    OFFLINE=1 ;;
    --lan)        LAN=1 ;;
    --host-ip=*)  HOST_IP="${arg#*=}" ;;
    --no-migrate) NO_MIGRATE=1 ;;
  esac
done

# ----------------- Utils -----------------
have() { command -v "$1" >/dev/null 2>&1; }
die() { echo "❌ $*" >&2; exit 1; }

if have docker; then DC="docker compose"; elif have docker-compose; then DC="docker-compose"; else die "Docker non trouvé."; fi
for bin in curl grep sed awk; do have "$bin" || die "Commande manquante: $bin"; done
if [ "$NO_TUNNEL" -eq 0 ]; then have cloudflared || die "cloudflared manquant (sudo apt install cloudflared)"; fi

# ----------------- Checks -----------------
[ -f "$BACK_ENV" ] || die "Backend env manquant: $BACK_ENV"
PORT="$(grep -E '^PORT=' "$BACK_ENV" | tail -1 | cut -d= -f2 || true)"; PORT="${PORT:-3001}"
DBURL="$(grep -E '^DATABASE_URL=' "$BACK_ENV" | tail -1 | cut -d= -f2- || true)"
[ -n "$DBURL" ] || die "DATABASE_URL absent dans $BACK_ENV"

NEED_LOCAL_DB="$FORCE_LOCAL_DB"; if echo "$DBURL" | grep -q '@db:'; then NEED_LOCAL_DB=1; fi

echo "📁 $ROOT_DIR"
echo "🧩 Backend env : $BACK_ENV"
echo "🌐 API port     : $PORT"
echo "🗄️  Base        : $( [ "$NEED_LOCAL_DB" -eq 1 ] && echo 'locale (profile local-db)' || echo 'partagée (Neon/Supabase)' )"

# ----------------- DB locale (si besoin) -----------------
if [ "$NEED_LOCAL_DB" -eq 1 ]; then
  echo "▶️  Docker: DB locale …"
  $DC --profile local-db up -d db
  # petit wait pour la DB
  echo "⏳ Attente DB (pg_isready)…"
  for i in {1..30}; do
    if $DC exec -T db pg_isready -U postgres -h localhost >/dev/null 2>&1; then
      echo "✅ DB prête"
      break
    fi
    sleep 1
  done
fi

# ----------------- Build backend (pour avoir Prisma CLI) -----------------
echo "🏗️  Build image backend (pour Prisma CLI)…"
$DC build backend >/dev/null

# ----------------- Prisma migrate (avant de lancer Nest) -----------------
if [ "$NO_MIGRATE" -eq 0 ]; then
  echo "🗂️  Prisma: migrate deploy (avec retry)…"
  OK=0
  for i in {1..20}; do
    if $DC run --rm backend npx prisma migrate deploy; then
      OK=1; echo "✅ Migrations appliquées"; break
    fi
    echo "…retry $i/20 (DB pas encore prête ?)"
    sleep 2
  done
  if [ "$OK" -eq 0 ]; then
    echo "⚠️  migrate deploy KO → fallback prisma db push"
    $DC run --rm backend npx prisma db push
  fi
else
  echo "⏭️  --no-migrate : skip des migrations"
fi

# ----------------- Backend -----------------
echo "▶️  Docker: backend …"
$DC up -d backend

echo "⏳ Attente API http://localhost:$PORT/api/v1/health …"
for i in {1..90}; do
  if curl -fsS "http://localhost:$PORT/api/v1/health" >/dev/null; then
    echo "✅ API OK"
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && echo "…toujours en attente (30s)"
done
curl -fsS "http://localhost:$PORT/api/v1/health" >/dev/null || {
  echo "❌ L’API ne répond pas. Derniers logs backend :"
  $DC logs --tail=120 backend || true
  exit 1
}

# ----------------- Tunnel API (Cloudflare) -----------------
TUNNEL_URL="http://localhost:$PORT"
CF_PID=""
if [ "$NO_TUNNEL" -eq 0 ]; then
  echo "▶️  Cloudflare → http://localhost:$PORT"
  rm -f "$LOG"
  ( cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | tee "$LOG" ) &
  CF_PID=$!
  trap 'kill "$CF_PID" 2>/dev/null || true' EXIT

  echo "⏳ Attente URL trycloudflare.com…"
  for _ in {1..40}; do
    if grep -qE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG"; then
      TUNNEL_URL="$(grep -m1 -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG")"
      break
    fi
    sleep 1
  done

  if ! echo "$TUNNEL_URL" | grep -q 'trycloudflare.com'; then
    echo "❌ Pas d’URL tunnel détectée."
    tail -n +1 "$LOG" || true
    exit 1
  fi
  echo "🌐 Tunnel API: $TUNNEL_URL"
fi

# ----------------- .env Frontend -----------------
mkdir -p "$FRONT_DIR"
printf "EXPO_PUBLIC_API_URL=%s/api/v1\n" "$TUNNEL_URL" > "$FRONT_ENV"
echo "✍️  Écrit $FRONT_ENV"
cat "$FRONT_ENV"

[ "$NO_EXPO" -eq 1 ] && { echo "ℹ️  --no-expo : arrêt ici. API = $TUNNEL_URL/api/v1"; exit 0; }

# ----------------- Expo -----------------
echo "▶️  Expo …"
cd "$FRONT_DIR"

if [ "$OFFLINE" -eq 1 ]; then
  EXPO_OFFLINE=1
  EXPO_ARGS="--lan -c"
  if [ -z "$HOST_IP" ] && [ "$LAN" -eq 1 ]; then
    if command -v powershell.exe >/dev/null 2>&1; then
      HOST_IP="$(powershell.exe -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | ? { \$_.IPAddress -match '^(10\\.|172\\.|192\\.168\\.)' } | sort -Property PrefixLength | select -First 1 -ExpandProperty IPAddress)" | tr -d '\r')"
    fi
  fi
  if [ -n "$HOST_IP" ]; then
    echo "📡 LAN via $HOST_IP"
    REACT_NATIVE_PACKAGER_HOSTNAME="$HOST_IP" EXPO_OFFLINE=1 npx expo start $EXPO_ARGS
  else
    echo "ℹ️  Pas d’IP hôte spécifiée/détectée. LAN par défaut."
    EXPO_OFFLINE=1 npx expo start $EXPO_ARGS
  fi
else
  npx expo start --tunnel -c || EXPO_OFFLINE=1 npx expo start --lan -c
fi
