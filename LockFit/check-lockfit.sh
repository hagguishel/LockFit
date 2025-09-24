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
    # Scripts NPM essentiels
    grep -q '"start:dev"' package.json && ok "script start:dev présent" || ko "script start:dev manquant"
    grep -q '"start"'     package.json && ok "script start présent"     || ko "script start manquant"
    grep -q '"build"'     package.json && ok "script build présent"     || ko "script build manquant"
    # main attendu
    grep -q '"main": *"dist/principal.js"' package.json && ok "main=dist/principal.js configuré" || info "main non réglé sur dist/principal.js (optionnel)"
  else
    ko "package.json manquant (API)"
  fi

  # tsconfig.json (fichier, pas dossier)
  if [ -f tsconfig.json ] && [ ! -d tsconfig.json ]; then
    ok "tsconfig.json présent (fichier)"
    for key in experimentalDecorators emitDecoratorMetadata moduleResolution outDir; do
      grep -q "\"$key\"" tsconfig.json && ok "tsconfig: $key configuré" || info "tsconfig: $key manquant (à vérifier)"
    done
  else
    ko "tsconfig.json absent ou est un dossier (doit être un fichier)"
  fi

  # Dépendances clés
  [ -d node_modules/@nestjs/core ]       && ok "@nestjs/core installé"          || ko "@nestjs/core absent"
  [ -d node_modules/class-validator ]    && ok "class-validator installé"       || ko "class-validator absent"
  [ -d node_modules/class-transformer ]  && ok "class-transformer installé"     || ko "class-transformer absent"
  [ -d node_modules/reflect-metadata ]   && ok "reflect-metadata installé"      || ko "reflect-metadata absent"
  [ -d node_modules/@prisma/client ]     && ok "@prisma/client installé"        || ko "@prisma/client absent"
  [ -d node_modules/ts-node ] || [ -f node_modules/.bin/ts-node ] && ok "ts-node installé (dev)" || ko "ts-node absent (dev)"

  # .env & DATABASE_URL
  if [ -f .env ]; then
    if grep -q '^DATABASE_URL=' .env; then ok ".env présent (+ DATABASE_URL)"; else ko ".env présent mais DATABASE_URL manquant"; fi
  else
    ko ".env manquant"
  fi

  # Prisma
  if npx -y prisma -v >/dev/null 2>&1; then
    echo -n "Prisma : "; npx -y prisma -v | tail -n 1
    if [ -f prisma/schema.prisma ]; then
      (grep -q '^datasource ' prisma/schema.prisma && grep -q '^generator ' prisma/schema.prisma) \
        && ok "schema.prisma avec datasource + generator" || ko "schema.prisma incomplet (datasource/generator ?)"
      if [ -d prisma/migrations ] && ls -1 prisma/migrations | grep -q .; then
        LAST_MIG=$(ls -1 prisma/migrations | tail -n 1)
        ok "migrations présentes (dernière: ${LAST_MIG})"
      else
        info "aucune migration Prisma trouvée (ok si WIP)"
      fi
    else
      ko "prisma/schema.prisma manquant"
    fi
  else
    ko "Prisma non installé (npx prisma -v échoue)"
  fi

  # Bootstrap Nest: principal.ts
  if [ -f src/principal.ts ]; then
    ok "src/principal.ts présent"
    (grep -q 'ValidationPipe' src/principal.ts && grep -q 'setGlobalPrefix' src/principal.ts) \
      && ok "ValidationPipe + prefix API configurés" || info "principal.ts : vérifier ValidationPipe et setGlobalPrefix"
  else
    ko "src/principal.ts manquant"
  fi

  # PrismaModule/Service
  if [ -f src/prisma/prisma.module.ts ] && [ -f src/prisma/prisma.service.ts ]; then
    ok "PrismaModule + PrismaService présents"
  else
    ko "PrismaModule/Service manquants (src/prisma/*)"
  fi

  # Endpoint santé
  if [ -f src/commun/health.controller.ts ]; then
    ok "HealthController présent"
  else
    info "HealthController absent (src/commun/health.controller.ts)"
  fi

  # DTO Workouts
  DTO_OK=1
  for f in src/workouts/dto/create-workout.dto.ts src/workouts/dto/update-workout.dto.ts src/workouts/dto/range-query.dto.ts; do
    if [ -f "$f" ]; then ok "DTO présent: $f"; else ko "DTO manquant: $f"; DTO_OK=0; fi
  done
  [ $DTO_OK -eq 1 ] && ok "Tous les DTO Workouts sont présents"

  popd >/dev/null
else
  ko "Dossier lockfit-api introuvable"
fi

echo ""
echo "=== Front-end (lockfit-app) ==="
if [ -d "lockfit-app" ]; then
  pushd lockfit-app >/dev/null
  if [ -f .env ]; then
    grep -q '^EXPO_PUBLIC_' .env && ok ".env (Expo) présent avec variables EXPO_PUBLIC_*" || info ".env (Expo) présent (pense aux EXPO_PUBLIC_*)"
  else
    info ".env (Expo) non présent (optionnel)"
  fi
  [ -f package.json ] && ok "package.json présent (App)" || ko "package.json manquant (App)"
  popd >/dev/null
else
  ko "Dossier lockfit-app introuvable"
fi

echo ""
echo "=== Réseau / Ports ==="
ss -ltn 2>/dev/null | grep -q ':5432 ' && ok "Port 5432 ouvert (Postgres)" || ko "Port 5432 non ouvert"
if ss -ltn 2>/dev/null | grep -q ':3000 '; then
  ok "Port 3000 ouvert (API en cours d'exécution)"
  if command -v curl >/dev/null 2>&1; then
    RESP=$(curl -s http://localhost:3000/api/v1/health || true)
    echo "$RESP" | grep -q '"ok": *true' && ok "Endpoint /api/v1/health répond ✅" || info "Endpoint /health inattendu (réponse: $RESP)"
  fi
else
  info "Port 3000 fermé (API non démarrée, normal si à l'arrêt)"
fi

echo ""
echo "=== Santé Postgres (container) ==="
if docker inspect lockfit-postgres >/dev/null 2>&1; then
  PGSTATUS=$(docker inspect -f '{{.State.Health.Status}}' lockfit-postgres 2>/dev/null || echo "unknown")
  [ "$PGSTATUS" = "healthy" ] && ok "Postgres est healthy" || ko "Postgres pas prêt (status: $PGSTATUS)"
else
  info "Container lockfit-postgres introuvable (ok si DB locale)"
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
