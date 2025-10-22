# 🏋️ LockFit — Refonte Frontend : Onglet « Mes entraînements »

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

## 🧩 Exemple visuel (maquette Figma)
```
╭────────────────────────────────────────╮
│  Mes entraînements        [📅]          │
│  ⭠ ○○●○○○○ ⭢                       │
│  Workouts du jour                       │
│  🏋️ Aucun workout prévu aujourd’hui     │
│  [ + CRÉER UN WORKOUT ]                │
╰────────────────────────────────────────╯
```

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

## ⚠️ Problèmes rencontrés

### ❌ Erreur « Network request failed »
> Exemple :
> `Échec réseau vers https://kilometers-reader-gates-shades.trycloudflare.com/api/v1/api/v1/workouts`

**Cause** : `EXPO_PUBLIC_API_URL` contenait déjà `/api/v1`.
**Correction** :
```bash
EXPO_PUBLIC_API_URL=https://kilometers-reader-gates-shades.trycloudflare.com
```
➡️ Redémarrer Expo :
`npx expo start --clear`

### ⚙️ Vérifications backend / tunnel
- Cloudflared actif (`ps aux | grep cloudflared`)
- URL du tunnel HTTPS fonctionnelle
- Pas de port 3001 exposé en HTTP clair (iOS/Android refusent le HTTP)

---

## ✅ Résultat attendu
- Interface identique à la maquette Figma
- Thème et spacing uniformes
- Écran prêt pour connexion backend `/api/v1/workouts?from&to`
- Code 100 % typé et factorisé (thème, layout, typo)

---

## 🔜 Étape suivante (Backend)
Aligner l’API NestJS avec le front :
- [ ] Endpoint `GET /workouts?from&to` pour filtrer par jour/semaine
- [ ] Retour JSON `{ items, total }` au même format que `listWorkouts()`
- [ ] Gestion des erreurs HTTP cohérente (500/422 → message UI)
- [ ] Tests E2E pour le module `workouts`

---

**Auteur :** Haggui Razafimaitso
**Date :** 2025-10-22
**Version :** v1.0 – Front “Mes entraînements” finalisé
