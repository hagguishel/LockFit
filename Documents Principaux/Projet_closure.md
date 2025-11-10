# 🏋️‍♂️ LockFit – Présentation du projet

## Nom du projet
**LockFit**

---

## Présentation brève
LockFit est une application mobile de musculation qui permet aux utilisateurs de suivre leurs entraînements, mesurer leurs progrès et sécuriser leurs données grâce à une authentification multi-facteurs.  
L’objectif est d’offrir une expérience moderne, simple et motivante, adaptée aussi bien aux débutants qu’aux athlètes confirmés.

---

## Présentation détaillée

Le projet repose sur une architecture complète et sécurisée, entièrement déployée sur **Render**, où se trouvent à la fois le **backend** et le **frontend**.

Le **frontend mobile** a été développé avec **React Native (Expo)** afin de garantir une interface fluide, ergonomique et accessible sur plusieurs plateformes.  
Le **backend** est conçu avec **NestJS** et **Prisma ORM**, ce qui permet une gestion claire de la logique métier, des routes et des interactions avec la base de données.  
La **base de données** repose sur **PostgreSQL**, utilisée pour stocker de manière fiable les informations liées aux utilisateurs, aux exercices et au suivi de progression.

Sur le plan de la **sécurité**, LockFit utilise **Argon2** pour le hachage des mots de passe, **JWT** pour l’authentification et un système de **MFA (TOTP et Passkeys)** pour renforcer la protection des comptes.  
Enfin, **Helmet** est intégré au backend pour sécuriser les requêtes HTTP et protéger l’application contre les attaques courantes.

Ainsi, LockFit propose une solution technique robuste, hébergée entièrement sur **Render**, combinant performance, sécurité et expérience utilisateur de qualité.

---
