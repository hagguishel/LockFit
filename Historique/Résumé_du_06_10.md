# LockFit — Récapitulatif & Clôture Backend (Sprints 1 → 3)
_Date de génération : 2025-10-06 12:11 UTC_

## 🎯 Objectif
Clôturer le travail backend réalisé sur **LockFit** (NestJS + Prisma + PostgreSQL) : environnement, Workouts, Planning & Jours, tests et scripts. Ce document sert de **source de vérité** pour l’état du back avant d’attaquer le front.

---

## ✅ Sprints validés

### Sprint 1 — Préparation (DONE)
- Mise en place de l’environnement Node/NestJS + PostgreSQL + Prisma.
- Schema initial Prisma + migrations de base.
- Module **Workouts** (structure, service, contrôleur, scripts).
- Scripts de vérification rapides.

### Sprint 2 — Workouts (DONE)
- **CRUD Workouts** : `POST /workouts`, `GET /workouts`, `GET /workouts/:id`, `PATCH /workouts/:id`, `DELETE /workouts/:id`.
- **Finish** d’un workout : `POST /workouts/:id/finish` (marque une séance terminée hors planning).
- Tests de bon fonctionnement (smoke + e2e).

### Sprint 3 — Planning (BACK) (DONE)
- Modèles & migrations :
  - `Planning(id, nom, debut, fin)`
  - `PlanningJour(id, planningId, date, workoutId, note?, status, doneAt?)`
  - **Unicité**: `@@unique([planningId, date, workoutId])`
  - **Index**: `@@index([planningId, date])`
  - **Enum**: `PlanningJourStatus = PLANNED | DONE`
- Endpoints **Planning** :
  - `POST /plannings` → crée un planning (règle: `debut ≤ fin`)
  - `GET /plannings?from&to&page&limit` → liste paginée + chevauchement de période
  - `GET /plannings/:id` → détail + `jours[]` triés + `workout`
- Endpoints **Jours de planning** :
  - `POST /plannings/:id/jours` → ajoute un jour (date dans [debut..fin], workout existant, unicité jour+workout)
  - `PATCH /plannings/:planningId/jours/:jourId` → change `date` et/ou `workoutId`, **vérifie** période & unicité
  - `DELETE /plannings/:planningId/jours/:jourId` → supprime, **204 No Content**
  - `POST /plannings/:planningId/jours/:jourId/finish` → `status=DONE`, `doneAt=now()`, **idempotent 200 OK**

---

## 🧱 Architecture (haut niveau)
- **NestJS** (Controllers ↔ Services) + **Prisma** (accès DB) + **PostgreSQL**.
- **Relations** :
  - `Planning` 1—* `PlanningJour`
  - `PlanningJour` *—1 `Workout`

### Extrait `schema.prisma` (parties clés)
```prisma
model Planning {
  id    String @id @default(cuid())
  nom   String
  debut DateTime
  fin   DateTime
  jours PlanningJour[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum PlanningJourStatus {
  PLANNED
  DONE
}

model PlanningJour {
  id         String   @id @default(cuid())
  date       DateTime
  note       String?
  planning   Planning @relation(fields: [planningId], references: [id], onDelete: Cascade)
  planningId String
  workout    Workout  @relation(fields: [workoutId], references: [id], onDelete: Restrict)
  workoutId  String
  status     PlanningJourStatus @default(PLANNED)
  doneAt     DateTime?
  @@unique([planningId, date, workoutId])
  @@index([planningId, date])
}
```

---

## 🔐 Conventions & Règles Métier
- **ID**: CUID (`@default(cuid())`). **Pas** d’UUID. Les DTO valident via `@IsString()` (+ `@Length(20, 40)` pour `workoutId`).
- **Dates**: format ISO. Pour les **jours**, on normalise à **00:00:00Z** pour éviter les soucis de fuseau (`toDateOnly()` dans le service).
- **Unicité**: un même `workoutId` ne peut pas être planifié **deux fois le même jour** **dans le même planning**.
- **Erreurs**:
  - `400 Bad Request` → date invalide / hors période / `workoutId` invalide (format ou FK)
  - `404 Not Found` → planning/jour/workout introuvable ou **jour n’appartenant pas au planning**
  - `409 Conflict` → collision d’unicité `(planningId, date, workoutId)`
- **HTTP Codes**:
  - `POST /plannings/:planningId/jours/:jourId/finish` → **200 OK** (idempotent)
  - `DELETE /plannings/:planningId/jours/:jourId` → **204 No Content**

---

## 📚 Référence API (extraits)
> Préfixe global : `/api/v1` (configuré dans `principal.ts`).

### Planning
- **Créer**
  `POST /plannings`
  ```json
  {
    "nom": "Semaine 41",
    "debut": "2025-10-05",
    "fin": "2025-10-10"
  }
  ```

- **Lister (chevauchement)**
  `GET /plannings?from=2025-10-01&to=2025-10-31&page=1&limit=20`

- **Détail**
  `GET /plannings/:id` → renvoie `jours[]` triés avec `workout` embarqué.

### Jours
- **Ajouter**
  `POST /plannings/:id/jours`
  ```json
  {
    "date": "2025-10-06",
    "workoutId": "<cuid>",
    "note": "optionnel"
  }
  ```

- **Modifier**
  `PATCH /plannings/:planningId/jours/:jourId`
  ```json
  {
    "date": "2025-10-07",
    "workoutId": "<cuid>"
  }
  ```

- **Terminer**
  `POST /plannings/:planningId/jours/:jourId/finish` → `status=DONE`, `doneAt`

- **Supprimer**
  `DELETE /plannings/:planningId/jours/:jourId` → **204**

---

## 🧪 Tests & Scripts

### Scripts bash
- **Smoke test** : `tests/test_planning_jours.sh`
  Flux heureux (create → add → patch → finish → delete).
- **Tests complets** : `tests/test_planning_jours_full.sh`
  Couvre **400/404/409** + **idempotence** + `DELETE` double / mauvais planning.

> Utilisation :
```bash
chmod +x tests/test_planning_jours.sh tests/test_planning_jours_full.sh
./tests/test_planning_jours_full.sh       # si préfixe /api/v1
./tests/test_planning_jours_full.sh ""    # si pas de préfixe
```

### E2E Jest (recommandé)
- `tests/plannings.e2e-spec.ts` : ajoute des cas équivalents aux scripts bash.
- Intégré à la CI pour verrouiller le back.

---

## 🛠️ Commandes utiles
```bash
# Lancer l’API (port 3000 par défaut)
npm run start:dev

# Prisma
npx prisma migrate dev -n "<name>"
npx prisma migrate reset      # ⚠️ reset DB de dev
npx prisma studio

# Tests (exemples)
./tests/test_planning_jours.sh
./tests/test_planning_jours_full.sh
```

---

## 🩹 Troubleshooting
- **404 sur /plannings** : utilise `/api/v1/plannings` (prefix global).
- **201 sur /finish** : route corrigée avec `@HttpCode(HttpStatus.OK)` (assure un redémarrage).
- **`IsUUID()` qui casse** : IDs = **CUID** → utiliser `@IsString()` (+ `@Length`) et vérifier l’existence en DB.
- **EADDRINUSE: 3000** : un process utilise déjà le port.
  ```bash
  fuser -k 3000/tcp  # ou lsof -i :3000 ; kill -9 <PID>
  ```
- **jq manquant** : `sudo apt-get install -y jq`

---

## 🗂️ Définition de Fini (DoD) — Backend Planning
- [x] Migrations `status` + `doneAt` sur `PlanningJour`
- [x] Endpoints **POST/PATCH/DELETE/FINISH** pour les jours
- [x] Validations (période, existence workout, unicité)
- [x] Idempotence `/finish` & HTTP codes normalisés
- [x] Scripts bash **happy path + erreurs** (ALL CHECKS PASS)
- [x] Base prête pour le **front Détail Planning**

---

## 🔭 Étapes suivantes (Front & Sécurité)
- **Front — Écran Détail Planning** : liste des jours, badge `PLANNED/DONE`, bouton “Marquer comme fait”, actions PATCH/DELETE, toasts d’erreurs.
- **Sécurité (Sprint suivant)** : Auth JWT, ownership par utilisateur (filtrage par `userId` sur Planning/Workout/PlanningJour), MFA (si scope), guards/roles.

---

## 📝 Changelog (commits suggérés)
- `feat(api): PATCH/DELETE jours de planning avec validations période et unicité`
- `feat(api): finish d’un jour de planning (status DONE + doneAt, idempotent 200)`
- `fix(dto): accepter CUID (string) pour workoutId au lieu d’UUID`
- `fix(api): DELETE jours → 204 No Content`
- `chore(tests): add full bash checks (400/404/409 + idempotence)`
- `docs: récapitulatif sprints 1→3 (backend)`

---

**Fin de récap — backend verrouillé, prêt pour le front.** ✅
