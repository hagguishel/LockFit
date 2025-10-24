# ---- Étape build (dev deps incluses pour prisma + TypeScript) ----
FROM node:20-alpine AS build
WORKDIR /app

# 1) Dépendances (toutes, y compris dev)
COPY package*.json ./
RUN npm ci

# 2) Sources
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma

# 3) Prisma client + build TS
RUN npx prisma generate
RUN npm run build

# 4) Nettoyer node_modules et réinstaller SEULEMENT prod
RUN rm -rf node_modules && npm ci --omit=dev


# ---- Étape runtime (légère) ----
FROM node:20-alpine
WORKDIR /app

# Outils légers (healthcheck, debugging)
RUN apk add --no-cache curl

# 1) Package files (utile si ton entrypoint lit package.json, pas obligatoire mais safe)
COPY package*.json ./

# 2) node_modules prod-only depuis le build
COPY --from=build /app/node_modules ./node_modules

# 3) Artefacts compilés (NestJS transpile en dist/)
COPY --from=build /app/dist ./dist

# 4) Schémas Prisma (nécessaires pour Prisma Client)
COPY --from=build /app/prisma ./prisma

# 5) Prisma Client généré
# On ne copie PAS .prisma car il n'existe pas toujours dans l'image build Render
# COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# 6) Entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production

# IMPORTANT : le port exposé doit matcher ta variable PORT dans Render (3001)
EXPOSE 3001

# Healthcheck HTTP sur le bon port
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

CMD ["./docker-entrypoint.sh"]
