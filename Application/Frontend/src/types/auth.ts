// ===============================
// 🔐 TYPES D'AUTHENTIFICATION
// ===============================

// 🔸 Jetons renvoyés par l'API quand la connexion réussit
// Ces deux tokens sont nécessaires pour rester connecté :
export type Tokens = {
  access: string;       // Jeton "court" (ex: 15 minutes) → utilisé dans chaque requête API
  refresh: string;      // Jeton "long" (ex: 30 jours) → sert à régénérer un access tokens expiré
};

// 🔸 Données minimales d'un utilisateur connecté
// Ces infos sont stockées côté front après connexion :
export type AuthUser = {
  id: string;            // Identifiant unique (UUID/CUID)
  email: string;         // Email normalisé en minuscule
  name?: string | null ; // Optionnel : si tu veux afficher le nom plus tard
  mfaEnabled?: boolean;  // Optionnel : indique si l'utilisateur a activé la double sécurité (MFA)
};

// 🔸 Réponse du serveur quand la connexion réussit SANS MFA
// Cas classique : l'utilisateur reçoit directement ses jetons
export type LoginOk = {
  user: AuthUser;       // Données utilisateur (id, email, etc.)
  tokens: Tokens;        // Les deux jetons JWT renvoyés par le back
};

// 🔸 Réponse du serveur quand la connexion réussit AVEC MFA activé
// Cas spécial : on ne reçoit PAS les jetons, mais un identifiant temporaire
export type LoginMfaRequired = {
  mfaRequired: true;    // Ce flag indique clairement que MFA est requis
  tempSessionId: string; // Identifiant temporaire (valide quelques minutes seulement)
  maskedEmail?: string; // Email partiellement caché (ex: j***@gmail.com) → affiché dans l'UI
};

// 🔸 Union de succès :
// soit on a les jetons (LoginOk), soit on doit faire une étape MFA (LoginMfaRequired)
export type LoginSuccess = LoginOk | LoginMfaRequired;

// 🔸 Fonction "type guard" :
// elle permet de vérifier facilement si la réponse nécessite une étape MFA
export function isMfaRequired(r: LoginSuccess): r is LoginMfaRequired {
  return (r as LoginMfaRequired).mfaRequired === true;
}

// 🔸 Liste des codes d'erreurs possibles renvoyés par ton API sur /auth/login
export type LoginErrorCode =
  | "INVALID_CREDENTIALS" // Mauvais email ou mot de passe → HTTP 401
  | "TOO_MANY_ATTEMPTS"; // Trop de tentatives de login → HTTP 429

// 🔸 Structure commune d'une erreur HTTP normalisée
// Utilisée pour toutes les erreurs API (pas que login)
export type HttpError = {
  status: number; // Code HTTP renvoyé (ex: 401, 429, 500)
  error: string; // Code d'erreur du back (ex: "INVALID_CREDENTIALS")
  message?: string; // Message texte (souvent vide ou optionnel)
};
