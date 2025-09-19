#!/bin/bash

echo "=== Vérification des outils de base ==="
echo -n "Node : "; node -v
echo -n "npm  : "; npm -v
echo -n "Expo : "; npx expo --version
echo -n "Nest : "; npx @nestjs/cli --version
echo -n "Docker : "; docker --version
echo -n "docker-compose : "; docker-compose --version

echo ""
echo "=== Vérification des conteneurs ==="
docker-compose ps

echo ""
echo "=== Vérification des répertoires ==="
if [ -d "lockfit-api" ] && [ -d "lockfit-app" ]; then
  echo "✅ lockfit-api et lockfit-app sont présents"
else
  echo "❌ dossiers manquants (lockfit-api ou lockfit-app)"
fi

echo ""
echo "=== Vérification Postgres ==="
PGSTATUS=$(docker inspect -f '{{.State.Health.Status}}' lockfit-postgres 2>/dev/null)
if [ "$PGSTATUS" == "healthy" ]; then
  echo "✅ Postgres est healthy"
else
  echo "❌ Postgres n'est pas prêt (status: $PGSTATUS)"
fi
