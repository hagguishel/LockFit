# 📖 Tâche 5 — SCM & QA LockFit

## 🔁 SCM (gestion du code)
- **Git** avec GitHub.  
- **Branches** :  
  - `main` → prod  
  - `develop` → staging  
  - `feature/...` → nouvelles fonctionnalités  
  - `fix/...` → correctifs  
- **Commits** : conventionnels (`feat:`, `fix:`, …). Tous les commit se feront en français
pour une meilleure compréhension de l'avancée du projet.
- **Pull Requests** : obligatoires, avec revue de code. Chaque push se fera avec une review
complète de la part de l'autre développeur.
- **Branches protégées** : pas de push direct sur `main` et `develop`. Des branches 'Tom' et 'Haggui'
seront mis en place pour travailler chacun de notre côté.

---

## ✅ QA (qualité et tests)
- **Tests** :  
  - Unitaires (Jest) → services backend, composants RN.  
  - Intégration (Jest + Supertest, Postman) → endpoints API.  
- **CI/CD** (GitHub Actions) :  
  - Lint + tests sur chaque PR.  
  - Déploiement auto → staging (`develop`), prod (`main`).  
- **Couverture** : viser ≥80% backend, ≥70% frontend.    
- **Monitoring** : Sentry pour erreurs, OpenTelemetry pour métriques.

---
