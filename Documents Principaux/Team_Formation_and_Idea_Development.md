# 📘 Stage 1 Report – Team Formation and Idea Development
**Project: LockFit**

---

## 👥 Team Formation Overview

**Équipe :**
- [RAZAFIMAITSO Haggui](https://github.com/hagguishel)
- [LAGARDE Tom](https://github.com/tmlgde)

**Organisation des rôles (partagés) :**
Nous avons choisi de travailler de manière collaborative, en partageant les rôles clés.
Chaque membre contribue à la fois sur le **front-end mobile**, le **back-end/API**, la **base de données**, et la **cybersécurité**, avec des points de spécialisation selon les besoins.

| Rôle                | Responsabilités principales | Attribution |
|---------------------|-----------------------------|-------------|
| 🧑‍💻 Project Manager     | Organisation, milestones, suivi agile | Partagé |
| 🔐 Backend Developer   | API sécurisée (NestJS, Prisma, MFA) | Partagé |
| 📱 Mobile Developer    | UI/UX React Native, navigation | Partagé |
| 🗄 Database Manager    | PostgreSQL + Row-Level Security | Partagé |
| 🧪 QA & Testing        | Tests unitaires & intégration | Partagé |

**Collaboration et communication :**
- **Discord** → échanges quotidiens.
- **GitHub Projects** → suivi des tâches, milestones.
- **Google Docs/Notion** → documentation partagée.

**Méthode de décision :**
- Discussions ouvertes.
- Décisions par consensus → vote si nécessaire.
- Sprint planning agile → réévaluation hebdomadaire.

---

## 💡 Ideas Explored

1. **FitMarket** : Marketplace de programmes sportifs personnalisés.
   - ✅ Intéressant commercialement.
   - ❌ Trop ambitieux pour 3 mois (paiement, marketplace, modération).

2. **DietBuddy** : Application de suivi nutritionnel couplée à l’entraînement.
   - ✅ Pertinent pour la santé globale.
   - ❌ Complexité importante (calculs nutritionnels, base de données aliments).

3. **LockFit (sélectionné)** : Application mobile de suivi sportif **sécurisée**.
   - ✅ Aligné avec nos compétences (sécurité + mobile).
   - ✅ Innovant (sécurité avancée, RGPD).
   - ✅ Réalisable en 3 mois.

---

## 📊 Idea Evaluation

| Critère              | FitMarket | DietBuddy | LockFit |
|----------------------|-----------|-----------|---------|
| Faisabilité (3 mois) | ❌        | ⚠️        | ✅      |
| Impact utilisateur   | ✅        | ✅        | ✅      |
| Innovation           | ⚠️        | ✅        | ✅      |
| Alignement équipe    | ❌        | ⚠️        | ✅      |
| **Score final**      | 1/4       | 2/4       | 4/4     |

---

## 🏆 Decision and Refinement

### Problème identifié
Beaucoup de sportifs peinent à suivre leurs entraînements et leurs progrès, tout en garantissant la confidentialité de leurs données personnelles.

### Solution proposée
**LockFit** → Une application mobile de suivi sportif avec :
- Authentification forte (MFA, chiffrement AES-256, RGPD).
- Gestion complète des entraînements (exos, séries, repos).
- Suivi statistique et progression.
- Module social (partage et motivation en groupe).

### Public cible
- Débutants voulant structurer leur entraînement.
- Sportifs confirmés cherchant à analyser leurs performances.
- Passionnés de musculation souhaitant partager leurs progrès.

### Défis identifiés
- Intégration MFA (TOTP & Passkeys) mobile + API.
- Optimisation PostgreSQL avec Row-Level Security.
- Simplicité d’usage (UX) malgré les fonctions avancées.

---

## 📦 MVP Scope

**Inclus (MVP)** :
- Authentification sécurisée (MFA, chiffrement, HTTPS/TLS).
- Gestion des entraînements (CRUD complet).
- Suivi performances (historique, statistiques).


**Exclus (MVP)** :
- Leaderboard & gamification.
- IoT / wearables.
- Stratégies d’entraînement automatiques.
- Monétisation/marketplace.
- Notifications push (rappels).

---

## ⚠️ Risks

- 🔑 **Complexité MFA/Passkeys** → tests anticipés Expo/NestJS.
- 🐘 **Performance PostgreSQL (RLS)** → optimisation Prisma + indexation.
- 👶 **Adoption UX** → tests utilisateurs réguliers, design simple.
- ⏳ **Charge projet** → priorisation MVP + phasage clair.

---

## 🗓 High-Level Plan (Stage 1 → Stage 2)

- **Semaine 1-2** : Cadrage, brainstorming, sélection MVP.
- **Semaine 3-4** : Setup repo GitHub, stack technique, authentification MFA.
- **Semaine 5-8** : MVP fonctionnel (CRUD entraînements, suivi stats).
- **Semaine 9-11** : UX final + module social + notifications push.
- **Semaine 12** : Tests, bugfix, préparation Demo Day.

---

## ✍️ Conclusion

Notre équipe a exploré plusieurs idées avant de choisir **LockFit**, qui s’aligne sur nos compétences, nos objectifs d’apprentissage et les besoins utilisateurs identifiés.
Nous disposons désormais d’un **MVP bien défini**, d’une stack validée et d’une feuille de route claire pour avancer vers la prochaine étape.

---

## 👥 Auteurs

- [RAZAFIMAITSO Haggui](https://github.com/hagguishel)
- [LAGARDE Tom](https://github.com/tmlgde)
