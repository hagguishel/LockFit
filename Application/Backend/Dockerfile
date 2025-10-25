# ---- Étape build ----
FROM node:20-alpine AS build
WORKDIR /app

# 1. Installer toutes les deps (prod + dev)
COPY package*.json ./
RUN npm install

# 2. Copier le code
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma

# 3. Générer Prisma Client et builder Nest
RUN npx prisma generate
RUN npm run build

# ---- Étape runtime (prod) ----
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl

# 1. Copier package.json (pas obligatoire mais propre)
COPY package*.json ./

# 2. Copier node_modules ENTIER depuis l'étape build
COPY --from=build /app/node_modules ./node_modules

# 3. Copier le code compilé + Prisma schema
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# 4. Entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

CMD ["./docker-entrypoint.sh"]
