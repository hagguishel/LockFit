📊 Rapport de progression — 2025-09-26 (LockFit API)
✅ Objectif(s) atteint(s)

Avoir une API NestJS fonctionnelle pour les entraînements : démarrage OK, sécurité de base (Helmet + CORS), Prisma branché sur Postgres, validation DTO active, CRUD complet + endpoint /finish, et tests cURL concluants.

📦 Installations & dépendances

Runtime/outil : @nestjs/common @nestjs/core @nestjs/platform-express rxjs reflect-metadata

Sécurité & HTTP : helmet

Validation : class-validator class-transformer

DTO utilitaire : @nestjs/mapped-types

Base de données : prisma (CLI) + @prisma/client

Dev : typescript ts-node @types/node

🛠️ Config & bootstrap

src/principal.ts

Helmet activé

CORS configuré (origins dev)

ValidationPipe({ whitelist:true, transform:true })

Préfixe global : /api/v1

Port : 3000

.env : DATABASE_URL=postgresql://...

tsconfig.json : décorateurs activés, outDir: dist, etc.

package.json : start:dev avec ts-node src/principal.ts

🧩 Fichiers créés / modifiés (par domaine)
Commun

src/commun/health.controller.ts
GET /api/v1/health → { ok:true, service:"lockfit-api" }

Prisma

prisma/schema.prisma
Model Workout : id, title, finishedAt?, note?, createdAt, updatedAt

Migration & generate exécutés (DB locale OK)

Workouts (MVP)

src/workouts/dto/create-workout.dto.ts
title: string (non vide, ≤ 250)

src/workouts/dto/update-workout.dto.ts
PartialType(CreateWorkoutDto) + finishedAt?: ISO string

src/workouts/workouts.service.ts
create · findAll · findOne(404) · update(partiel + Date) · remove · finish(now)

src/workouts/workouts.controller.ts
Routes :

POST /workouts

GET /workouts

GET /workouts/:id

PATCH /workouts/:id

DELETE /workouts/:id

POST /workouts/:id/finish

🧪 Vérifs cURL (extraits)

Création :

POST /api/v1/workouts → { id, title, createdAt, updatedAt }

Liste :

GET /api/v1/workouts → [...]

Détail / Mise à jour / Finish / Suppression :

GET|PATCH|POST /workouts/:id, DELETE /workouts/:id → OK (après correction de la route et usage d’un id réel)

🔚 État de la checklist du sprint

Service + Controller (CRUD + /finish) avec DTO → ✅ Fait

Modèle Workout : finishedAt ajouté ; createdAt/updatedAt OK.
items Json et plannedAt pas encore ajoutés (prévu semaine 4).

Tests cURL/Postman → ✅ Fait

🔜 Préparation semaine prochaine (Semaine 4 — “Gestion complète des séances & planning”)

Objectif : couvrir le planning et le suivi d’exécution minimal côté API.

Étendre le modèle Prisma

plannedAt DateTime? (programmation d’une séance)

items Json? (contenu de séance : exos/séries/rep/poids – structure flexible MVP)

npx prisma migrate dev -n add_plannedAt_and_items && npx prisma generate

DTO & Service

CreateWorkoutDto / UpdateWorkoutDto : ajouter plannedAt? (ISO) et items? (JSON)

workouts.service.ts : mapper plannedAt (new Date(...)) et items (pass-through JSON)

Routes planning & suivi

PATCH /workouts/:id → accepter plannedAt & items

GET /workouts?from=&to=&planned=true|false
(RangeQueryDto simple : filtres par période et par statut planifié/terminé)

Qualité & DX

Swagger minimal (@nestjs/swagger) pour tester vite les payloads

Tests rapides : cas “PATCH vide” ⇒ 400, filtres date, sérialisation items

Livrable attendu fin Semaine 4 :

Séances créables, programmables (plannedAt), éditables (titre/items), filtrables par date, et marquées terminées (finishedAt).

🤝 Branche & commit (suggestion)

Branche : feat/workouts-planning-and-items

Commit init : Add plannedAt & items (schema + DTO + service + routes)