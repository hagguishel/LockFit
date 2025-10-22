// ===============================
// 🔌 API AUTHENTIFICATION (Étape 2 - CONTRAT)
// ===============================
/*
 * ------------------------------------------------------------
 * Objectif: appeler ton backend POST /api/v1/auth/login
 * et renvoyer soit { user, tokens }, soit { mfaRequired: true, tempSessionId }.
 * En cas d'erreur serveur: on lève un HttpError normalisé.
 */

import { access } from "fs";
import type { LoginSuccess, HttpError, LoginMfaRequired } from "../types/auth";
// 1) Base URL de l'API lue depuis l'environnement Expo (.env)
//    On retire les / de fin pour éviter les doubles slash.

const BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
if (!BASE) console.warn("[auth.login] EXPO_PUBLIC_API_URL manquant");


/**
 * Connexion utilisateur
 *
 * @param email    Email saisi par l'utilisateur (on le normalise en minuscule/sans espaces).
 * @param password Mot de passe saisi (envoyé en HTTPS).
 *
 * @returns        Promesse qui résout:
 *                  - en LoginSuccess (succès)
 *                  - ou REJETTE en HttpError (échec 401/429/500, etc.)
 */

export async function login(
  email: string,
  password: string,
): Promise<LoginSuccess> {
  // 2) On normalise l'email pour être cohérent avec ce que le back attend
  const payload = {
    email: email.trim().toLowerCase(),
    password,
  };
  // 3) On prépare l'URL exacte (avec le préfixe /api/v1 de ton back)
  const url = `${BASE}/auth/login`;

  // 4) On exécute la requête HTTP.
  //    try/catch sert à distinguer les ERREURS RÉSEAU (offline, DNS, etc.)
  //    des erreurs HTTP (401/429...) qui, elles, ont bien une réponse du serveur.

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",   // on envoie du JSON
        Accept: "application/json",           // on attend du JSON en retour
      },
      body: JSON.stringify(payload),          // on sérialise l'objet -> chaîne JSON
    });
  } catch (e) {
    // Erreur RÉSEAU (pas une réponse du back) → on jette un HttpError standardisé
    const err: HttpError = {
      status: 0,                              // 0 = pas de statut HTTP (car pas de réponse)
      error: "NETWORK_ERROR",                 // code client pour les erreurs réseau
      message: (e as Error)?.message,         // utile pour debugger en local
    };
    throw err;
  }
  // 5) On essaye de parser la réponse en JSON si le serveur a bien envoyé du JSON
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;

  // 6) Gestion des ERREURS HTTP (statuts non-2xx)
  // On transforme la réponse en HttpError propre pour l'écran.
  if (!res.ok) {
    const httpErr: HttpError = {
      status: res.status,
      // si l'API renvoie un code "error" textuel, on le garde, sinon on mappe un défaut
      error:
        typeof body?.error === "string"
          ? body.error
          : res.status === 401
          ? "INVALID_CREDENTIALS"
          : res.status === 429
          ? "TOO_MANY_ATTEMPTS"
          : "SERVER_ERROR",
      // message est optionnel (souvent vide en prod)
      message: typeof body?.message === "string" ? body.message : undefined,
    };
    throw httpErr;
  }

  // 7) Succès HTTP (200–299)
  //    Deux possibilités:
  //    A) MFA requis → l'API renvoie { mfaRequired: true, tempSessionId, ... }
  //    B) Connexion directe → l'API renvoie { user, tokens } (ou { user, token } dans ta version)
  if (body && body.mfaRequired === true && typeof body.tempSessionId === "string") {
    // on sécurise la forme exacte renvoyée au front
    const mfa: LoginMfaRequired = {
      mfaRequired: true,
      tempSessionId: body.tempSessionId,
      maskedEmail: typeof body.maskedEmail === "string" ? body.maskedEmail : undefined,
    };
    return mfa;
  }

  // 8) Cas "connexion directe"
  //    On tolère "tokens" (contrat recommandé) ET "token" (ta version actuelle)
  const tokens =
  body?.tokens ??
   (body?.accessToken && body?.refreshToken
    ? { access: body.accessToken, refresh: body.refreshToken }
    : null);
  const user = body?.user;

  // 9) Vérification minimales pour éviter un object incomplet
  if (!user || !tokens?.access || !tokens?.refresh) {
    const malformed: HttpError = {
      status: 500,
      error: "BAD_PAYLOAD",
      message:
      "Attendu { user, accessToken, refreshToken } ou { mfaRequired:true, tempSessionId }.",
    };
    throw malformed;
  }
  // 10) Tout est OK -> on renvoie l'objet typé LoginSuccess
  return { user, tokens };
}
