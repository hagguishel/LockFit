# 📌 User Stories LockFit (MoSCoW – Fonctionnel + Technique)

---

## MUST HAVE

### 1. Parcourir et gérer les exercices
**User Story**
En tant qu’utilisateur débutant, je veux parcourir un catalogue d’exercices organisés par groupes musculaires, afin de trouver facilement ceux dont j’ai besoin et planifier mes séances.

**Critères d’acceptation**
- [ ] Le catalogue affiche les exercices par groupes musculaires.
- [ ] Chaque exercice contient : nom, description, séries, répétitions, temps de repos.
- [ ] L’utilisateur peut filtrer par muscle, niveau, matériel.
- [ ] L’utilisateur peut créer, modifier et supprimer une séance.

**Notes techniques**
- Table `exercises`: `id`, `name`, `muscle_group`, `level`, `equipment`, `description`.
- Table `workouts`: `id`, `user_id`, `date`, `exercises[]`.
- Front : React Native (catalogue + filtres).
- Back : NestJS API + Prisma ORM.

**Mockups à prévoir**
- Catalogue avec filtres.
- Création de séance.
- Liste des séances sauvegardées.

---

### 2. Création de compte sécurisé
**User Story**
En tant qu’utilisateur, je veux créer un compte sécurisé avec MFA, afin de protéger mes données.

**Critères d’acceptation**
- [ ] Inscription avec email + mot de passe.
- [ ] Validation MFA (TOTP ou passkey).
- [ ] Connexion uniquement après validation MFA.
- [ ] Déconnexion possible.

**Notes techniques**
- Auth avec **NestJS + Passport-JWT**.
- MFA : **otplib** (TOTP) + **@simplewebauthn/server** (Passkeys).
- Hash sécurisé avec Argon2.
- Tokens : JWT + Refresh.
- Stockage PostgreSQL avec chiffrement des champs sensibles.

**Mockups à prévoir**
- Écran inscription + MFA.
- Écran connexion sécurisée.

---

### 3. Suivi des performances
**User Story**
En tant qu’utilisateur, je veux consulter mon historique et mes statistiques, afin de suivre ma progression.

**Critères d’acceptation**
- [ ] Chaque séance est sauvegardée avec date, exercices, séries, reps, poids.
- [ ] Historique disponible et filtrable.
- [ ] Graphique de progression visible dans l’onglet “Progression”.

**Notes techniques**
- Table `sessions`: `id`, `workout_id`, `user_id`, `date`, `stats`.
- Front : Graphiques via **victory-native**.
- Back : API NestJS + Prisma.

**Mockups à prévoir**
- Historique de séances.
- Graphique de progression.

---

## SHOULD HAVE

### 4. Notifications et rappels
**User Story**
En tant qu’utilisateur, je veux recevoir des notifications en cas d’inactivité ou à la fin de mes repos, afin de rester discipliné.

**Critères d’acceptation**
- [ ] Notification si l’app n’est pas ouverte depuis X jours.
- [ ] Notification en fin de temps de repos.
- [ ] Paramètres pour activer/désactiver.

**Notes techniques**
- Notifications push via **Expo Notifications (APNS/FCM)**.
- Rappel repos via notifications locales.

**Mockups à prévoir**
- Paramètres notifications (on/off).

---

## COULD HAVE

### 5. Gamification et récompenses
**User Story**
En tant qu’utilisateur, je veux obtenir des badges et récompenses selon ma régularité, afin de rester motivé.

**Critères d’acceptation**
- [ ] Badge “Assiduité” après X jours consécutifs.
- [ ] Badge “Spécialisation” après X séances d’un même muscle.
- [ ] Badges visibles dans le profil.

**Notes techniques**
- Table `achievements`: `id`, `user_id`, `badge_type`, `date_awarded`.
- Attribution automatique via **BullMQ** (jobs async).

**Mockups à prévoir**
- Profil utilisateur avec badges.

---

## WON’T HAVE (MVP)

### 6. Module social
**User Story**
En tant qu’utilisateur, je veux partager mes séances et interagir avec d’autres sportifs, afin de me motiver.

**Critères d’acceptation**
- [ ] Disponible uniquement après inscription.
- [ ] Commenter, liker et partager des posts.
- [ ] Personnaliser son profil (bio, photo, suivre).

**Notes techniques**
- API REST + WebSocket possible.
- Risques RGPD + modération.

**Mockups à prévoir**
- Fil social.
- Profil utilisateur.
