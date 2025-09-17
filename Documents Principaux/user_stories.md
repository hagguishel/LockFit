# 📌 User Stories LockFit (MoSCoW – détaillé)

---

## MUST HAVE

### 🔐 Authentification sécurisée (MFA, chiffrement, RGPD)

#### US-ACCT-01 — Création de compte
En tant qu’utilisateur, je veux créer un compte avec email et mot de passe, afin de sauvegarder mes données et y accéder de manière sécurisée.

**Critères d’acceptation**
- [ ] L’utilisateur saisit un email valide.
- [ ] Le mot de passe est stocké via **Argon2**.
- [ ] Un compte ne peut être créé qu’une seule fois par email.

**Notes techniques**
- Backend : **NestJS + Passport-JWT**.
- Base de données : **PostgreSQL** (chiffrement natif, RLS).

**Mockup**
- Écran inscription.

---

#### US-ACCT-02 — Authentification forte (MFA)
En tant qu’utilisateur, je veux activer l’authentification forte (MFA), afin de protéger mon compte.

**Critères d’acceptation**
- [ ] L’utilisateur choisit entre TOTP (Google Authenticator) ou Passkey (WebAuthn).
- [ ] Connexion validée uniquement si mot de passe + MFA corrects.
- [ ] Les sessions utilisent **JWT + Refresh**.

**Notes techniques**
- MFA : **otplib** (TOTP), **@simplewebauthn/server** (Passkeys).
- Tokens stockés côté mobile via **expo-secure-store**.

**Mockup**
- Écran validation MFA.

---

#### US-ACCT-03 — Connexion / déconnexion
En tant qu’utilisateur, je veux me connecter et me déconnecter, afin de contrôler mes sessions.

**Critères d’acceptation**
- [ ] Connexion avec email + mot de passe + MFA.
- [ ] Déconnexion supprime les tokens.
- [ ] Les tokens expirés forcent une reconnexion.

---

#### US-ACCT-04 — Réinitialisation mot de passe
En tant qu’utilisateur, je veux réinitialiser mon mot de passe, afin de retrouver l’accès à mon compte en cas d’oubli.

**Critères d’acceptation**
- [ ] Demande d’un email de réinitialisation via **SendGrid/Resend**.
- [ ] Lien à usage unique et expirant.
- [ ] Nouveau mot de passe stocké via **Argon2**.

---

#### US-ACCT-05 — Suppression du compte
En tant qu’utilisateur, je veux supprimer mon compte, afin d’exercer mon droit RGPD.

**Critères d’acceptation**
- [ ] Double confirmation avant suppression.
- [ ] Données et fichiers liés effacés de **PostgreSQL** et **S3**.
- [ ] Invalidation immédiate des tokens.

---

#### US-ACCT-06 — Gestion avatar
En tant qu’utilisateur, je veux ajouter ou modifier mon avatar, afin de personnaliser mon profil.

**Critères d’acceptation**
- [ ] Upload image → stockage sécurisé **AWS S3**.
- [ ] Liens signés pour l’accès aux images.
- [ ] Option de suppression/restauration avatar par défaut.

---

### 🏋️ Gestion des entraînements et du planning

#### US-PLAN-01 — Créer un entraînement
En tant qu’utilisateur, je veux créer une séance avec des exercices, afin de planifier mon entraînement.

**Critères d’acceptation**
- [ ] Chaque exercice contient : nom, répétitions, séries, temps de repos, méthode.
- [ ] L’utilisateur peut sauvegarder la séance.
- [ ] Modification/suppression possibles.

---

#### US-PLAN-02 — Parcourir le catalogue d’exercices
En tant qu’utilisateur, je veux parcourir un catalogue d’exercices par groupe musculaire, afin de trouver facilement mes mouvements.

**Critères d’acceptation**
- [ ] Exercices classés par groupe musculaire.
- [ ] Filtres disponibles (muscle, matériel, niveau).

---

#### US-PLAN-03 — Créer un planning
En tant qu’utilisateur, je veux créer un planning d’entraînement, afin d’organiser mes séances sur la durée.

**Critères d’acceptation**
- [ ] Définir un nom et une durée.
- [ ] Associer des séances à des jours spécifiques.
- [ ] Modifier ou supprimer un planning.

---

#### US-PLAN-04 — Suivre l’exécution du planning
En tant qu’utilisateur, je veux marquer mes séances planifiées comme “faites”, afin de suivre mon avancement.

**Critères d’acceptation**
- [ ] Une séance planifiée peut être cochée comme “terminée”.
- [ ] Elle est ensuite envoyée dans l’historique.

---

### 📊 Suivi des performances

#### US-STATS-01 — Historique des séances
En tant qu’utilisateur, je veux consulter mon historique, afin de garder la trace de mes entraînements.

**Critères d’acceptation**
- [ ] Chaque séance sauvegardée contient : date, exercices, séries, reps, poids.
- [ ] Historique consultable et filtrable.

---

#### US-STATS-02 — Statistiques de progression
En tant qu’utilisateur, je veux voir des graphiques, afin de mesurer ma progression.

**Critères d’acceptation**
- [ ] Graphique montrant volume total, régularité et fréquence.
- [ ] Accessible uniquement après authentification.

**Notes techniques**
- Graphiques via **victory-native** (React Native).

---

### 🔔 Notifications (SHOULD HAVE)

#### US-NOTIF-01 — Notification d’inactivité
En tant qu’utilisateur, je veux recevoir une notification si je n’ai pas ouvert l’app depuis X jours, afin de rester motivé.

**Critères d’acceptation**
- [ ] Envoi via **Expo Notifications** (APNS/FCM).
- [ ] Paramètres pour activer/désactiver.

---

#### US-NOTIF-02 — Rappel fin de repos
En tant qu’utilisateur, je veux recevoir un rappel quand mon temps de repos est terminé, afin de reprendre ma séance.

**Critères d’acceptation**
- [ ] Notification locale déclenchée à la fin du timer de repos.

---

### 🏅 Gamification (COULD HAVE)

#### US-GAME-01 — Badges d’assiduité
En tant qu’utilisateur, je veux obtenir un badge si je m’entraîne régulièrement, afin de rester motivé.

**Critères d’acceptation**
- [ ] Badge “Assiduité” après X jours consécutifs.
- [ ] Badge “Spécialisation” après X séances sur un même muscle.
- [ ] Badges visibles dans le profil.

---

### 🌐 Module social (WON’T HAVE pour MVP)

#### US-SOCIAL-01 — Partage et interactions
En tant qu’utilisateur, je veux partager mes séances et interagir avec d’autres, afin de me motiver.

**Critères d’acceptation**
- [ ] Accessible uniquement après inscription.
- [ ] Possibilité de commenter, liker, partager.
- [ ] Profil personnalisable (bio, photo, follow).

---

## ⚙️ Notes techniques générales (issues du cadrage)

- **Front-end** : React Native + Expo (TypeScript), NativeWind (styling), React Navigation.
- **Back-end** : NestJS (Node.js + TypeScript), Prisma ORM.
- **Base de données** : PostgreSQL (RLS, chiffrement natif, ACID).
- **Cybersécurité** : Argon2, MFA TOTP/Passkeys, JWT + Refresh, Field Level Encryption, Helmet, CORS, rate limiting, conformité **OWASP MASVS/ASVS**.
- **Services externes** :
  - **Expo Notifications** → push.
  - **SendGrid/Resend** → emails (validation, reset).
  - **AWS S3** → stockage images avec liens signés.
  - **Sentry** → suivi crashs mobile + API.
- **Tests** : Jest, React Native Testing Library, Supertest.

---
