# 🏋️‍♂️ LockFit – Project Charter

[![Made with React Native](https://img.shields.io/badge/Mobile-React%20Native-blue?logo=react)](https://reactnative.dev/)
[![Backend NestJS](https://img.shields.io/badge/Backend-NestJS-red?logo=nestjs)](https://nestjs.com/)
[![Database PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)](https://www.postgresql.org/)
[![Security](https://img.shields.io/badge/Security-MFA%20%7C%20AES--256%20%7C%20RGPD-green)](#)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📑 Table of Contents
1. [🎯 Objectives](#-objectives)
2. [👥 Stakeholders & Roles](#-stakeholders--roles)
3. [📦 Scope](#-scope)
4. [⚠️ Risks](#%EF%B8%8F-risks)
5. [🗓 High-Level Plan](#-high-level-plan)
6. [🛠 Tech Stack](#-tech-stack)
7. [✍️ Authors](#%EF%B8%8F-authors)

---

## 🎯 Objectives

**Purpose**
LockFit vise à simplifier et sécuriser le suivi sportif.
Planifie tes entraînements, enregistre tes performances et partage-les avec ton groupe – le tout protégé par une cybersécurité **de niveau coffre-fort** (MFA, chiffrement AES-256, RGPD).

### SMART Goals

1. **🔐 Authentification sécurisée**
   - **Spécifique** : Email + MFA (TOTP/Passkeys), hash Argon2, chiffrement des données.
   - **Mesurable** : 100% des comptes protégés.
   - **Temporel** : Prêt **semaine 4**.

2. **📋 Gestion des entraînements**
   - CRUD complet (exercices, séries, répétitions, repos).
   - **Temporel** : MVP opérationnel **semaine 6**.

3. **🤝 Suivi social & performances**
   - Partage des progrès + stats/historique.
   - **Temporel** : Disponible **avant semaine 10**.

---

## 👥 Stakeholders & Roles

| Rôle                | Membre (initial) | Responsabilités |
|---------------------|-----------------|----------------|
| 🧑‍💻 Project Manager     | — | Organisation, milestones, suivi agile |
| 🔐 Backend Developer   | — | API sécurisée (NestJS, Prisma, MFA) |
| 📱 Mobile Developer    | — | UI/UX React Native, navigation |
| 🗄 Database Manager    | — | PostgreSQL + Row-Level Security |
| 🧪 QA & Testing        | Tous | Tests unitaires & intégration |

---

## 📦 Scope

**✅ In-Scope (MVP)**
- Authentification sécurisée (MFA, chiffrement, TLS).
- Gestion des entraînements (CRUD complet).
- Suivi des performances (stats + historique).
- Module social (partage en groupe).
- Notifications push.

**❌ Out-of-Scope (MVP)**
- Leaderboard & gamification.
- IoT / wearables.
- Stratégies d’entraînement automatiques.
- Monétisation / marketplace.

---

## ⚠️ Risks

| Risque | Description | Solution |
|--------|-------------|----------|
| **🔑 MFA complexe** | Intégration TOTP & Passkeys | Tests anticipés Expo/NestJS |
| **🐘 PostgreSQL perf** | RLS + stats lourdes | Indexation + optimisation Prisma |
| **👶 Adoption UX** | Risque d’interface trop complexe | Tests utilisateurs réguliers |
| **⏳ Charge projet** | Stack ambitieuse (MFA, sécurité, S3) | Prioriser MVP & phaser |

---

## 🗓 High-Level Plan

### Phase 1 : Setup (S1–S4)
- Définition rôles + stack (RN, NestJS, PostgreSQL).
- Repo GitHub + CI/CD.
- Authentification sécurisée (MFA, Argon2).

### Phase 2 : MVP (S5–S8)
- CRUD entraînements.
- Suivi performances (stats).
- Notifications push.
- API sécurisée avec Prisma.

### Phase 3 : UX & Social (S9–S11)
- UI finale (React Native Paper/Tamagui).
- Module social (partage progrès).
- Graphiques progression (Victory Native).
- Tests unitaires + API.

### Phase 4 : Demo Day (S12)
- Tests d’intégration.
- Monitoring (Sentry, logs).
- Démo live & pitch (sécurité + sport + social).

---

## 🛠 Tech Stack

- **📱 Mobile (front)** : React Native + Expo (TypeScript, NativeWind, RN Paper).
- **🔐 Backend** : NestJS (Node.js, Prisma, JWT/MFA, Argon2).
- **🗄 Database** : PostgreSQL (RLS, chiffrement).
- **☁️ Services externes** : AWS S3, SendGrid, Expo Notifications, Sentry.

---

## ✍️ Authors

- [RAZAFIMAITSO Haggui](https://github.com/hagguishel)
- [LAGARDE Tom](https://github.com/tmlgde)
