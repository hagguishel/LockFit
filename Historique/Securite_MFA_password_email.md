# LockFit — Résumé des tests backend (Sprint Sécurité / Authentification)
*Date : 02/11/2025*

## 🧠 Contexte
Ce sprint visait à valider **toute la logique backend d’authentification sécurisée** de l’application **LockFit**.  
Le frontend (mobile / Expo) sera traité plus tard.

---

## ✅ Fonctionnalités implémentées et testées

### 1. 🔐 Authentification de base (Signup / Login / Tokens)
- Hash des mots de passe avec **argon2**.
- Génération de **JWT access tokens** (15 min) et **refresh tokens** (30 jours).
- Stockage **hashé** des refresh tokens en base (table `refresh_tokens`).
- Rotation et révocation des refresh tokens lors du logout ou reset password.
- Route protégée `/api/v1/auth/me` validée avec un access token.

### 2. ✉️ Vérification d’adresse e‑mail
- Génération d’un token unique (24h) dans `email_verification`.
- Envoi du lien de validation via **SendGrid**.
- Validation via `/api/v1/auth/email/verify?token=...`.
- Champ `emailVerifiedAt` mis à jour après validation.

### 3. 🔁 Réinitialisation de mot de passe
- `/password/reset/request` : création du token `password_reset`.
- `/password/reset/confirm` : vérifie le token, met à jour le mot de passe et **révoque tous les refresh actifs**.
- Relogin après reset validé.

### 4. 🧩 MFA (Multi‑Factor Authentication)
Deux mécanismes disponibles :
- **MFA Challenge (6 chiffres par e‑mail)** : testé et fonctionnel.
  - Login → création d’un challenge → `/mfa/verify` avec code correct → émission de nouveaux tokens.
- **MFA TOTP (Google Authenticator)** : implémenté mais non encore testé (sera fait au prochain sprint).

### 5. 🛠️ Divers et sécurité
- Toutes les durées configurables via `.env` :
  - `JWT_ACCESS_TTL=15m`
  - `JWT_REFRESH_TTL=30d`
  - `MFA_CODE_TTL_SEC=300`
- Variables d’environnement sensibles : clés JWT, SendGrid, etc.
- Désactivation des logs MFA en production (`NODE_ENV=production`).
- Prisma migration OK (11 migrations au total).

---

## 🧾 Résumé des routes testées

| Endpoint | Méthode | Description | Statut |
|-----------|----------|-------------|---------|
| `/api/v1/auth/signup` | POST | Création de compte | ✅ |
| `/api/v1/auth/login` | POST | Connexion standard | ✅ |
| `/api/v1/auth/me` | GET | Profil utilisateur via access token | ✅ |
| `/api/v1/auth/email/verify/request` | POST | Envoi e‑mail de vérification | ✅ |
| `/api/v1/auth/email/verify` | GET | Validation du token e‑mail | ✅ |
| `/api/v1/auth/password/reset/request` | POST | Demande de reset | ✅ |
| `/api/v1/auth/password/reset/confirm` | POST | Confirmation du reset | ✅ |
| `/api/v1/auth/mfa/verify` | POST | Vérification code MFA | ✅ |
| `/api/v1/auth/mfa/secret` | POST | (TOTP) Génération secret QR | ⏳ |
| `/api/v1/auth/mfa/enable` | POST | (TOTP) Activation MFA | ⏳ |

---

## 🧩 Étapes suivantes
- Mettre en place le front de ces fonctionnalités
---

**LockFit — Sécurité solide, base prête pour l’intégration frontend 💪**
