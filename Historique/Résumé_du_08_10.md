# Récap – Expo Go ↔ API NestJS (WSL) — Résolution des problèmes de `localhost`
**Date de rédaction : 2025-10-08 12:24:32**


Ce document résume tout ce que nous avons fait depuis la dernière sauvegarde pour permettre à l'app **Expo Go (téléphone)** de communiquer avec l'API **NestJS** qui tourne dans **WSL**. Il inclut les erreurs rencontrées, leurs causes, les changements appliqués, et une checklist de validation pour ton/ton partenaire.

---

## 1) Contexte & symptômes initiaux
- L’app mobile Expo Go n’arrivait pas à accéder aux endpoints de l’API en local.
- Les requêtes étaient envoyées vers `http://localhost:3000/...` depuis le **téléphone**.
- Des erreurs réseau apparaissaient côté mobile, et le bundle web échouait parfois (Expo web).

### Erreurs observées
- **Réseau** : absence de réponse / échecs sur les endpoints.
- **Port** : `EADDRINUSE: address already in use 0.0.0.0:3000` (port 3000 déjà occupé).
- **Expo web** (non bloquant pour mobile) : manque de `react-native-web` si web ouvert.

---

## 2) Causes racines
1. **`localhost` ≠ PC** sur téléphone : sur un device réel, `localhost` pointe vers le **téléphone**, pas vers l’ordinateur. Les requêtes n’atteignaient donc pas l’API.
2. **HTTP clair potentiellement bloqué** (Android ≥ 9 / iOS) : les appels en `http://` vers le LAN peuvent être rejetés sans configuration spécifique.
3. **Conflit de port 3000** : un process (`node dist/principal.js`) écoutait déjà sur 3000 → `EADDRINUSE`.
4. **Expo sans tunnel sur Windows/WSL** : souvent, le réseau/pare-feu/bridge empêche l’app Expo Go de récupérer le bundle sans utiliser `--tunnel`.

---

## 3) Changements réalisés (chronologique logique)

### 3.1 Backend (NestJS)
- **Écoute sur 0.0.0.0** pour rendre l’API joignable depuis le réseau local.
- **Port de dev déplacé sur 3001** pour éviter le conflit (`EADDRINUSE` sur 3000).
- **CORS activé** en mode dev (permissif) + **Helmet** activé.
- **Préfixe global** confirmé : `/api/v1`.

**Exemple de `principal.ts` final (extrait) :**
```ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './application.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 LockFit API up on http://0.0.0.0:${port}/api/v1`);
}
bootstrap().catch(err => { console.error('❌ Bootstrap error:', err); process.exit(1); });
```

**Commandes utiles run pendant le debug :**
```bash
# Voir le process qui tient le port
ss -lntp | grep ':3000'
sudo fuser -v 3000/tcp
ps aux | grep -E 'ts-node|node|nest' | grep -v grep

# Tuer l'ancien process si besoin
sudo kill -TERM <PID> || sudo kill -9 <PID>

# Démarrer l’API sur 3001 pour éviter tout conflit
PORT=3001 npm run start:dev
curl -s http://localhost:3001/api/v1/health
```

### 3.2 Tunnel HTTPS pour l’API (Cloudflare)
- Création d’un **tunnel HTTPS** vers l’API locale :
  ```bash
  cloudflared tunnel --url http://localhost:3001
  ```
- URL tunnel obtenue (exemple réel) :
  `https://highway-modify-attempts-enlargement.trycloudflare.com`
- Avantages : **HTTPS** (pas de blocage cleartext), pas de configuration LAN/pare-feu.

### 3.3 Frontend (Expo / React Native)
- Ajout/édition du fichier **`.env`** :
  ```env
  EXPO_PUBLIC_API_URL=https://highway-modify-attempts-enlargement.trycloudflare.com/api/v1
  ```
- **Centralisation** de tous les appels via `src/api/http.ts`, avec :
  - base URL depuis `.env`,
  - en-têtes par défaut (`Content-Type`, `Accept`),
  - **timeout** par défaut (20s),
  - support `Authorization: Bearer <token>` si besoin,
  - meilleures erreurs (conseils si le tunnel n’est pas actif, etc.).

**Extrait `http.ts` (final, abrégé) :**
```ts
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
export const API_BASE = RAW_BASE.trim().replace(/\/+$/, "");
if (!API_BASE) { throw new Error("EXPO_PUBLIC_API_URL manquant"); }

function buildUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`.replace(/(?<!:)\/{2,}/g, "/");
}

export async function http<T = unknown>(path: string, opts: HttpOptions = {}): Promise<T | null> {
  // headers JSON, timeout 20s, erreurs explicites si tunnel down, etc.
}
```

- Lancement d’Expo avec **tunnel** pour servir le **bundle** au téléphone :
  ```bash
  npx expo start --tunnel -c
  ```
- (Optionnel) Correction du warning web en installant le support web :
  ```bash
  npx expo install react-native-web react-dom
  ```

---

## 4) Validation — ce que nous avons testé avec succès
- **Health check** depuis le téléphone : `…/api/v1/health` → OK.
- **Création d’entraînements** → OK (POST).
- **Lecture** (liste/détail) avec statut **en cours/terminé** → OK (GET).
- **Terminaison** d’un entraînement → OK (POST `/finish`).

---

## 5) Pourquoi ça marche maintenant (en bref)
1. **Adresse atteignable depuis le téléphone** : utilisation d’une **URL publique HTTPS** (Cloudflare) au lieu de `localhost`.
2. **API ouverte au réseau** : écoute sur `0.0.0.0` (port 3001 sans conflit).
3. **Front configuré par l’environnement** : `.env` → `EXPO_PUBLIC_API_URL` → `http.ts`.
4. **Distribution du bundle fiable** : Expo lancé avec `--tunnel`.
5. **CORS/Helmet/Prefix** cohérents.

---

## 6) Checklist “Daily Dev”
1. **API** : `PORT=3001 npm run start:dev`
2. **Tunnel API** : `cloudflared tunnel --url http://localhost:3001`
3. **.env Front** : `EXPO_PUBLIC_API_URL=https://<url-tunnel>/api/v1`
4. **Expo** : `npx expo start --tunnel -c`
5. **Test santé** (mobile) : ouvrir `…/api/v1/health` sur le téléphone
6. **Logs** : `console.log("API_BASE =", API_BASE)` si doute

---

## 7) Dépannage rapide
- **Tunnel down** → relancer `cloudflared` (garder la fenêtre ouverte).
- **Erreur réseau mobile** → vérifier `.env`, `/health` en local, et `--tunnel` Expo.
- **Port occupé** → `ss` / `fuser` / `kill` (ou rester sur 3001).

---

## 8) Message de commit suggéré
```
feat(dev): Expo Go ↔ API via tunnel HTTPS + fix localhost

- Backend: listen 0.0.0.0, port 3001 (evite EADDRINUSE), CORS dev, Helmet
- Frontend: .env EXPO_PUBLIC_API_URL (Cloudflare Tunnel)
- Frontend: http.ts robuste (timeout, erreurs claires, JSON headers)
- Dev: expo start --tunnel + support web optionnel
```

---

## 9) Notes d’exploitation
- Ne pas fermer la fenêtre `cloudflared` pendant les tests.
- Garder `/api/v1` côté backend et dans l’URL du `.env`.
- Éviter de remettre `localhost` en dur dans le front.
- Contexte : Windows + VS Code + WSL (Ubuntu) ; Expo Go en `--tunnel` ; NestJS/Prisma ; Cloudflare Tunnel.
