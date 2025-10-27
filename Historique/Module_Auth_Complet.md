# 🔐 Module d’authentification LockFit — **Front + Back** (Guide d’implémentation)

**📅 Date :** 27 octobre 2025  
**👤 Auteur :** Équipe LockFit  
**🎯 But de ce document :** Expliquer **comment marche le code** d’authentification LockFit côté **Backend NestJS** et **Frontend Expo/React Native**, avec les **bonnes routes**, des **schémas ASCII** et des **exemples concrets**.

> Base API (prod) : `https://lockfit.onrender.com/api/v1`  
> Préfixe global ajouté dans `main.ts` : `/api/v1`

---

## 0) Vue d’ensemble — ce que fait l’auth chez LockFit

- **Inscription** : création d’un user (hash argon2) → émission **accessToken** (court) + **refreshToken** (long), et retour du user public.
- **Connexion** : vérifie email+mdp.  
  - Si **MFA off** → tokens directement.  
  - Si **MFA on** → retourne `{ mfaRequired, tempSessionId }` → le client appelle `/auth/mfa/verify` avec le code TOTP → tokens.
- **Routes protégées** : utilisent `AuthGuard('jwt')` (vérifie l’**access token**).
- **Refresh** : `/auth/refresh` prend le refresh et renvoie un **nouvel access** (et parfois un nouveau refresh si rotation).
- **Logout** : invalide le refresh courant côté serveur, et le client **efface** les tokens de l’appareil.

---

## 1) Architecture Backend (NestJS + Prisma)

```
src/
├─ main.ts                      ← Helmet, CORS, ValidationPipe, prefix /api/v1
├─ application.module.ts        ← AppModule: Throttler, Modules, Guards
├─ authentification/
│  ├─ authentification.controller.ts   ← Routes HTTP /auth/*
│  ├─ authentification.module.ts       ← Dépendances, JwtModule (TTL), Passport
│  ├─ authentification.service.ts      ← Logique: hash, tokens, MFA, refresh, logout
│  ├─ dto/
│  │  ├─ login.dto.ts                  ← { email, password }
│  │  ├─ mfa-verify.dto.ts             ← { tempSessionId, code } etc.
│  │  └─ refresh.dto.ts                ← { refresh }
│  └─ strategies/
│     ├─ jwt.strategy.ts               ← vérifie access token (routes protégées)
│     └─ refresh.strategy.ts           ← si refresh est aussi un JWT
├─ prisma/
│  ├─ prisma.module.ts / prisma.service.ts ← accès DB
│  └─ …
└─ commun/health.controller.ts  ← GET /health
```

### Prisma (migrations clés liées à l’auth)

```
prisma/migrations/
├─ 20251007121635_add_user_mfa/                      ← colonnes MFA (mfaEnabled, mfaSecret…)
├─ 20251011104656_add_refresh_token/                 ← modèle refresh token (première version)
├─ 20251011114639_add_refresh_tokens/                ← ajustements refresh
├─ 20251017095117_auth_mfa_challenge_and_password_hash/ ← challenge MFA + passwordHash
├─ 20251021135105_add_refresh_token_jti/             ← JTI (ID unique) pour rotation & révocation
└─ … autres migrations (workouts, planning…)
```

> Ces migrations montrent que :  
> - Le **mot de passe** est stocké sous forme de **hash** (`passwordHash`) — **jamais** en clair.  
> - La **MFA** est gérée via un **secret TOTP** côté user + un **challenge** temporaire pour le login en 2 étapes.  
> - Les **refresh tokens** ont un **JTI** (identifiant unique) pour les invalider (rotation, logout).

### Sécurité globale (dans `main.ts` + `AppModule`)

- `Helmet()` : CSP, X-Frame-Options, XSS-Protection…  
- `app.enableCors({ origin: true, … })` : permissif en dev (Expo), resserrer si front web en prod.  
- `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })` : DTO stricts.  
- `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])` + `APP_GUARD: ThrottlerGuard` : rate limit.  
- `app.setGlobalPrefix('api/v1')` : toutes les routes commencent par `/api/v1`.

### Rôle de chaque fichier auth

- **Controller** : définit les **routes** et délègue au service (aucune logique métier directe).
- **Service** : fait tout le **travail** (Prisma, argon2, signatures JWT, gestion MFA, refresh, logout).
- **DTO** : **valide** et **typé** les payloads entrants.
- **Strategies** : branchent **Passport** pour vérifier les JWT (access, éventuellement refresh).

---

## 2) Les **bonnes routes** (contrat API Auth)

> Préfixe à ajouter : `/api/v1`

| Méthode | Route                      | Corps (JSON)                                                | Retour (200)                                                                                   | Notes |
|---------|----------------------------|-------------------------------------------------------------|--------------------------------------------------------------------------------------------------|------|
| POST    | `/auth/signup`             | `{ email, password, firstName, lastName }`                  | `{ accessToken, refreshToken, user: {id,email,firstName,lastName,mfaEnabled} }`                | 409 si email existe |
| POST    | `/auth/login`              | `{ email, password }`                                       | *Sans MFA* → `{ accessToken, refreshToken, user }`<br>*Avec MFA* → `{ mfaRequired, tempSessionId }` | 401 si invalid |
| POST    | `/auth/mfa/verify`         | `{ tempSessionId, code }`                                   | `{ accessToken, refreshToken, user }`                                                           | Étape 2 login |
| POST    | `/auth/mfa/secret`         | (Header) `Authorization: Bearer <access>`                   | `{ otpauthUrl, secret }`                                                                        | route protégée |
| POST    | `/auth/mfa/enable`         | `Bearer <access>`, Body `{ totpCode }`                      | `{ mfaEnabled: true }`                                                                          | route protégée |
| POST    | `/auth/refresh`            | `{ refresh }`                                               | `{ accessToken [, refreshToken] }`                                                              | rotation optionnelle |
| POST    | `/auth/logout`             | (Header) `Authorization: Bearer <access>` (ou body refresh) | `{ ok: true }`                                                                                  | révoque refresh |
| GET     | `/auth/me`                 | (Header) `Authorization: Bearer <access>`                   | `{ sub, email, … }` (ou profil public)                                                          | route protégée |
| GET     | `/health`                  | —                                                           | `{ ok:true, service:"lockfit-api" }`                                                            | diagnostic |

---

## 3) Comment ça s’enchaîne — **schémas ASCII**

### 3.1 Connexion (MFA possible)

```
[App Mobile]    -- POST /auth/login {email, password} -->   [AuthService]
                      │
                      ├── mfaEnabled = false  ──▶ 200 { access, refresh, user }
                      │
                      └── mfaEnabled = true   ──▶ 200 { mfaRequired: true, tempSessionId }
                                                     │
[App Mobile] -- POST /auth/mfa/verify {sid, code} -->│
                                                     └─▶ 200 { access, refresh, user }
```

### 3.2 Refresh & routes protégées

```
[App Mobile] -- GET /auth/me (Bearer access) --> [JwtStrategy] ok ?
         ├─ oui → 200 user
         └─ non (401) → POST /auth/refresh { refresh } ──▶ 200 { access[, refresh] }
                        └─ rejouer la requête initiale
```

### 3.3 Logout

```
[App Mobile] -- POST /auth/logout (Bearer access) --> [AuthService revoke refresh]
[App Mobile] -- clear SecureStore(access, refresh) --> redirect /auth/login
```

---

## 4) Backend : comment marche **le code**

- **`authentification.controller.ts`** : mappe chaque route vers **AuthService**.  
  Ex : `@Post('login')` → `authService.login(dto)`.
- **`authentification.service.ts`** :  
  - `signup(dto)` : vérifie doublon email (Prisma), hash **argon2**, crée user, signe **access** (ttl court) + **refresh** (ttl long ou opaque), retourne `{tokens, user}`.  
  - `login(dto)` : trouve user, compare hash, **si MFA** → `mfaRequired`; sinon signe tokens et renvoie.  
  - `mfaCreateSecret(userId)` : génère secret TOTP + `otpauth://` (pour QR).  
  - `mfaEnable(userId, code)` : vérifie code TOTP, active `mfaEnabled`.  
  - `mfaVerify(tempSessionId, code)` : login step 2, émet tokens si code ok.  
  - `refresh(refresh)` : vérifie validité (JWT **ou** opaque en DB via `jti`), émet **nouvel access** (et **nouveau refresh** si rotation).  
  - `logout(_, authorization)` : lit l’access pour identifier l’utilisateur, **révoque** le refresh courant (en DB), renvoie `{ok:true}`.
- **`strategies/jwt.strategy.ts`** : extrait le **Bearer** du header et valide la signature (secret `JWT_ACCESS_SECRET`). En cas d’ok, attache `req.user` (payload).  
- **`strategies/refresh.strategy.ts`** : utilisé si le refresh est **aussi un JWT** (sinon, la vérification se fait côté service via Prisma).  
- **`application.module.ts`** : branche **Throttler** (anti bruteforce), **ConfigModule**, **AuthModule**, **PrismaModule**.  
- **`main.ts`** : Helment/CORS/Validation, **prefix `/api/v1`**, écoute réseau.

---

## 5) Frontend : comment marche **le code**

Arborescence (extrait) :

```
app/
├─ auth/
│  ├─ login.tsx            ← écran de connexion
│  ├─ creation.tsx         ← inscription (optionnelle)
│  └─ mfa.tsx              ← saisie code TOTP (si mfaRequired)
├─ (tabs)/…                ← zone post-connexion
├─ index.tsx               ← redirection initiale
└─ _layout.tsx             ← hydratation + Splash, applique les guards
src/
├─ api/auth.ts             ← appels fetch vers /auth/*
└─ lib/tokenStorage.ts     ← SecureStore (access/refresh)
```

### 5.1 `login.tsx` (écran)
- Collecte `email` + `password`, bouton **Se connecter**.
- Appelle `login(email, password)` (dans `src/api/auth.ts`).  
  - Si **MFA requis** → `router.push('/auth/mfa?sid=...')`.  
  - Sinon → `saveTokens(tokens)` puis `router.replace('/(tabs)')`.
- Efface le mdp dans l’état, gère les erreurs (401, 429, réseau).

### 5.2 `src/api/auth.ts` (client API)
- Base : `const API_BASE = process.env.EXPO_PUBLIC_API_URL` (doit inclure `/api/v1`).  
- Fonctions : `login`, `signup`, `refresh`, `logout`, `me`, `mfaSecret`, `mfaEnable`, `mfaVerify`.  
- **Gestion des erreurs** : on lit `res.text()` puis on `JSON.parse()` si non vide, pour normaliser `{ status, message }`.

### 5.3 `src/lib/tokenStorage.ts`
- **Expo SecureStore** :  
  - `saveTokens({ access, refresh })`  
  - `loadTokens()` → `{ access, refresh } | null`  
  - `clearTokens()`
- **Important** : utiliser **exactement les mêmes options** en écriture/lecture/suppression (notamment `keychainService` sur iOS).

### 5.4 `app/_layout.tsx` (hydrater avant de router)
- Au boot : `await loadTokens()` → `setHasAuth(!!access)` → `SplashScreen.hideAsync()`.
- Pendant la phase d’hydratation : **ne pas** rendre l’UI (return `null`) pour éviter les faux négatifs.

### 5.5 Guards de navigation
- Si **pas authentifié** et on tente d’entrer dans `/(tabs)` → rediriger `/auth/login`.
- Si **authentifié** et on est dans `/auth/*` → rediriger `/(tabs)`.

### 5.6 Refresh côté frontend
- Si une requête protégée renvoie **401**, tenter `/auth/refresh` avec le `refresh` de SecureStore.  
- Si refresh ok → rejouer la requête initiale. Sinon → `clearTokens()` + `/auth/login`.

---

## 6) Exemples cURL (tests rapides)

```bash
# Health
curl -i https://lockfit.onrender.com/api/v1/health

# Signup
curl -i -X POST https://lockfit.onrender.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"new+'$(date +%s)'@example.com","password":"Secret123!","firstName":"Ada","lastName":"Lovelace"}'

# Login
curl -i -X POST https://lockfit.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tom.lagarde33@outlook.fr","password":"Girondins33"}'

# MFA (login step 2)
curl -i -X POST https://lockfit.onrender.com/api/v1/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{"tempSessionId":"<sid>","code":"123456"}'

# Me (protégé)
ACCESS="ey..."; curl -i https://lockfit.onrender.com/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS"

# Refresh
REFRESH="ey..."; curl -i -X POST https://lockfit.onrender.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh":"'$REFRESH'"}'

# Logout
curl -i -X POST https://lockfit.onrender.com/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS"

# MFA secret (protégé)
curl -i -X POST https://lockfit.onrender.com/api/v1/auth/mfa/secret \
  -H "Authorization: Bearer $ACCESS"

# MFA enable (protégé)
curl -i -X POST https://lockfit.onrender.com/api/v1/auth/mfa/enable \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"totpCode":"123456"}'
```

---

## 7) Bonnes pratiques & pièges évités

- **DTO stricts** (ValidationPipe) : rejeter les champs inattendus.  
- **Argon2** pour les mots de passe.  
- **Access TTL court** (ex: 15 min), **Refresh TTL long** (ex: 30 jours).  
- **Limiter** le contenu du JWT (pas de données sensibles).  
- **SecureStore** (pas AsyncStorage) pour les tokens.  
- **Hydratation** au boot pour éviter les races dans la garde.  
- **Même options** SecureStore pour set/get/delete.  
- **Retry** après refresh à 401.  
- **Helmet + Throttler + CORS** déjà en place.  
- **Prefix /api/v1** partout (attention aux URL front).

---

## 8) TL;DR (résumé actionnable)

- **Backend** : controller → service (hash/tokens/MFA) → prisma ; routes `/auth/*` ci-dessus.  
- **Frontend** : `login.tsx` → `api/auth.ts` → `saveTokens()` → `/(tabs)` ; hydratation + guards ; refresh à 401 ; logout efface SecureStore.  
- **MFA** : secret → enable → verify (login en 2 étapes).

> Résultat : Auth **propre**, **sécurisée**, **compatible mobile**, et **documentée** pour l’équipe.
