# 📅 Planning et Organisation — Projet LockFit (MVP)

Le projet est structuré autour des **User Stories définies sur GitHub**,
organisées pour livrer rapidement une version fonctionnelle de la **gestion des entraînements**,
puis ajouter progressivement la **sécurisation des comptes** et le suivi des performances.

---

## 🗓️ Planning prévisionnel (8 semaines)

| Semaine | Dates | User Stories / Tâches principales | Story Points | Livrable attendu | Responsable |
|---------|-------|-----------------------------------|--------------|-----------------|-------------|
| **1** | 16 – 22 sept. | - Familiarisation stack (Node.js, TS, React Native, NestJS, PostgreSQL)<br>- Mise en place environnements (mobile + back-end + DB) | 8 pts | Environnement configuré et projet initialisé | Toute l’équipe |
| **2** | 23 – 29 sept. | - Approfondissement stack (React Native, NestJS, Prisma)<br>- Préparation structure projet (front/back, DB, GitHub)<br>- Priorisation User Stories MVP | 10 pts | Projet structuré (front/back/DB) + backlog priorisé | Toute l’équipe |
| **3** | 30 sept. – 6 oct. | - US1 : Création séance (exos, séries, reps, charges, repos)<br>- US2 : Modification & suppression exos<br>- Première UI mobile (saisie séance) | 20 pts | Prototype mobile : création + édition séance basique | Toute l’équipe |
| **4** | 7 – 13 oct. | - US3 : Historique entraînements (séances passées)<br>- US4 : Suivi basique performances (volume, progression simple)<br>- Graphiques simples progression | 22 pts | Historique + stats basiques visibles sur mobile | Toute l’équipe |
| **5** | 14 – 20 oct. | - US5 : Création compte + gestion profil (objectif, niveau, matériel)<br>- US6 : Auth simple (login/logout) | 18 pts | Comptes utilisateurs fonctionnels avec profil simple | Toute l’équipe |
| **6** | 21 – 27 oct. | - US7 : Sécurisation auth avec **Argon2** (hash password)<br>- US8 : Sessions JWT | 16 pts | Authentification sécurisée (hash + JWT sessions) | Toute l’équipe |
| **7** | 28 oct. – 3 nov. | - US9 : Ajout **MFA** (TOTP/Passkeys)<br>- Tests intermédiaires (séances, historique, stats, comptes) | 24 pts | MVP complet sécurisé + tests intermédiaires validés | Toute l’équipe |
| **8** | 4 – 10 nov. | - Stabilisation + correction bugs<br>- Documentation technique (README, guide installation, guide rapide)<br>- Préparation support présentation (slides + démo) | 15 pts | MVP final stable + doc complète + support de soutenance | Toute l’équipe |
| **Demoday** | 11 nov. | - Soutenance et démo du MVP LockFit | - | Présentation publique et démonstration | Toute l’équipe |

---

## 🔄 Rituels Agile intégrés
- **Daily Stand-up** (15 min chaque matin) → avancement + blocages.
- **Sprint Review** (fin de semaine) → démonstration des livrables.
- **Sprint Retrospective** (fin de semaine) → amélioration continue.

---

## 📊 Estimations & Priorités
- Méthode : **MoSCoW** → toutes les US listées sont **Must Have** pour le MVP.
- **Capacité par sprint** : ~15 à 25 points en fonction des US.
- **Dépendances clés** :
  - Authentification → nécessaire avant profils/stats.
  - Catalogue exercices → nécessaire avant création séance.
  - Séances → nécessaires avant historique & stats.

---

## 📚 Ressources
- [Scrum.org – Sprint Planning Guide](https://www.scrum.org/resources/what-is-sprint-planning)
- [Agile Business – MoSCoW Prioritisation](https://www.agilebusiness.org/dsdm-project-framework/moscow-prioririsation.html)

---
