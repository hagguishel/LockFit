# 📅 Planning & Organisation — LockFit (MVP aligné aux User Stories)

## 🎯 Ordre de priorité MVP (validé)
1. **Gestion des entraînements & planning** (US-PLAN-01 → US-PLAN-04)
2. **Comptes & sécurité** (US-ACCT-01 → US-ACCT-06)
3. **Suivi des performances** (US-STATS-01 → US-STATS-02)

➡️ Le reste (notifications, gamification, social) = extensions **post-MVP**.

---

## 🗓️ Planning prévisionnel (6 semaines restantes)

| Semaine | Période | User Stories / Tâches principales | Livrable attendu |
|---------|---------|-----------------------------------|-----------------|
| **3 (en cours)** | 23 – 29 sept. | **Entraînements** : CRUD séance (US-PLAN-01), catalogue exercices (US-PLAN-02) | API & UI basiques reliées |
| **4** | 30 sept. – 6 oct. | **Entraînements** : Planning (US-PLAN-03), suivi exécution (US-PLAN-04) | Gestion complète des séances & planning |
| **5** | 7 – 13 oct. | **Comptes & sécurité** : Création compte (US-ACCT-01), Auth forte MFA (US-ACCT-02) | Comptes sécurisés avec MFA |
| **6** | 14 – 20 oct. | **Comptes & sécurité** : Connexion/déconnexion (US-ACCT-03), reset password (US-ACCT-04) | Auth complète & recovery |
| **7** | 21 – 27 oct. | **Comptes & sécurité** : Suppression compte (US-ACCT-05), avatar (US-ACCT-06) | Profil complet & gestion RGPD |
| **8** | 28 oct. – 3 nov. | **Suivi performances** : Historique (US-STATS-01), Statistiques (US-STATS-02) | Historique & stats visibles |
| **Demoday** | 11 nov. | Démo publique du MVP complet | Présentation finale |

---

## 🧩 Dépendances & Séquencement
- **Entraînements** → requis avant comptes/stats (sinon rien à suivre).
- **Comptes & sécurité** → requis pour lier les séances à un utilisateur et protéger les données.
- **Suivi performances** → dépend des séances déjà créées et du profil utilisateur.

---

## 🔄 Rituels Agile
- **Daily** (15 min) → avancement & blocages.
- **Review** (fin de sprint) → démo livrables.
- **Retro** (fin de sprint) → amélioration continue.

---

## 📚 Ressources utiles
- Backlog détaillé des User Stories (MoSCoW).
- [Scrum.org – Sprint Planning Guide](https://www.scrum.org/resources/what-is-sprint-planning)
- [Agile Business – MoSCoW Prioritisation](https://www.agilebusiness.org/dsdm-project-framework/moscow-prioririsation.html)

