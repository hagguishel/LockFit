# 📅 Planning et Organisation — Projet LockFit (MVP)

Le projet est structuré autour des **User Stories définies sur GitHub**,
organisées pour livrer rapidement une version fonctionnelle de la **gestion des entraînements**,
puis ajouter progressivement la **sécurisation des comptes** et le suivi complet des performances.

---

## 🗓️ Planning prévisionnel (8 semaines)

| Semaine | Dates | User Stories / Tâches principales | Priorité | Responsable |
|---------|-------|-----------------------------------|-----------|-------------|
| **1** | 16 – 22 sept. | - Familiarisation stack : Node.js, TypeScript, React Native, NestJS, PostgreSQL<br>- Mise en place environnements (mobile, back-end, DB) | Must | Toute l’équipe |
| **2** | 23 – 29 sept. | - Approfondissement stack (React Native, NestJS, Prisma)<br>- Préparation structure projet (front/back, DB, GitHub)<br>- Priorisation User Stories MVP | Must | Dev backend & mobile |
| **3** | 30 sept. – 6 oct. | - US1 : Création séance (exercices, séries, reps, charges, repos)<br>- US2 : Modification & suppression exercices<br>- Première interface mobile (saisie séance) | Must | Dev mobile + backend |
| **4** | 7 – 13 oct. | - US3 : Historique entraînements (séances passées)<br>- US4 : Suivi basique performances (volume total, progression simple)<br>- Intégration graphiques simples | Must | Dev backend + mobile |
| **5** | 14 – 20 oct. | - US5 : Création compte + gestion profil (objectif, niveau, matériel)<br>- US6 : Authentification simple (login/logout) | Must | Dev backend |
| **6** | 21 – 27 oct. | - US7 : Sécurisation auth avec Argon2 (hash mot de passe)<br>- US8 : Sessions avec JWT | Must | Dev backend |
| **7** | 28 oct. – 3 nov. | - US9 : Ajout MFA (TOTP/Passkeys)<br>- Tests fonctionnels intermédiaires (séances, historique, stats, comptes) | Must | Dev backend + QA |
| **8** | 4 – 10 nov. | - Stabilisation + correction bugs<br>- Documentation technique (README, guide installation, guide rapide)<br>- Préparation support présentation (slides + démo) | Must | Toute l’équipe |
| **Demoday** | 11 nov. | - Soutenance & démonstration du MVP LockFit | Must | Toute l’équipe |

---

## 🔑 Notes de planification
- **Méthode Agile / Scrum** : sprints hebdomadaires avec objectifs clairs.
- **Découpage MoSCoW** : toutes les User Stories listées sont classées Must Have pour le MVP.
- **Durée sprint** : 1 semaine → développement + tests + revue + rétro.
- **Dépendances** :
  - Authentification → nécessaire avant profil/stats.
  - Catalogue exercices → nécessaire avant création séance.
  - Séances → nécessaires avant historique & stats.

---

## 📚 Ressources
- [Scrum.org – Sprint Planning Guide](https://www.scrum.org/resources/what-is-sprint-planning)
- [Agile Business – MoSCoW Prioritisation](https://www.agilebusiness.org/dsdm-project-framework/moscow-prioririsation.html)

---
