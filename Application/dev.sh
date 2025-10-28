#!/usr/bin/env bash
set -e

# Script LockFit: backend (Docker) + tunnel Cloudflare + Expo
echo "🚀 Démarrage de LockFit avec tunnel..."

# Récupération des chemins
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACK_DIR="$ROOT_DIR/Backend"
FRONT_DIR="$ROOT_DIR/Frontend"

# Configuration backend (.env ou .env.docker)
if [ -f "$BACK_DIR/.env" ]; then
    BACK_ENV="$BACK_DIR/.env"
elif [ -f "$BACK_DIR/.env.docker" ]; then
    BACK_ENV="$BACK_DIR/.env.docker"
else
    echo "❌ Fichier .env manquant dans Backend/"
    exit 1
fi

# Récupération du port backend (défaut: 3001)
PORT=$(grep "^PORT=" "$BACK_ENV" 2>/dev/null | cut -d= -f2)
PORT=${PORT:-3001}

# Détection DB locale vs distante
USE_LOCAL_DB=0
if grep -q "localhost:5433\|@db:5432" "$BACK_ENV" 2>/dev/null; then
    USE_LOCAL_DB=1
fi

echo "📁 Dossier: $ROOT_DIR"
echo "🌐 Port API: $PORT"
if [ $USE_LOCAL_DB -eq 1 ]; then
    echo "🗄️  Mode: Base de données locale (PostgreSQL)"
else
    echo "🗄️  Mode: Base de données distante (Supabase/Neon)"
fi

# 1. Nettoyage
echo ""
echo "🧹 Nettoyage..."
docker compose down 2>/dev/null || true
pkill -f cloudflared 2>/dev/null || true

# 2. Démarrage du backend
echo ""
echo "▶️  Démarrage du backend..."
if [ $USE_LOCAL_DB -eq 1 ]; then
    echo "   Démarrage de PostgreSQL local + backend..."
    COMPOSE_PROFILES=local-db docker compose up -d
else
    echo "   Démarrage du backend seul..."
    docker compose up -d backend
fi

# 3. Attente que l'API réponde
echo ""
echo "⏳ Attente de l'API locale sur le port $PORT..."

# on laisse Docker respirer un peu
sleep 5

READY=0
for i in {1..30}; do
    if curl -s "http://localhost:$PORT/api/v1/health" >/dev/null 2>&1; then
        READY=1
        echo "✅ API locale prête sur le port $PORT!"
        break
    fi
    sleep 2
done

if [ $READY -ne 1 ]; then
    echo "❌ L'API ne répond pas sur le port $PORT"
    echo ""
    echo "📋 Logs du backend:"
    docker compose logs backend --tail=30
    echo ""
    echo "🔍 Ports mappés:"
    docker compose ps
    echo ""
    echo "💡 Le backend écoute sur 3001 dans le conteneur."
    echo "   Vérifie le port mapping dans docker-compose.yml."
    exit 1
fi

# 4. Démarrage du tunnel Cloudflare
echo ""
echo "🌐 Démarrage du tunnel Cloudflare..."
LOG_FILE="/tmp/cloudflared.lockfit.log"
rm -f "$LOG_FILE"

cloudflared tunnel --url "http://localhost:$PORT" > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

# fonction cleanup (ctrl+c ou sortie)
cleanup() {
    echo ""
    echo "🧹 Arrêt du tunnel..."
    kill $TUNNEL_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 5. Récupération de l'URL publique du tunnel
echo ""
echo "⏳ Récupération de l'URL publique du tunnel..."
TUNNEL_URL=""
for i in {1..30}; do
    if [ -f "$LOG_FILE" ]; then
        TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1)
        if [ -n "$TUNNEL_URL" ]; then
            echo "✅ Tunnel établi: $TUNNEL_URL"
            break
        fi
    fi
    sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Impossible d'obtenir l'URL du tunnel Cloudflare"
    echo "─── LOG CLOUDFLARE ───"
    cat "$LOG_FILE"
    echo "──────────────────────"
    exit 1
fi

# 6. Test du tunnel
echo ""
echo "🔍 Test de connexion via le tunnel..."
sleep 2
if curl -s "$TUNNEL_URL/api/v1/health" >/dev/null 2>&1; then
    echo "✅ API accessible via le tunnel !"
else
    echo "⚠️  Le tunnel répond mais /api/v1/health n'est pas encore OK via l'externe."
    echo "   (possible petit délai DNS Cloudflare)"
fi

# 7. Configuration du frontend
echo ""
echo "📝 Configuration du frontend (.env Expo)..."
echo "EXPO_PUBLIC_API_URL=$TUNNEL_URL" > "$FRONT_DIR/.env"
echo "✅ Frontend configuré avec: $TUNNEL_URL"

# 8. Récap visuel
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Configuration terminée !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 API locale      : http://localhost:$PORT"
echo "🌍 API publique    : $TUNNEL_URL"
echo "🔗 Healthcheck     : $TUNNEL_URL/api/v1/health"
echo ""
echo "👉 Cette URL est déjà écrite dans Frontend/.env"
echo "   (EXPO_PUBLIC_API_URL)"
echo ""
echo "Appuie sur Entrée pour lancer Expo..."
read -r

# 9. Lancement d'Expo
echo ""
echo "📱 Lancement d'Expo..."
cd "$FRONT_DIR"

# On tente le tunnel Expo d'abord
if npx expo start --tunnel -c; then
    echo "✅ Expo tourne avec --tunnel"
else
    echo ""
    echo "⚠️  Tunnel Expo indisponible. Fallback en mode LAN..."
    npx expo start --lan -c
fi

# 10. Tant que Expo tourne, on garde le script en vie
# ça évite que le trap cleanup tue le tunnel Cloudflare trop tôt
wait
