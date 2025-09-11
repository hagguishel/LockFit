# 📘 Project Charter – LockFit (Stage 2)

---

## 🎯 Project Objectives

**Purpose**
LockFit vise à simplifier et sécuriser le suivi sportif des utilisateurs.
L’application mobile permet de planifier et enregistrer ses entraînements, suivre ses performances et les partager avec un groupe, tout en protégeant les données personnelles grâce à une cybersécurité avancée (MFA, chiffrement AES-256, conformité RGPD).

**SMART Objectives**
1. **🔐 Authentification sécurisée**
   - Mettre en place une connexion protégée par email + MFA (TOTP/Passkeys) et chiffrement des données.
   - **Mesurable** : 100% des comptes utilisateurs doivent passer par cette authentification.
   - **Temporel** : livrable en **semaine 4**.

2. **📋 Gestion complète des entraînements**
   - CRUD (création, édition, suppression) des séances avec séries, répétitions, temps de repos.
   - **Mesurable** : chaque utilisateur peut enregistrer un programme complet.
   - **Temporel** : opérationnel en **semaine 6**.

3. **📊 Suivi social & performances**
   - Historique des séances + partage des progrès avec son groupe.
   - **Mesurable** : chaque utilisateur doit accéder à ses stats et pouvoir partager ses résultats.
   - **Temporel** : disponible en **semaine 10**.

---

## 👥 Stakeholders and Roles

**Stakeholders**
- **Interne** :
  - [RAZAFIMAITSO Haggui](https://github.com/hagguishel)
  - [LAGARDE Tom](https://github.com/tmlgde)
- **Externe** :
  - Instructeurs SUI (validation pédagogique).
  - Utilisateurs cibles (sportifs débutants et confirmés).
  - Fournisseurs d’API externes (Expo Notifications, Sentry, AWS S3, SendGrid).

**Team Roles (partagés)**
| Rôle                | Responsabilités principales | Attribution |
|---------------------|-----------------------------|-------------|
| 🧑‍💻 Project Manager     | Organisation, suivi Agile, milestones | Partagé |
| 🔐 Backend Developer   | API sécurisée (NestJS, Prisma, MFA) | Partagé |
| 📱 Mobile Developer    | UI/UX React Native, navigation | Partagé |
| 🗄 Database Manager    | PostgreSQL + Row-Level Security | Partagé |
| 🧪 QA & Testing        | Tests unitaires & intégration | Partagé |

---

## 📦 Scope

**In-Scope (MVP)**
- Authentification sécurisée (email + MFA, chiffrement, TLS).
- Gestion des entraînements (CRUD complet).
- Suivi des performances (historique, statistiques).
- Module social de base (partage de progrès).

**Out-of-Scope (MVP)**
- Gamification avancée (classements, badges).
- Intégration avec wearables (montres connectées).
- Stratégies d’entraînement automatiques.
- Monétisation ou marketplace.
- Notifications push.

---

## ⚠️ Risks

| Risque | Description | Stratégie de mitigation |
|--------|-------------|-------------------------|
| **🔑 MFA complexe** | Intégration TOTP & Passkeys sur mobile et API | Prototypage et tests anticipés |
| **🐘 PostgreSQL perf** | RLS + statistiques lourdes risquent de ralentir la DB | Indexation + optimisation Prisma |
| **👶 Adoption UX** | Risque que l’app soit trop complexe pour débutants | Design simplifié + tests utilisateurs réguliers |
| **⏳ Charge projet** | Stack ambitieuse pour un MVP en 3 mois | Prioriser MVP, phaser les fonctionnalités |

---

## 🗓 High-Level Plan

### Timeline
- **Stage 1 : Idea Development (Terminé)**
  - Brainstorming, sélection MVP, cadrage initial.

- **Stage 2 : Project Charter (Actuel)**
  - Définition objectifs, rôles, scope, risques, plan.

- **Stage 3 : Technical Documentation (Sem. 3–4)**
  - Schémas UML, spécification API, DB design.

- **Stage 4 : MVP Development (Sem. 5–10)**
  - Backend + Frontend + DB.
  - Auth sécurisée + CRUD entraînements + stats.

- **Stage 5 : Project Closure (Sem. 11–12)**
  - Tests finaux, corrections bugs.
  - Préparation Demo Day (démo live + pitch).

---

## 👥 Authors

- [RAZAFIMAITSO Haggui](https://github.com/hagguishel)
- [LAGARDE Tom](https://github.com/tmlgde)
