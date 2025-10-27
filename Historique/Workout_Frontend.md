# 🏋️ LockFit — Module Complet « Workouts » (Frontend + Logique API)

## 🧭 Vue d’ensemble
Ce document unifie la **refonte frontend** (écran “Mes entraînements”) et la **logique complète du module Workouts** (liste, création, détail, API).
Il constitue la documentation de référence pour le module *Workouts* de LockFit :
> - Design & palette LockFit
> - Architecture frontend (Expo Router)
> - Logique API & intégration backend
> - Fonctionnement complet utilisateur

---

# 🧩 Phase 1 — Refonte Frontend : Onglet « Mes entraînements »

## 🎯 Objectif
Mettre à jour l’onglet **Mes entraînements** pour correspondre au design Figma :
- Interface moderne en **dark mode LockFit**
- Bandeau semaine interactif (sélection du jour)
- Affichage de la liste des workouts du jour
- Gestion des états (chargement, vide, erreur)
- Bouton flottant **+** pour créer un nouvel entraînement
- Palette, espacements et typographie centralisés

---

## 📁 Fichiers créés / modifiés

| Type | Fichier | Rôle |
|------|----------|------|
| 🆕 | `src/theme/colors.ts` | Palette globale LockFit (aucune couleur codée en dur) |
| 🆕 | `src/theme/layout.ts` | Grille d’espacement & radius (système 8 pt) |
| 🆕 | `src/theme/typography.ts` | Échelle typographique sémantique (h1, h2, body, mute, cta) |
| ✏️ | `app/workouts/index.tsx` | Refonte complète de l’écran (visuel, logique inchangée) |

---

## 🎨 Palette officielle LockFit

```ts
bg:        #0F1420   // fond global
surface:   #121927   // cartes / blocs
surfaceAlt:#0B0D14   // variantes
border:    #232A3A
primary:   #12E29A   // vert LockFit
onPrimary: #061018
text:      #E6F0FF
muted:     #98A2B3
dot:       #1C1F2A
danger:    #FF6B6B
success:   #2ED573
warning:   #FFD166
```

### Tokens complémentaires
```ts
radius : { sm:8, md:12, lg:16, xl:22 }
spacing: { xs:6, sm:12, md:16, lg:24 }
shadow.card: elevation 6, rayon 8, opacité 0.25
```

---

## 📐 Layout & Typographie

**layout.ts**
→ unifie les espacements (`gap`, `inset`, `section`) et les radius.

**typography.ts**
→ définit les styles texte sémantiques :
`h1`, `h2`, `body`, `mute`, `cta`.

---

## 💻 Écran `app/workouts/index.tsx`

### Structure
1. **Header**
   - Titre *Mes entraînements*
   - Icône calendrier (lien `/calendar`)
2. **WeekStrip**
   - 7 pastilles (Dim → Sam)
   - Flèches navigation semaine précédente/suivante
3. **Contenu**
   - État *chargement* → spinner
   - État *erreur* → carte rouge avec bouton *Réessayer*
   - État *vide* → emoji 🏋️‍♂️ + CTA *CRÉER UN WORKOUT*
   - État *liste* → cartes d’entraînements
4. **FAB** (floating action button)
   - Bouton rond vert LockFit `+` → `/workouts/new`

### Données
- Chargées via `listWorkouts()` depuis `src/lib/workouts.ts`
- Filtrage par jour/semaine prévu dans l’étape 2 (back)

### États gérés
| État | Description | UI |
|------|--------------|----|
| `loading` | attente de la réponse API | spinner centré |
| `error` | erreur réseau ou serveur | carte d’erreur rouge |
| `items.length === 0` | aucun workout du jour | carte vide avec bouton création |
| sinon | workouts disponibles | liste de cartes |

---

## 🧠 Tests de validation (checklist)

- [x] UI conforme à la maquette (bandeau, couleurs, typographies)
- [x] Boutons actifs (`Réessayer`, `Créer un workout`, `FAB +`)
- [x] `listWorkouts()` appelé au montage + au retour d’écran
- [x] Pull-to-refresh fonctionnel
- [x] Palette appliquée partout (aucun hex codé en dur)
- [x] Espacements cohérents via `layout.ts`
- [x] Typo cohérente via `typography.ts`

---

# 🧩 Phase 2 — Module Complet Workouts (Frontend + API)

## 📘 Objectif général

Le module **Workouts** gère tout le cycle de vie d’un entraînement dans LockFit :
- consultation de la liste des séances planifiées ou terminées ;
- création d’un nouvel entraînement ;
- affichage détaillé d’une séance ;
- ajout d’exercices, validation des séries, et fin de séance.

Ce module connecte le **frontend React Native (Expo Router)** avec le **backend NestJS/Prisma** via les fonctions d’API définies dans `src/lib/workouts.ts`.

---

## 🧱 Structure du module

```
app/
└── (tabs)/
    └── workouts/
        ├── index.tsx   → Liste des entraînements
        ├── new.tsx     → Création d’un entraînement
        └── [id].tsx    → Détail d’un entraînement
```

Chaque écran correspond à une route dans Expo Router :
- `/workouts` → liste
- `/workouts/new` → création
- `/workouts/[id]` → détail d’une séance spécifique

---

## 🔍 Fichier `[id].tsx` — Détail d’un entraînement

### 🎯 Rôle
Affiche et gère **une séance précise** (vue individuelle).

### 📦 Données
- `getWorkout(id)` → récupération du workout
- `finishWorkout(id)` → marquer terminé
- `addWorkoutItem()` → ajouter un exercice
- `doneSets` → gestion locale de la progression

### 🧩 Sections principales
- Carte d’info générale (note, statut)
- Bouton “Marquer terminé”
- Liste des exercices et séries (✓ / •)
- Formulaire d’ajout d’exercices
- Bouton “Réinitialiser la progression”
- Bouton “Retour”

### ⚙️ Intégration API

| Fonction | Endpoint |
|-----------|-----------|
| listWorkouts | `GET /api/v1/workouts` |
| createWorkout | `POST /api/v1/workouts` |
| getWorkout | `GET /api/v1/workouts/:id` |
| addWorkoutItem | `POST /api/v1/workouts/:id/items` |
| finishWorkout | `PATCH /api/v1/workouts/:id/finish` |

---

## 🧭 Navigation & UX Flow

```mermaid
graph TD
  A[/workouts (index.tsx)/] -->|appuie sur +| B[/workouts/new/]
  B -->|création OK| C[/workouts/[id]/]
  A -->|tape sur une carte| C
  C -->|retour| A
```

---

## 💬 Notes techniques

- Compatible Android / mobile réel (Cloudflare tunnel)
- Expo Router pour navigation (`Link`, `router.push`, `router.back`)
- SafeAreaView sur tous les écrans
- Thème, typographie, layout centralisés

---

## ✅ Résumé final

| Fonctionnalité | État |
|----------------|------|
| Liste des workouts (GET) | ✅ |
| Création d’un workout | ✅ |
| Détail d’un workout | ✅ |
| Ajout d’un exercice | ✅ |
| Validation des sets | ✅ |
| Marquer terminé | ✅ |
| Thème LockFit global | ✅ |
| Semaine interactive | ✅ |
| Suppression / édition | 🚧 À venir |
| Intégration planning | 🚧 À venir |

---

**Auteur :** Haggui Razafimaitso
**Dernière mise à jour :** Octobre 2025
**Version :** v2.0 — Module complet “Workouts” (Front + API)
