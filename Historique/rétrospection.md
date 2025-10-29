# 🧭 Rétrospective complète — Projet LockFit (Sprints 3 à 6)

Projet : **LockFit** — Application mobile de suivi sportif (Backend : NestJS + Prisma + PostgreSQL / Front : Expo React Native)
Période : **23 septembre → 20 octobre 2025**
Équipe : **Haggui Razafimaitso** & **Tom Lagarde**

---

## 🏋️‍♂️ Sprint 3 — Module « Workouts » (23 → 29 septembre)

### 🎯 Objectif
Mettre en place le **module d’entraînement (Workouts)** :
- Création, affichage, modification et suppression des séances.
- Gestion de l’état “terminé” (`finishedAt`).
- Interface mobile “Mes entraînements” selon le design Figma.

---

### ⚙️ Déroulement
Le sprint s’est concentré sur la **structure technique du backend** (NestJS + Prisma) et la **mise en place du front** de base.
Nous avons travaillé en parallèle :
- Haggui sur l’API NestJS (routes, DTO, logique métier).
- Tom sur l’UI mobile et l’intégration visuelle.

Nous avons tenu **2 réunions de synchronisation** (lundi et jeudi) pour valider la structure des entités et les noms des routes.

---

### 💪 Résultats obtenus
- Module backend **Workouts** complet : `POST`, `GET`, `PATCH`, `DELETE`, `POST /finish`.
- Tests E2E via script `test_workouts.sh` ✅.
- Frontend : design validé (palette LockFit, écran “Mes entraînements”, bouton flottant).

---

### ⚠️ Difficultés rencontrées
| Problème | Cause | Solution |
|-----------|--------|----------|
| Migrations Prisma bloquées | Schéma incompatible avec Postgres Docker | `prisma migrate reset` + nettoyage du schéma |
| API non accessible sur mobile | Mauvaise URL `EXPO_PUBLIC_API_URL` | Fix du helper `http.ts` |
| Tunnel Cloudflare renvoyait HTML | URL sans `/api/v1` | Nettoyage de `CLEAN_BASE` et ajout du bon suffixe |
| Volume Docker non persistant | Mauvaise configuration `docker-compose.yml` | Ajout du volume PostgreSQL persistant |

---

### 📊 Évaluation
| Aspect | Résultat |
|--------|-----------|
| Backend | ✅ Fonctionnel et testé |
| Frontend | ⚙️ Partiel (liste affichée, logique série/step-by-step manquante) |
| Collaboration | 🟢 Très bonne communication et répartition claire |
| Aide nécessaire | Appui ponctuel sur Prisma & Docker entre binômes |

---

## 📅 Sprint 4 — Module « Planning » (30 sept. → 6 octobre)

### 🎯 Objectif
Permettre à l’utilisateur de **planifier ses séances** dans le temps :
- Créer un planning (période + nom).
- Ajouter des jours avec des séances existantes.
- Modifier ou supprimer ces jours.
- Marquer les séances comme “faites”.

---

### ⚙️ Déroulement
Haggui a développé le module `plannings` complet côté backend :
- Entités Prisma `Planning` et `PlanningJour`.
- Routes REST avec contraintes de validation (unicité, bornes de date).
- Script de test automatisé `test_planning_jours_full.sh` pour vérifier tous les cas possibles.

Tom s’est concentré sur la conception des futures interfaces front (UI Planning).
Des **réunions journalières** ont permis de se coordonner sur la structure de données (dates ISO, relations, etc.).

---

### 💪 Résultats obtenus
- Tests automatisés passés avec succès (`✅ ALL CHECKS PASS`).
- Gestion complète du cycle de vie d’un jour de planning (création, déplacement, complétion, suppression).
- Validation d’erreurs métier (`409`, `400`, `404`) avec messages clairs en français.

---

### ⚠️ Difficultés rencontrées
| Problème | Cause | Solution |
|-----------|--------|----------|
| Contrainte unique invalide | Prisma mal configuré | Ajout `@@unique([planningId, date, workoutId])` |
| Erreur DELETE jour | Cascade non active | Ajout `onDelete: Cascade` dans Prisma |
| Bug HTTP 400 | DTO obsolète | Mise à jour du DTO après refactor |
| Problème Render DB distante | Timeout 15 s | Migration en local puis déploiement manuel |
| Docker Compose | DB non prête au démarrage | Ajout `depends_on` + healthcheck |

---

### 📊 Évaluation
| Aspect | Résultat |
|--------|-----------|
| Backend | ✅ Fonctionnel et testé |
| Frontend | ❌ Non encore branché |
| Collaboration | 🟢 Bonne répartition, validation par pair programming |
| Aide nécessaire | Aucun blocage majeur |

---

## 🔐 Sprint 5 — Authentification & Sécurité (7 → 13 octobre)

### 🎯 Objectif
Mettre en place l’authentification complète et sécurisée :
- Création de compte, connexion et déconnexion.
- Gestion du **MFA (TOTP)**.
- Sécurisation des routes par JWT.
- Tests automatisés complets (`test_auth.sh`).

---

### ⚙️ Déroulement
Le travail a été partagé :
- **Tom** → création de compte et gestion des sessions.
- **Haggui** → intégration MFA, sécurisation JWT, test E2E et Docker.

Nous avons fait **une review conjointe** le 12 octobre pour valider tout le flux d’authentification.

---

### 💪 Résultats obtenus
- Backend complet : `/auth/signup`, `/auth/login`, `/auth/mfa/*`, `/auth/refresh`, `/auth/logout`.
- Script `test_auth.sh` validant la connexion, le MFA, les rejets et la sécurité.
- MFA activé et fonctionnel (`mfaRequired: true`, `tempSessionId`).
- Gestion complète des tokens (access + refresh).

---

### ⚠️ Difficultés rencontrées
| Problème | Cause | Solution |
|-----------|--------|----------|
| JWT expirait trop vite | TTL trop court (15m) | Allongement à 30m |
| Codes MFA invalides | Horloge conteneur désynchronisée | Synchronisation NTP |
| Cloudflare mix HTTPS/HTTP | Tunnel Cloudflare instable | Correction `CLEAN_BASE` |
| Reset schema effaçait les users | Volume Docker non monté | Volume persistant ajouté |

---

### 📊 Évaluation
| Aspect | Résultat |
|--------|-----------|
| Backend | ✅ 100 % testé |
| Frontend | ⚙️ UI prête, liaison API à finaliser |
| Collaboration | 🟢 Excellente coordination et partage du code |
| Aide nécessaire | Aucune, validation autonome |

---

## 🔗 Sprint 6 — Auth Complète & Recovery (14 → 20 octobre)

### 🎯 Objectif
Finaliser la **connexion entre le front et le back** pour l’authentification et le reset password :
- Liaison MFA front → back (`/auth/mfa/verify-totp`).
- Implémentation du reset password (`/auth/reset`).
- Stockage sécurisé des tokens sur mobile (SecureStore).
- Déconnexion propre et redirection.

---

### ⚙️ Déroulement
- Front : liaison du login réel, redirection automatique si token présent.
- Backend : implémentation de la route `/auth/reset` (en cours).
- Tests : vérification MFA front (connexion du `tempSessionId`).
- Réunions quotidiennes avec Tom pour aligner la logique de session et les tokens JWT.

---

### 💪 Résultats obtenus
- Login et logout fonctionnent parfaitement côté mobile.
- MFA affiché correctement après login MFA-required.
- Stockage sécurisé avec SecureStore opérationnel.
- Reset password en développement (SendGrid/Resend en attente).

---

### ⚠️ Difficultés rencontrées
| Problème | Cause | Solution |
|-----------|--------|----------|
| Erreur réseau Expo | Mauvaise URL API | Fix du helper `http.ts` |
| MFA non relié | Manque appel `/auth/mfa/verify-totp` | Connecter `tempSessionId` côté front |
| Email reset inactif | Service mail non configuré | En attente clé SendGrid |

---

### 📊 Évaluation
| Aspect | Résultat |
|--------|-----------|
| Backend | ✅ Stable et complet |
| Frontend | ⚙️ 90 % terminé (reste reset + MFA call) |
| Collaboration | 🟢 Bonne coordination avec binôme |
| Réunions | Tous les 2 jours pour synchroniser Auth |

---

## 🤝 Collaboration & Méthodologie

- Communication fluide entre les deux membres (Discord + VSCode Live Share).
- Répartition claire : Haggui (Backend + sécurité + tests) / Tom (Frontend + intégration UI).
- Utilisation du **Kanban** (GitHub Projects) pour suivre les tâches.
- Aucune difficulté majeure de collaboration.
- Dépannages mutuels sur Prisma et Docker.

---

## 🏁 Conclusion générale

Le projet LockFit a atteint un **niveau de maturité solide côté backend**, avec :
- Trois modules majeurs validés (Workouts, Planning, Auth).
- Des **tests automatisés** garantissant la fiabilité (scripts `test_*.sh`).
- Un environnement complet maîtrisé : Docker, Prisma, Render, Cloudflare, MFA.

Côté frontend, la base est stable : navigation Expo Router, écrans complets, SecureStore fonctionnel.
Les derniers sprints viseront à finaliser :
- le **reset password**,
- la **liaison MFA**,
- et l’écran **Planning**.

> L’équipe a su surmonter les obstacles techniques (Docker, Prisma, tunnels HTTPS) en autonomie, avec une répartition équilibrée et une communication continue.
> Le MVP est désormais prêt pour les ultimes finitions avant le **Demoday**.

---

✍️ **Auteurs :**
- [Haggui Razafimaitso](https://github.com/hagguishel) — Backend, sécurité, tests E2E, infrastructure Docker
- [Tom Lagarde](https://github.com/tmlgde) — Frontend, UI, intégration Auth, gestion de compte

---

## 📋 Suivi de projet Trello

🔗 [Tableau Trello — LockFit](https://trello.com/b/vIp1gBXf/trello-lockfit)

Ce tableau a servi à organiser les sprints, suivre la progression des tâches (Back / Front),
et prioriser les fonctionnalités du MVP jusqu’au Demoday.


📅 **Version :** Rétrospective complète — Sprints 3 à 6 (Octobre 2025)
