#!/bin/bash
set -u

info () { echo -e "• $1"; }
ok   () { echo -e "✅ $1"; }
ko   () { echo -e "❌ $1"; }

echo "=== Vérification des outils de base ==="
echo -n "Node : "; node -v 2>&1
echo -n "npm  : "; npm -v 2>&1
echo -n "Expo : "; npx -y expo --version 2>&1
echo -n "Nest : "; npx -y @nestjs/cli --version 2>&1
echo -n "Docker : "; docker --version 2>&1

# Détecte docker compose (plugin ou legacy)
if docker compose version >/dev/null 2>&1; then
  DOCOMPOSE="docker compose"
  echo -n "docker compose (plugin) : "; docker compose version
elif docker-compose --version >/dev/null 2>&1; then
  DOCOMPOSE="docker-compose"
  echo -n "docker-compose (legacy) : "; docker-compose --version
else
  DOCOMPOSE=""
  ko "docker compose/ docker-compose introuvable"
fi

echo ""
echo "=== Vérification des conteneurs ==="
if [ -n "${DOCOMPOSE}" ]; then
  ${DOCOMPOSE} ps
else
  ko "Impossible d'afficher les conteneurs (compose absent)"
fi

echo ""
echo "=== Vérification des répertoires ==="
if [ -d "lockfit-api" ] && [ -d "lockfit-app" ]; then
  ok "lockfit-api et lockfit-app sont présents"
else
  ko "Dossiers manquants (lockfit-api ou lockfit-app)"
fi

echo ""
echo "=== Back-end (lockfit-api) ==="
if [ -d "lockfit-api" ]; then
  pushd lockfit-api >/dev/null

  # package.json
  if [ -f package.json ]; then
    ok "package.json présent (API)"
  else
    ko "package.json manquant (API)"
  fi

  # .env & DATABASE_URL
  if [ -f .env ]; then
    if grep -q '^DATABASE_URL=' .env; then
      ok ".env présent (+ DATABASE_URL)"
    else
      ko ".env présent mais DATABASE_URL manquant"
    fi
  else
    ko ".env manquant"
  fi

  # Prisma
  if npx -y prisma -v >/dev/null 2>&1; then
    echo -n "Prisma : "; npx -y prisma -v | tail -n 1
    if [ -f prisma/schema.prisma ]; then
      if grep -q '^datasource ' prisma/schema.prisma && grep -q '^generator ' prisma/schema.prisma; then
        ok "schema.prisma avec datasource + generator"
      else
        ko "schema.prisma incomplet (datasource/generator ?)"
      fi
      # migration la plus récente
      if [ -d prisma/migrations ] && ls -1 prisma/migrations | grep -q .; then
        LAST_MIG=$(ls -1 prisma/migrations | tail -n 1)
        ok "migrations présentes (dernière: ${LAST_MIG})"
      else
        ko "aucune migration Prisma trouvée"
      fi
    else
      ko "prisma/schema.prisma manquant"
    fi
  else
    ko "Prisma non installé (npx prisma -v échoue)"
  fi

  # Nest local
  if [ -x node_modules/.bin/nest ]; then
    ok "Nest CLI local installé"
  else
    ko "Nest CLI local absent (node_modules/.bin/nest)"
  fi

  popd >/dev/null
else
  ko "Dossier lockfit-api introuvable"
fi

echo ""
echo "=== Front-end (lockfit-app) ==="
if [ -d "lockfit-app" ]; then
  pushd lockfit-app >/dev/null
  # Expo env public
  if [ -f .env ]; then
    if grep -q '^EXPO_PUBLIC_' .env; then
      ok ".env (Expo) présent avec variables EXPO_PUBLIC_*"
    else
      info ".env (Expo) présent (pense aux EXPO_PUBLIC_*)"
    fi
  else
    info ".env (Expo) non présent (optionnel)"
  fi
  # package.json app
  if [ -f package.json ]; then
    ok "package.json présent (App)"
  else
    ko "package.json manquant (App)"
  fi
  popd >/dev/null
else
  ko "Dossier lockfit-app introuvable"
fi

echo ""
echo "=== Réseau / Ports ==="
# Postgres port
if ss -ltn 2>/dev/null | grep -q ':5432 '; then
  ok "Port 5432 ouvert (Postgres)"
else
  ko "Port 5432 non ouvert"
fi

# API port (3000) si l'API tourne
if ss -ltn 2>/dev/null | grep -q ':3000 '; then
  ok "Port 3000 ouvert (API en cours d'exécution)"
else
  info "Port 3000 fermé (API non démarrée, normal si à l'arrêt)"
fi

echo ""
echo "=== Santé Postgres (container) ==="
if docker inspect lockfit-postgres >/dev/null 2>&1; then
  PGSTATUS=$(docker inspect -f '{{.State.Health.Status}}' lockfit-postgres 2>/dev/null || echo "unknown")
  if [ "$PGSTATUS" = "healthy" ]; then
    ok "Postgres est healthy"
  else
    ko "Postgres pas prêt (status: $PGSTATUS)"
  fi
else
  ko "Container lockfit-postgres introuvable"
fi

echo ""
echo "=== Rappel branches Git (optionnel) ==="
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Branche courante : $(git rev-parse --abbrev-ref HEAD)"
  echo "Branches locales :"
  git branch --format="  - %(refname:short)"
else
  info "Pas de repo Git détecté à cette racine"
fi

echo ""
ok "Check terminé."
