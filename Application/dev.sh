#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
#  🚀 LockFit Development Launcher (remote‑only Supabase)
#     - Utilise exclusivement la base distante (Supabase/Neon)
#     - Pré‑check de connectivité distante + erreurs claires
#     - Prisma: migrate deploy → fallback db push
# ═══════════════════════════════════════════════════════════════

readonly ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly BACK_DIR="$ROOT_DIR/Backend"
readonly FRONT_DIR="$ROOT_DIR/Frontend"
readonly BACK_ENV_LOCAL="$BACK_DIR/.env"
readonly BACK_ENV_DOCKER="$BACK_DIR/.env.docker"
readonly FRONT_ENV="$FRONT_DIR/.env"
readonly LOG_FILE="/tmp/cloudflared.lockfit.log"

# ─────────────────────────────────────────────────────────────
#  Flags
# ─────────────────────────────────────────────────────────────
NO_EXPO=0
NO_TUNNEL=0
OFFLINE=0
LAN=0
HOST_IP=""
NO_MIGRATE=0

for arg in "$@"; do
  case "$arg" in
    --no-expo)    NO_EXPO=1 ;;
    --no-tunnel)  NO_TUNNEL=1 ;;
    --offline)    OFFLINE=1 ;;
    --lan)        LAN=1 ;;
    --host-ip=*)  HOST_IP="${arg#*=}" ;;
    --no-migrate) NO_MIGRATE=1 ;;
    -h|--help)
      cat << EOF
Usage: $0 [OPTIONS]

Options:
  --no-expo         Ne pas démarrer Expo (arrêt après le backend)
  --no-tunnel       Désactiver le tunnel Cloudflare
  --offline         Mode offline pour Expo (LAN uniquement)
  --lan             Forcer le mode LAN
  --host-ip=IP      Spécifier l'IP hôte pour le LAN
  --no-migrate      Skip les migrations Prisma
  -h, --help        Afficher cette aide

Exemples:
  $0                       # Lancement standard (Supabase)
  $0 --no-tunnel --lan     # Mode LAN sans tunnel
EOF
      exit 0 ;;
    *) echo "⚠️  Option inconnue: $arg (utilisez --help)" >&2 ;;
  esac
done

# ─────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }
die() { echo -e "\n❌ $*" >&2; exit 1; }
info() { echo "ℹ️  $*"; }
success() { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }

log_section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

wait_for_service() {
  local url="$1"
  local max_attempts="${2:-60}"
  local service_name="${3:-Service}"
  
  # Délai initial pour laisser le conteneur démarrer
  info "Attente de $((5)) secondes pour le démarrage du conteneur…"
  sleep 5
  
  for i in $(seq 1 "$max_attempts"); do
    # Force IPv4 avec -4 pour éviter les problèmes IPv6
    if curl -4 -fsS "$url" >/dev/null 2>&1; then
      success "$service_name est prêt"
      return 0
    fi
    # Debug tous les 10s
    if [ $((i % 10)) -eq 0 ]; then
      warn "Toujours en attente après ${i}s... (tentative $i/$max_attempts)"
      info "Vérification de l'état du conteneur:"
      docker ps --filter name=lockfit_backend --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
    sleep 1
  done
  return 1
}

parse_db_host_port() {
  local url="$1"
  local at_part=${url#*@}
  [ "$at_part" = "$url" ] && return 1
  local host_port=${at_part%%/*}
  local host=${host_port%%:*}
  local port=${host_port#*:}
  [ "$host" = "$port" ] && port=5432
  echo "$host $port"
}

can_tcp_connect() {
  local host="$1" port="$2"
  if have nc; then
    nc -z -w 3 "$host" "$port" >/dev/null 2>&1
  else
    (exec 3<>/dev/tcp/$host/$port) >/dev/null 2>&1 || return 1
    exec 3>&- 3<&-
  fi
}

# ─────────────────────────────────────────────────────────────
#  Dépendances
# ─────────────────────────────────────────────────────────────
log_section "🔍 Vérification des dépendances"
if have docker; then DC=(docker compose); elif have docker-compose; then DC=(docker-compose); else die "Docker n'est pas installé"; fi
for bin in curl grep sed awk; do have "$bin" || die "Commande manquante: $bin"; done
if [ "$NO_TUNNEL" -eq 0 ]; then have cloudflared || die "cloudflared manquant (installez-le: sudo apt install cloudflared)"; fi
success "Toutes les dépendances sont présentes"

# ─────────────────────────────────────────────────────────────
#  Environnement
# ─────────────────────────────────────────────────────────────
log_section "⚙️  Configuration de l'environnement"
[ -f "$BACK_ENV" ] || die "Fichier backend .env manquant: $BACK_ENV"
PORT=$(grep -E '^PORT=' "$BACK_ENV" | tail -1 | cut -d= -f2 || true); PORT=${PORT:-3001}
DBURL=$(grep -E '^DATABASE_URL=' "$BACK_ENV" | tail -1 | cut -d= -f2- || true)
[ -n "$DBURL" ] || die "DATABASE_URL absent dans $BACK_ENV"

COMPOSE_FILES=(-f "$ROOT_DIR/docker-compose.yml")
COMPOSE_FLAGS=()

# Toujours sans service db local → override pour retirer depends_on
OVERRIDE_FILE="$(mktemp)"
cat > "$OVERRIDE_FILE" <<'YAML'
services:
  backend:
    depends_on: []
YAML
COMPOSE_FILES+=(-f "$OVERRIDE_FILE")
compose() { "${DC[@]}" "${COMPOSE_FILES[@]}" "${COMPOSE_FLAGS[@]}" "$@"; }

# Pré‑check connectivité distante
if hp=$(parse_db_host_port "$DBURL"); then
  host=${hp%% *}; port=${hp##* }
  info "Test de connectivité DB distante: $host:$port …"
  if ! can_tcp_connect "$host" "$port"; then
    echo ""; die "Impossible de joindre la base distante ($host:$port).
Vérifie ta connexion/pare-feu/ISP.
DATABASE_URL actuel : $DBURL"
  fi
else
  warn "Impossible d'interpréter l'URL DB. On continue tel quel."
fi

echo "📁 Répertoire   : $ROOT_DIR"
echo "🧩 Backend .env : $BACK_ENV"
echo "🌐 Port API     : $PORT"
echo "🗄️  Base de données: distante (Neon/Supabase)"

# ─────────────────────────────────────────────────────────────
#  Build backend (Prisma CLI)
# ─────────────────────────────────────────────────────────────
info "🏗️  Build image backend (pour Prisma CLI)…"
compose build backend >/dev/null || die "Échec du build backend"
success "Image backend construite"

# ─────────────────────────────────────────────────────────────
#  Migrations Prisma (distantes)
# ─────────────────────────────────────────────────────────────
if [ "$NO_MIGRATE" -eq 0 ]; then
  info "🗂️  Prisma: migrate deploy (non‑interactif)…"
  OK=0
  for i in {1..20}; do
    if DATABASE_URL="$DBURL" compose run --rm backend sh -lc 'npx --yes prisma migrate deploy --schema ./prisma/schema.prisma'; then
      OK=1; success "Migrations appliquées"; break
    fi
    [ $((i % 5)) -eq 0 ] && warn "Tentative $i/20…"
    sleep 2
  done

  if [ "$OK" -eq 0 ]; then
    warn "migrate deploy KO → fallback prisma db push"
    DATABASE_URL="$DBURL" compose run --rm backend sh -lc 'npx --yes prisma db push --schema ./prisma/schema.prisma' || die "Échec Prisma même en fallback. URL utilisée: $DBURL"
  fi
else
  info "Migrations Prisma ignorées (--no-migrate)"
fi

# ─────────────────────────────────────────────────────────────
#  Backend
# ─────────────────────────────────────────────────────────────
info "▶️  Nettoyage des conteneurs existants…"
compose down 2>/dev/null || true

# Forcer l'arrêt du conteneur backend s'il existe encore
if docker ps -a --format '{{.Names}}' | grep -q "^lockfit_backend$"; then
  info "Arrêt forcé du conteneur lockfit_backend…"
  docker stop lockfit_backend 2>/dev/null || true
  docker rm lockfit_backend 2>/dev/null || true
fi

info "▶️  Docker: backend …"
compose up -d backend
info "⏳ Attente de l'API (http://localhost:$PORT/api/v1/health)…"
if ! wait_for_service "http://localhost:$PORT/api/v1/health" 90 "API Backend"; then
  echo ""
  echo "❌ L'API ne répond pas après 90s. Derniers logs backend :"
  compose logs --tail=120 backend || true
  die "Impossible de démarrer l'API Backend"
fi

# ─────────────────────────────────────────────────────────────
#  Cloudflare Tunnel
# ─────────────────────────────────────────────────────────────
TUNNEL_URL="http://localhost:$PORT"
CF_PID=""
cleanup() {
  # Nettoyage à la sortie (remote-only)
  [ -n "$CF_PID" ] && kill "$CF_PID" 2>/dev/null || true
  [ -n "$OVERRIDE_FILE" ] && rm -f "$OVERRIDE_FILE" 2>/dev/null || true
}
trap cleanup EXIT

if [ "$NO_TUNNEL" -eq 0 ]; then
  log_section "🌐 Configuration du tunnel Cloudflare"
  rm -f "$LOG_FILE"
  ( cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | tee "$LOG_FILE" ) &
  CF_PID=$!

  info "⏳ Attente de l'URL trycloudflare.com…"
  for i in $(seq 1 40); do
    if grep -qE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null; then
      TUNNEL_URL="$(grep -m1 -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE")"
      success "Tunnel établi: $TUNNEL_URL"; break
    fi
    sleep 1
    [ "$i" -eq 40 ] && die "Impossible d'établir le tunnel. Voir: $LOG_FILE"
  done
else
  info "Tunnel Cloudflare désactivé (--no-tunnel)"
fi

# ─────────────────────────────────────────────────────────────
#  Frontend
# ─────────────────────────────────────────────────────────────
log_section "📝 Configuration du frontend"
mkdir -p "$FRONT_DIR"
printf "EXPO_PUBLIC_API_URL=%s\n" "$TUNNEL_URL" > "$FRONT_ENV"
success "Fichier $FRONT_ENV créé"
cat "$FRONT_ENV"

if [ "$NO_EXPO" -eq 1 ]; then
  echo ""; info "Mode --no-expo activé. Backend disponible sur: $TUNNEL_URL/api/v1"; exit 0
fi

# ─────────────────────────────────────────────────────────────
#  Expo
# ─────────────────────────────────────────────────────────────
log_section "📱 Démarrage d'Expo"
cd "$FRONT_DIR"
if [ "$OFFLINE" -eq 1 ] || [ "$LAN" -eq 1 ]; then
  EXPO_ARGS="--lan -c"
  if [ -z "$HOST_IP" ] && command -v powershell.exe >/dev/null 2>&1; then
    HOST_IP="$(powershell.exe -NoProfile -Command \
      "(Get-NetIPAddress -AddressFamily IPv4 | ? { \$_.IPAddress -match '^(10\.|172\.|192\.168\.)' } | select -First 1 -ExpandProperty IPAddress)" \
      | tr -d '\r')"
  fi
  if [ -n "$HOST_IP" ]; then
    info "Mode LAN avec IP: $HOST_IP"
    REACT_NATIVE_PACKAGER_HOSTNAME="$HOST_IP" EXPO_OFFLINE=1 npx expo start $EXPO_ARGS
  else
    info "Mode LAN (IP par défaut)"; EXPO_OFFLINE=1 npx expo start $EXPO_ARGS
  fi
else
  info "Tentative de démarrage avec tunnel…"
  npx expo start --tunnel -c || { warn "Tunnel Expo non disponible, basculement en mode LAN"; EXPO_OFFLINE=1 npx expo start --lan -c; }
fi