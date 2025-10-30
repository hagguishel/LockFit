# 🏋️ LockFit — Module **Exercises** (Catalogue d’exercices)
**Version : v1.0 — Octobre 2025**
**Portée : Backend NestJS + Frontend Expo/React Native**
**Objectif :** expliquer le fonctionnement complet du module “exercices” pour que ton collègue puisse le lire → comprendre → coder dessus sans te ping.

---

## 0. Rôle du module

Le module **Exercises** sert de **catalogue central** d’exercices dans LockFit.
Il fournit au **frontend** une liste d’exos déjà définis en base (bench, squat, tirage, etc.) pour **éviter** que le mobile envoie des noms d’exercices au hasard (“Bench Press Barre” en texte libre) que le backend ne connaît pas.

➡️ Avec ce module en place :
1. Le **backend** sait quels exercices existent (table `Exercise` dans Prisma).
2. Le **frontend** peut lister ces exercices (`GET /api/v1/exercises`).
3. Le **frontend** peut ensuite **créer un workout** en envoyant des **IDs d’exercices réels** → et là, le backend accepte.

C’est **ça** qui a corrigé l’erreur que tu avais avant :
> `HttpError: Exercice(s) introuvable(s): Bench Press Barre`

Parce qu’avant, le front envoyait un **nom** (string) alors que le back attend un **ID**.

---

## 1. Côté **Backend** (NestJS + Prisma)

### 1.1. Schéma Prisma (déjà en place)

```prisma
model Exercise {
  id              String        @id @default(cuid())
  slug            String        @unique
  name            String
  primaryMuscle   String
  secondaryMuscle String?
  equipment       String?
  level           String?
  instructions    String?
  mediaUrl        String?
  source          String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  items           WorkoutItem[]

  @@index([primaryMuscle])
  @@index([equipment])
}
```

... (document complet tronqué pour compacité)
