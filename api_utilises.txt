# 📖 Documentation API LockFit (v1)

---

__1) APIs externes utilisées__  
- **Expo Push Notifications** → pour envoyer des rappels d’entraînement sur l’application mobile.  
- **AWS S3 (ou équivalent)** → pour stocker les images/vidéos et gérer les uploads via des URLs signées.  
- **SendGrid / Resend** → pour l’envoi d’emails (confirmation, réinitialisation de mot de passe).  
- **Sentry** → pour suivre et analyser les erreurs (backend et mobile).  

---

__2) API interne LockFit__  
Toutes les routes sont sous la base `/api/v1`.  

- **Format d’entrée** : JSON (sauf filtres en query string).  
- **Format de sortie** : JSON.  
- **Authentification** : JWT (access token) via `Authorization: Bearer <token>`.  

---

__Authentification__  

| URL             | Méthode | Entrée                               | Sortie                |
|-----------------|---------|--------------------------------------|-----------------------|
| `/auth/register` | POST    | `{ email, password, displayName? }` | `{ user, tokens }`    |
| `/auth/login`   | POST    | `{ email, password }`                | `{ user, tokens }`    |
| `/auth/refresh` | POST    | `{ refresh }`                        | `{ tokens }`          |

---

__Utilisateur__  

| URL        | Méthode | Entrée                          | Sortie                                 |
|------------|---------|---------------------------------|----------------------------------------|
| `/users/me` | GET     | -                               | `{ id, email, displayName, mfaEnabled }` |
| `/users/me` | PATCH   | `{ displayName?, photoKey? }`   | `{ user }`                             |

---

__Exercices__  

| URL             | Méthode | Entrée                       | Sortie                                |
|-----------------|---------|------------------------------|---------------------------------------|
| `/exercises`    | GET     | `?muscle&level&equipment`    | `{ items: [...], total }`             |
| `/exercises/:id`| GET     | -                            | `{ id, name, level, primaryMuscle, ... }` |

---

__Workouts (séances)__  

| URL                | Méthode | Entrée                                        | Sortie       |
|--------------------|---------|-----------------------------------------------|--------------|
| `/workouts`        | POST    | `{ title?, items:[{ exerciseId, sets:[...] }] }` | `{ workout }` |
| `/workouts`        | GET     | `?from&to`                                   | `{ items:[...], total }` |
| `/workouts/:id`    | PATCH   | `{ title?, notes? }`                         | `{ workout }` |
| `/workouts/:id`    | DELETE  | -                                             | `{ ok:true }` |
| `/workouts/:id/finish` | POST | -                                             | `{ workout }` |

---

__Fichiers__  

| URL                 | Méthode | Entrée                       | Sortie                    |
|---------------------|---------|------------------------------|---------------------------|
| `/files/sign-upload`| POST    | `{ key, contentType }`       | `{ uploadUrl, publicUrl }` |

---

__Notifications__  

| URL                          | Méthode | Entrée                   | Sortie        |
|------------------------------|---------|--------------------------|---------------|
| `/notifications/register-token` | POST | `{ token, platform }`    | `{ ok:true }` |

---
