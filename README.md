# 🏋️‍♂️ LockFit — Sport x Cybersecurity

<p align="center">
  <img src="https://img.shields.io/badge/Mobile-React%20Native-blue?logo=react" />
  <img src="https://img.shields.io/badge/Backend-NestJS-red?logo=nestjs" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql" />
  <img src="https://img.shields.io/badge/Security-MFA%20%7C%20Argon2%20%7C%20AES--256-green" />
  <img src="https://img.shields.io/badge/Conformité-RGPD-lightgrey" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

---

## 📖 À propos du projet

**LockFit** est une application mobile qui combine **sport** et **cybersécurité**.
👉 Planifie tes entraînements, organise ton planning, suis tes performances et stocke tes données de manière **ultra sécurisée**.

⚡ **Pitch :** *Une application de suivi sportif protégée par une cybersécurité de niveau coffre-fort (MFA, chiffrement AES-256, RGPD).*

---

## 🚀 Fonctionnalités (MVP)

### 🏋️ Gestion des entraînements & planning
- Parcourir un **catalogue d’exercices** (groupes musculaires, filtres niveau/matériel).
- Créer, éditer et supprimer ses **séances** (répétitions, séries, repos, méthode d’entraînement).
- Créer un **planning** hebdomadaire avec affectation des séances aux jours.
- Marquer ses séances comme **faites** et suivre son avancement.

### 🔐 Authentification sécurisée
- Inscription par **email + mot de passe (hash Argon2)**.
- **MFA obligatoire** : TOTP (Google Authenticator) ou Passkeys (WebAuthn).
- Sessions sécurisées par **JWT + Refresh tokens**.
- Réinitialisation mot de passe via email sécurisé (**SendGrid/Resend**).
- Gestion d’**avatar** (upload sur **AWS S3**).
- Suppression de compte et données → conformité **RGPD**.

### 📊 Suivi des performances
- **Historique** des séances (date, exos, séries, répétitions, poids).
- **Statistiques visuelles** : graphiques de progression, régularité, fréquence.
- Accès uniquement après authentification.

---

## 🔮 Fonctionnalités futures

### SHOULD HAVE
- 🔔 **Notifications push** : rappel si inactif X jours, alerte fin de repos.

### COULD HAVE
- 🏅 **Gamification** : badges d’assiduité et de spécialisation.

### WON’T HAVE (MVP)
- 🌐 **Module social** : partage des progrès, commentaires, likes, suivi d’utilisateurs.

---

## 🛠️ Stack technique

**Front-end mobile**
- React Native (Expo, TypeScript)
- NativeWind (Tailwind RN)
- React Native Paper / Tamagui
- React Navigation

**Back-end**
- NestJS (Node.js + TypeScript)
- Prisma ORM
- JWT + Refresh Tokens
- MFA : **otplib** (TOTP), **@simplewebauthn/server** (Passkeys)
- Argon2 (hashing sécurisé)

**Base de données**
- PostgreSQL (ACID, chiffrement natif, Row-Level Security, Field Level Encryption)

**Cybersécurité**
- MFA (TOTP & Passkeys)
- Argon2 (hash)
- JWT + Refresh
- Helmet, CORS, Rate Limiting
- Conformité **OWASP MASVS/ASVS**
- **RGPD** : droit à l’effacement, données protégées

**Services externes**
- AWS S3 → stockage images sécurisé (liens signés)
- SendGrid / Resend → envoi d’emails (validation compte, reset)
- Expo Notifications → push notifications
- Sentry → monitoring mobile & API

**Tests & Qualité**
- Jest, React Native Testing Library, Supertest

---

## 📸 Aperçu

📱 *(Screenshots et mockups viendront ici)*

<p align="center">
  <img src="https://via.placeholder.com/300x600.png?text=Mockup+App+LockFit" width="200" />
  <img src="https://via.placeholder.com/300x600.png?text=Planning+LockFit" width="200" />
  <img src="https://via.placeholder.com/300x600.png?text=Statistiques+LockFit" width="200" />
</p>

---

## 🗓️ Roadmap

- [x] Définition du cadrage projet (Project Charter)
- [ ] 🏋️ Gestion des entraînements & planning
- [ ] 🔐 Authentification sécurisée (MFA + RGPD)
- [ ] 📊 Suivi des performances & graphiques
- [ ] 🔔 Notifications push
- [ ] 🏅 Gamification
- [ ] 🌐 Module social
- [ ] 🎉 Démo finale (Demo Day)

---

## ⚡ Installation & Exécution

### 📌 Prérequis
- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/)
- [PostgreSQL](https://www.postgresql.org/) (v15+)

### 🔽 Installation

```bash
# Cloner le repo
git clone https://github.com/hagguishel/lockfit.git
cd lockfit

# Installer les dépendances backend
cd backend
npm install

# Installer les dépendances mobile
cd ../mobile
npm install
