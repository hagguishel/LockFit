# 🏋️ LockFit — Module « Workouts »
**Version : v2.0 — Octobre 2025**

## 0. Rôle du module
Le module **Workouts** gère tout le cycle de vie d’un entraînement utilisateur :
- Voir mes entraînements
- Suivre ma progression
- Marquer mes séances comme terminées
- (à venir) Créer une séance complète
- (à venir) Détail avec exercices / séries
- (à venir) Planifier dans la semaine

Le frontend (Expo React Native) est branché sur ton backend NestJS / Prisma, pas une fausse data.

---

## 1. Architecture globale

```txt
app/
└── (tabs)/
    └── workouts/
        ├── index.tsx      ← Écran liste "Mes entraînements" (LIVRÉ ✅)
        ├── [id].tsx       ← Détail d'un workout (À FAIRE 🚧 étape 2)
        └── new.tsx        ← Création d'un workout (À FAIRE 🚧 étape 3)

src/
└── lib/
    └── workouts.ts       ← Client API pour parler au backend NestJS (LIVRÉ ✅)
```

### 📌 Les routes d’API côté backend utilisées
- `GET /workouts` → lister les entraînements
- `GET /workouts/:id` → récupérer une séance précise
- `POST /workouts` → créer une séance
- `PATCH /workouts/:id` → modifier une séance
- `DELETE /workouts/:id` → supprimer une séance
- `POST /workouts/:id/finish` → marquer comme terminée

Ces routes existent déjà dans ton `WorkoutsController` et ton `WorkoutsService` (NestJS), connectés à Prisma.

---

## 2. Données manipulées côté front

### Type `Workout` (exemple simplifié)
Chaque `Workout` ressemble à :
```ts
{
  id: string,
  title: string,
  note?: string,
  createdAt: string,
  finishedAt?: string | null,
  items: Array<{
    order: number,
    exercise: {
      id: string,
      name: string,
      primaryMuscle: string,
    },
    sets: Array<{
      reps: number,
      weight?: number,
      rest?: number,
      rpe?: number,
    }>
  }>
}
```

Points importants :
- `finishedAt != null` = la séance est considérée comme terminée.
- `items` = les exercices prévus dans la séance.
- Chaque `item` a des `sets`, ce qui nous permet de calculer : volume, durée estimée, etc.

---

## 3. API Frontend (`src/lib/workouts.ts`)

Ce fichier encapsule toutes les requêtes réseau vers le backend.
Aujourd’hui il contient entre autres :

```ts
// Lister toutes les séances
export async function listWorkouts(params?: { from?: string; to?: string })

// Récupérer une séance précise
export async function getWorkout(id: string)

// Créer une séance
export async function createWorkout(input: CreateWorkoutInput)

// Mettre à jour une séance
export async function updateWorkout(id: string, patch: Partial<CreateWorkoutInput>)

// Supprimer une séance
export async function deleteWorkout(id: string)

// Marquer une séance comme terminée
export async function finishWorkout(id: string)
```

💡 Résumé :
- `listWorkouts()` est utilisé en vrai dans l’écran `index.tsx`.
- `deleteWorkout()` est utilisé en vrai pour retirer une séance depuis la liste.
- `getWorkout()`, `finishWorkout()` serviront au détail `/workouts/[id].tsx`.
- `createWorkout()` servira à `/workouts/new.tsx`.

Ton frontend ne fait pas du mock : il discute directement avec le NestJS réel ✅

---

## 4. Écran Liste : `app/(tabs)/workouts/index.tsx` ✅ (LIVRÉ)

### 4.1. Rôle
C’est l’écran “Mes entraînements”.
Il affiche la liste des séances, et permet déjà de supprimer une séance côté backend.

### 4.2. Les features déjà en place

- Chargement initial via `listWorkouts()` (GET /workouts)
- Pull-to-refresh
- Gestion du loading, empty state, et error state
- Affichage d’une carte par séance :
  - Nom du workout
  - Estimation durée (“~9 min”)
  - Nombre total de séries (“4 séries”)
  - Barre de progression
  - Bouton “COMMENCER” ou “TERMINÉ”
  - ET → texte "Terminé ✅" si la séance est finie (`finishedAt` défini)

- Icône poubelle 🗑 par séance
  - Appelle `deleteWorkout(id)` → DELETE /workouts/:id
  - Met à jour `items` et `total` localement pour que ça disparaisse visuellement sans recharger tout

- Navigation prévue :
  - Cliquer sur la carte (ou bouton “COMMENCER”) fait `router.push("/workouts/[id]")`
  - Cet écran détail sera branché à l’étape 2

- FAB vert + en bas à droite
  - `router.push("/workouts/new")`
  - Ce sera l’écran de création de séance (étape 3)

- Bandeau semaine en haut
  - Affiche Dim → Sam
  - Gère "semaine précédente" / "semaine suivante"
  - Garde en mémoire le jour sélectionné
  - Aujourd’hui : purely UI. Demain : ce jour va filtrer la liste (étape 5).

### 4.3. Calculs métiers dans la liste
Dans `index.tsx` on calcule au rendu :

```ts
// nombre total de séries dans la séance
computeTotalSets(workout)

// durée estimée de la séance en minutes
computeEstimatedDurationMin(workout)

// progression: 0 ou 1 selon finishedAt
computeProgressRatio(workout)
```

Ces calculs servent uniquement à l’affichage :
- “~12 min • 5 séries”
- barre de progression verte
- si terminé : on n’affiche plus la durée/séries, on affiche “Terminé ✅” en vert, et le bouton change visuellement (“TERMINÉ”).

### 4.4. États visuels implémentés
| Cas | Affichage |
|-----|-----------|
| `loading === true` | spinner plein écran |
| `error !== null` | carte d’erreur avec bouton “Réessayer” |
| `items.length === 0` | carte vide (“Aucun workout aujourd’hui”) |
| else | FlatList des entraînements |

👉 Résultat : l’app reste utilisable même sans données.

---

## 5. Détail d’un workout : `/workouts/[id].tsx` 🚧 (PROCHAINE ÉTAPE)

Cet écran n’est pas encore dans le code, mais la navigation depuis la liste pointe déjà dessus.

Ce qu’il fera :
- Charger la séance complète (`getWorkout(id)`)
- Afficher :
  - titre
  - statut (Terminé ou pas)
  - exercices
  - séries (reps, poids, rest, RPE)
- Bouton “Marquer terminé” qui appelle `finishWorkout(id)` pour setter `finishedAt` côté backend

Après cette étape :
- Le bouton "COMMENCER" dans la liste devient utile pour de vrai.

---

## 6. Création d’un workout : `/workouts/new.tsx` ⏳

Objectif :
- Depuis l’app, créer une nouvelle séance sans devoir toucher la base à la main.

L’écran permettra :
- saisir un titre (“Push Day”, “Leg Day Strength”)
- ajouter des exercices avec leurs séries
- envoyer le tout via `createWorkout()` (POST /workouts)

Plus tard on branchera une vraie sélection d’exercices depuis la table `Exercise`.

---

## 7. Filtres semaine / jour ⏳

Ton backend supporte déjà `from` et `to` sur `GET /workouts`.
Ton écran a déjà `selectedDay`.

Ce qu’on fera :
- Quand tu tapes sur un jour (“Mar”), on calcule from=00:00, to=23:59.
- On relance `listWorkouts({ from, to })`.
- On n’affiche plus tous les workouts mais juste ceux de ce jour.

C’est ce qui transforme l’écran en un vrai agenda perso d’entraînement.

---

## 8. Auth / multi-utilisateur 🔒 (plus tard)

Ton backend a déjà :
- Utilisateur
- RefreshToken / MFA
- Planning / status (PLANNED / DONE)

Ce qu’on ajoutera plus tard pour faire du vrai multi-user :
- `utilisateurId` dans `Workout`
- Protection des routes pour qu’un user ne voie que SES séances
- Ajout du token (Authorization: Bearer ...) dans les appels `http()`

---

## 9. TL;DR statut actuel

- `/workouts/index.tsx` est en prod dans ton app ✅
  - suppression réelle (`DELETE /workouts/:id`)
  - affichage “Terminé ✅” si finishedAt défini
  - progression visuelle
  - navigation vers détail prête
  - FAB pour création prêt

- `/workouts/[id].tsx` → à créer maintenant (prochaine étape)
- `/workouts/new.tsx` → à faire ensuite

Tu as déjà une base fonctionnelle qui discute avec un backend sérieux. Ce n’est pas une maquette.

---

## 10. Roadmap rapide

1. Détail workout (`/workouts/[id].tsx`) → afficher exos/sets + bouton "Marquer terminé".
2. Création workout (`/workouts/new.tsx`) → créer une séance complète depuis le téléphone.
3. Filtres par jour dans la liste → la barre semaine devient utile.
4. Sélection d’exercices depuis la DB d’exos.
5. Auth utilisateur / isolement des données.

---

Auteur : Haggui Razafimaitso
Dernière mise à jour : Octobre 2025
Version module : v2.0
