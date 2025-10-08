# ---- Étape build (dev deps incluses pour prisma) ----
FROM node:20-alpine AS build
WORKDIR /app

# 1) Dépendances
COPY package*.json ./
RUN npm ci

# 2) Sources
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma

# 3) Prisma client + build TS
RUN npx prisma generate
RUN npm run build

# ---- Étape runtime ----
FROM node:20-alpine
WORKDIR /app

# Outils légers utilisés (healthcheck)
RUN apk add --no-cache curl

# 1) Dépendances (inclure dev pour prisma CLI en dev/containers)
COPY package*.json ./
RUN npm ci

# 2) Artefacts & schémas
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# 3) Entrypoint (migrate, puis start)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
