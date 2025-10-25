// ===============================
// 🔌 API AUTHENTIFICATION (Étape 2 - CONTRAT)
// ===============================
/*
 * Objectif: appeler POST /api/v1/auth/login
 * et renvoyer soit { user, tokens }, soit { mfaRequired: true, tempSessionId }.
 * En cas d'erreur serveur: on lève un HttpError normalisé.
 */

// ❌ import Node inutilisable en React Native
// import { access } from "fs";

import Constants from "expo-constants";
import type { LoginSuccess, HttpError, LoginMfaRequired } from "../types/auth";

/** Récupère la base URL depuis process.env ou app.config.ts (extra). Fallback Render si vide. */
function pickApiBase(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || "").trim();
  const fromExtra = String(
    // @ts-ignore: selon version, expo-constants expose expoConfig ou manifest
    (Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL ??
      Constants?.manifest?.extra?.EXPO_PUBLIC_API_URL ??
      "")
  ).trim();

  const raw = (fromEnv || fromExtra).replace(/\/+$/, ""); // retire / en fin
  if (!raw) {
    console.warn("[auth.login] EXPO_PUBLIC_API_URL manquant → fallback https://lockfit.onrender.com");
    return "https://lockfit.onrender.com";
  }
  return raw;
}

// 1) Base URL de l'API (accepte avec/sans /api/v1)
const RAW = pickApiBase();
const API_BASE = /\/api\/v1$/i.test(RAW) ? RAW : `${RAW}/api/v1`;

// Debug temporaire (tu peux commenter après vérification)
console.log("[login] API_BASE =", API_BASE);

/**
 * Connexion utilisateur
 *
 * @returns Promesse qui résout:
 *  - en LoginSuccess (succès)
 *  - ou en LoginMfaRequired (MFA étape suivante)
 *  - ou REJETTE en HttpError (échec 401/429/500, etc.)
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginSuccess | LoginMfaRequired> {
  const payload = {
    email: email.trim().toLowerCase(),
    password,
  };

  const url = `${API_BASE}/auth/login`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const err: HttpError = {
      status: 0,
      error: "NETWORK_ERROR",
      message: (e as Error)?.message,
    };
    throw err;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const httpErr: HttpError = {
      status: res.status,
      error:
        typeof body?.error === "string"
          ? body.error
          : res.status === 401
          ? "INVALID_CREDENTIALS"
          : res.status === 429
          ? "TOO_MANY_ATTEMPTS"
          : "SERVER_ERROR",
      message: typeof body?.message === "string" ? body.message : undefined,
    };
    throw httpErr;
  }

  // Cas MFA requis
  if (body && body.mfaRequired === true && typeof body.tempSessionId === "string") {
    const mfa: LoginMfaRequired = {
      mfaRequired: true,
      tempSessionId: body.tempSessionId,
      maskedEmail: typeof body.maskedEmail === "string" ? body.maskedEmail : undefined,
    };
    return mfa;
  }

  // Cas succès direct: tolère plusieurs formats de tokens
  const tokens =
    body?.tokens ??
    (body?.accessToken && body?.refreshToken
      ? { access: body.accessToken, refresh: body.refreshToken }
      : null);

  const user = body?.user;

  if (!user || !tokens?.access || !tokens?.refresh) {
    const malformed: HttpError = {
      status: 500,
      error: "BAD_PAYLOAD",
      message:
        "Attendu { user, accessToken, refreshToken } ou { mfaRequired:true, tempSessionId }.",
    };
    throw malformed;
  }

  return { user, tokens };
}
