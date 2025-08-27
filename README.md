# 🏋️‍♂️ LockFit

<p align="center">
  <img src="https://img.shields.io/badge/Mobile-React%20Native-blue?logo=react" />
  <img src="https://img.shields.io/badge/Backend-NestJS-red?logo=nestjs" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql" />
  <img src="https://img.shields.io/badge/Security-MFA%20%7C%20AES--256%20%7C%20RGPD-green" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

---

## 📖 À propos du projet

**LockFit** est une application mobile qui simplifie et sécurise le suivi sportif.
👉 Planifie tes entraînements, enregistre tes performances et partage-les avec ton groupe – le tout protégé par une cybersécurité **de niveau coffre-fort** (MFA, chiffrement AES-256, conformité RGPD).

---

## 🚀 Fonctionnalités principales

- 🔐 **Authentification sécurisée** : email + MFA (TOTP, Passkeys), Argon2, chiffrement des données.
- 🏋️ **Gestion des entraînements** : ajout/édition/suppression d’exercices avec séries, répétitions et temps de repos.
- 📊 **Suivi des performances** : historique, statistiques, graphiques.
- 🤝 **Module social** : partage des progrès, motivation de groupe.
- 🔔 **Notifications push** : rappels d’entraînement et alertes sécurité.

### 🔮 Fonctionnalités futures
- 🎮 Gamification (leaderboard, badges, récompenses).
- 📱 Intégration avec wearables (montres connectées, capteurs).
- 💬 Chat et communauté intégrée.

---

## 🛠️ Stack technique

**Front-end mobile** : React Native (Expo, TypeScript, NativeWind, React Native Paper)
**Back-end** : NestJS (Node.js, Prisma, JWT, MFA, Argon2)
**Base de données** : PostgreSQL (Row-Level Security, chiffrement natif)
**Services externes** :
- AWS S3 (stockage images)
- SendGrid (emails sécurisés)
- Expo Notifications (push mobile)
- Sentry (logs & monitoring)

---

## 📸 Aperçu

📱 *(Screenshots et mockups viendront ici)*

<p align="center">
  <img src="https://via.placeholder.com/300x600.png?text=Mockup+App+LockFit" width="200" />
  <img src="https://via.placeholder.com/300x600.png?text=Dashboard+LockFit" width="200" />
</p>

---

## 🗓️ Roadmap

- [x] Définition des objectifs et du cadrage (Project Charter)
- [ ] Authentification sécurisée (MFA + Argon2)
- [ ] Gestion des entraînements (CRUD complet)
- [ ] Suivi performances & graphiques
- [ ] Module social + notifications push
- [ ] Démo finale (Demo Day)

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
