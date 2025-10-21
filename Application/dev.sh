#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
#  🚀 LockFit Development Launcher
# ═══════════════════════════════════════════════════════════════

readonly ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly BACK_DIR="$ROOT_DIR/Backend"
readonly FRONT_DIR="$ROOT_DIR/Frontend"
readonly BACK_ENV_LOCAL="$BACK_DIR/.env"
readonly BACK_ENV_DOCKER="$BACK_DIR/.env.docker"
readonly FRONT_ENV="$FRONT_DIR/.env"
readonly LOG_FILE="/tmp/cloudflared.lockfit.log"

# ─────────────────────────────────────────────────────────────
#  Configuration Flags
# ─────────────────────────────────────────────────────────────
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
    -h|--help)
      cat << EOF
Usage: $0 [OPTIONS]

Options:
  --local-db      Force l'utilisation d'une base de données locale
  --no-expo       Ne pas démarrer Expo (arrêt après le backend)
  --no-tunnel     Désactiver le tunnel Cloudflare
  --offline       Mode offline pour Expo (LAN uniquement)
  --lan           Forcer le mode LAN
  --host-ip=IP    Spécifier l'IP hôte pour le LAN
  --no-migrate    Skip les migrations Prisma
  -h, --help      Afficher cette aide

Exemples:
  $0                    # Lancement standard (Docker + .env.docker)
  $0 --local-db         # Avec .env local
  $0 --no-tunnel --lan  # Mode LAN sans tunnel
EOF
      exit 0
      ;;
    *)
      echo "⚠️  Option inconnue: $arg (utilisez --help)" >&2
      ;;
  esac
done

# ─────────────────────────────────────────────────────────────
#  Helper Functions
# ─────────────────────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }
die() { echo "❌ $*" >&2; exit 1; }
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

  for i in $(seq 1 "$max_attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      success "$service_name est prêt"
      return 0
    fi
    [ "$i" -eq 30 ] && warn "Toujours en attente après 30s..."
    sleep 1
  done
  return 1
}

# ─────────────────────────────────────────────────────────────
#  Dependency Checks
# ─────────────────────────────────────────────────────────────
log_section "🔍 Vérification des dépendances"

if have docker; then
  DC="docker compose"
elif have docker-compose; then
  DC="docker-compose"
else
  die "Docker n'est pas installé"
fi

for bin in curl grep sed awk; do
  have "$bin" || die "Commande manquante: $bin"
done

if [ "$NO_TUNNEL" -eq 0 ]; then
  have cloudflared || die "cloudflared manquant (installez-le: sudo apt install cloudflared)"
fi

success "Toutes les dépendances sont présentes"

# ─────────────────────────────────────────────────────────────
#  Environment Setup
# ─────────────────────────────────────────────────────────────
log_section "⚙️  Configuration de l'environnement"

# Choisir le bon fichier .env
if [ "$FORCE_LOCAL_DB" -eq 1 ] || [ ! -f "$BACK_ENV_DOCKER" ]; then
  BACK_ENV="$BACK_ENV_LOCAL"
  info "Utilisation de .env (exécution locale)"
else
  BACK_ENV="$BACK_ENV_DOCKER"
  info "Utilisation de .env.docker (conteneurs Docker)"
fi

# Vérifier que le fichier choisi existe
[ -f "$BACK_ENV" ] || die "Fichier backend env manquant: $BACK_ENV"

# Extraire PORT et DATABASE_URL
PORT="$(grep -E '^PORT=' "$BACK_ENV" | tail -1 | cut -d= -f2 || echo "3001")"
PORT="${PORT:-3001}"
DBURL="$(grep -E '^DATABASE_URL=' "$BACK_ENV" | tail -1 | cut -d= -f2- || true)"
[ -n "$DBURL" ] || die "DATABASE_URL absent dans $BACK_ENV"

# Déterminer si on a besoin d'une DB locale
NEED_LOCAL_DB="$FORCE_LOCAL_DB"
echo "$DBURL" | grep -q '@db:' && NEED_LOCAL_DB=1

echo "📁 Répertoire   : $ROOT_DIR"
echo "🧩 Backend .env : $BACK_ENV"
echo "🌐 Port API     : $PORT"
echo "🗄️  Base de données: $([ "$NEED_LOCAL_DB" -eq 1 ] && echo 'locale (Docker)' || echo 'distante (Neon/Supabase)')"

# Fichiers compose (base + éventuel override)
COMPOSE_FILES="-f \"$ROOT_DIR/docker-compose.yml\""
COMPOSE_FLAGS=""

# Si DB hébergée : créer un override Compose éphémère qui retire depends_on: db
OVERRIDE_FILE=""
if [ "$NEED_LOCAL_DB" -eq 0 ]; then
  OVERRIDE_FILE="$(mktemp)"
  cat > "$OVERRIDE_FILE" <<'YAML'
services:
  backend:
    # Supprime toute dépendance à "db" en mode hébergé
    depends_on: []
YAML
  COMPOSE_FILES="$COMPOSE_FILES -f \"$OVERRIDE_FILE\""
else
  COMPOSE_FLAGS="--profile local-db"
fi

# Fonction d'appel Compose avec le bon fichier .env
compose() {
  if [ "$BACK_ENV" = "$BACK_ENV_DOCKER" ]; then
    # shellcheck disable=SC2086
    eval $DC $COMPOSE_FILES $COMPOSE_FLAGS --env-file "$BACK_ENV_DOCKER" "$@"
  else
    # shellcheck disable=SC2086
    eval $DC $COMPOSE_FILES $COMPOSE_FLAGS "$@"
  fi
}

# Nettoyage à la sortie
trap '[ -n "$OVERRIDE_FILE" ] && rm -f "$OVERRIDE_FILE" 2>/dev/null || true' EXIT

# ─────────────────────────────────────────────────────────────
#  Database Setup (si locale)
# ─────────────────────────────────────────────────────────────
if [ "$NEED_LOCAL_DB" -eq 1 ]; then
  log_section "🗄️  Démarrage de la base de données locale"

  compose up -d db

  info "Attente de la disponibilité de PostgreSQL..."
  for i in {1..30}; do
    if compose exec -T db pg_isready -U postgres -h localhost >/dev/null 2>&1; then
      success "Base de données prête"
      break
    fi
    [ "$i" -eq 30 ] && die "La base de données ne répond pas après 30s"
    sleep 1
  done
fi

# ─────────────────────────────────────────────────────────────
#  Backend Build
# ─────────────────────────────────────────────────────────────
log_section "🏗️  Construction de l'image backend"

compose build backend >/dev/null 2>&1 || die "Échec du build backend"
success "Image backend construite"

# ─────────────────────────────────────────────────────────────
#  Database Migrations
# ─────────────────────────────────────────────────────────────
if [ "$NO_MIGRATE" -eq 0 ]; then
  log_section "🗂️  Migrations Prisma"

  OK=0
  for i in {1..20}; do
    if compose run --rm -e DATABASE_URL="$DBURL" backend npx prisma migrate deploy; then
      OK=1
      success "Migrations appliquées"
      break
    fi
    [ "$((i % 5))" -eq 0 ] && info "Tentative $i/20..."
    sleep 2
  done

  if [ "$OK" -eq 0 ]; then
    warn "migrate deploy KO → fallback prisma db push"
    compose run --rm -e DATABASE_URL="$DBURL" backend sh -c "npx prisma db push"
  fi
else
  info "Migrations Prisma ignorées (--no-migrate)"
fi

# ─────────────────────────────────────────────────────────────
#  Backend Startup
# ─────────────────────────────────────────────────────────────
log_section "🚀 Démarrage du backend"

compose up -d backend

info "Attente de l'API (http://localhost:$PORT/api/v1/health)..."
if ! wait_for_service "http://localhost:$PORT/api/v1/health" 90 "API Backend"; then
  echo ""
  warn "L'API ne répond pas. Derniers logs:"
  compose logs --tail=50 backend || true
  die "Échec du démarrage de l'API"
fi

# ─────────────────────────────────────────────────────────────
#  Cloudflare Tunnel
# ─────────────────────────────────────────────────────────────
TUNNEL_URL="http://localhost:$PORT"
CF_PID=""

if [ "$NO_TUNNEL" -eq 0 ]; then
  log_section "🌐 Configuration du tunnel Cloudflare"

  rm -f "$LOG_FILE"
  ( cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | tee "$LOG_FILE" ) &
  CF_PID=$!
  trap 'kill "$CF_PID" 2>/dev/null || true; [ -n "$OVERRIDE_FILE" ] && rm -f "$OVERRIDE_FILE" 2>/dev/null || true' EXIT

  info "Attente de l'URL trycloudflare.com..."
  for i in $(seq 1 40); do
    if grep -qE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null; then
      TUNNEL_URL="$(grep -m1 -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE")"
      success "Tunnel établi: $TUNNEL_URL"
      break
    fi
    [ "$i" -eq 40 ] && die "Impossible d'établir le tunnel. Voir: $LOG_FILE"
    sleep 1
  done

  if ! echo "$TUNNEL_URL" | grep -q 'trycloudflare.com'; then
    warn "Pas d'URL tunnel détectée"
    tail -n 20 "$LOG_FILE" || true
    die "Échec du tunnel Cloudflare"
  fi
fi

# ─────────────────────────────────────────────────────────────
#  Frontend Configuration
# ─────────────────────────────────────────────────────────────
log_section "📝 Configuration du frontend"

mkdir -p "$FRONT_DIR"
printf "EXPO_PUBLIC_API_URL=%s/api/v1\n" "$TUNNEL_URL" > "$FRONT_ENV"
success "Fichier $FRONT_ENV créé"
cat "$FRONT_ENV"

if [ "$NO_EXPO" -eq 1 ]; then
  echo ""
  success "Mode --no-expo activé"
  info "Backend disponible sur: $TUNNEL_URL/api/v1"
  info ""
  info "Pour tester l'API:"
  echo "  curl $TUNNEL_URL/api/v1/health"
  exit 0
fi

# ─────────────────────────────────────────────────────────────
#  Expo Startup
# ─────────────────────────────────────────────────────────────
log_section "📱 Démarrage d'Expo"

cd "$FRONT_DIR"

if [ "$OFFLINE" -eq 1 ] || [ "$LAN" -eq 1 ]; then
  EXPO_ARGS="--lan -c"

  if [ -z "$HOST_IP" ]; then
    if command -v powershell.exe >/dev/null 2>&1; then
      HOST_IP="$(powershell.exe -NoProfile -Command \
        "(Get-NetIPAddress -AddressFamily IPv4 | ? { \$_.IPAddress -match '^(10\\.|172\\.|192\\.168\\.)' } | select -First 1 -ExpandProperty IPAddress)" \
        | tr -d '\r')"
    fi
  fi

  if [ -n "$HOST_IP" ]; then
    info "Mode LAN avec IP: $HOST_IP"
    REACT_NATIVE_PACKAGER_HOSTNAME="$HOST_IP" EXPO_OFFLINE=1 npx expo start $EXPO_ARGS
  else
    info "Mode LAN (IP par défaut)"
    EXPO_OFFLINE=1 npx expo start $EXPO_ARGS
  fi
else
  info "Tentative de démarrage avec tunnel..."
  npx expo start --tunnel -c || {
    warn "Tunnel Expo non disponible, basculement en mode LAN"
    EXPO_OFFLINE=1 npx expo start --lan -c
  }
fi
