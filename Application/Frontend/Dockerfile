FROM node:20-bullseye
WORKDIR /app

# Outils minimaux
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Évite le prompt Expo pour le tunnel
RUN npm i -g @expo/ngrok@^4.1.0

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 19000 19001 19002 8081

# Tunnel Expo direct, pas d'interaction
CMD ["npx", "expo", "start", "--tunnel", "-c"]
