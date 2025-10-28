// src/api/auth.ts
// API authentification : login + signup

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
    console.warn("[auth] EXPO_PUBLIC_API_URL manquant → fallback https://lockfit.onrender.com");
    return "https://lockfit.onrender.com";
  }
  return raw;
}

// Base URL de l'API (accepte avec/sans /api/v1)
const RAW = pickApiBase();
const API_BASE = /\/api\/v1$/i.test(RAW) ? RAW : `${RAW}/api/v1`;

console.log("[auth] API_BASE =", API_BASE);

/**
 * Inscription utilisateur
 */
export async function signup(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<LoginSuccess> {
  const payload = {
    email: data.email.trim().toLowerCase(),
    password: data.password,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
  };

  const url = `${API_BASE}/auth/signup`;
  console.log("📝 [SIGNUP] Appel vers:", url);

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
          : res.status === 409
          ? "EMAIL_EXISTS"
          : res.status === 400
          ? "INVALID_DATA"
          : "SERVER_ERROR",
      message: typeof body?.message === "string" ? body.message : undefined,
    };
    throw httpErr;
  }

  // Succès : tolère plusieurs formats de tokens
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
      message: "Attendu { user, tokens } avec access et refresh.",
    };
    throw malformed;
  }

  return { user, tokens };
}

/**
 * Connexion utilisateur
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

  // Cas succès direct
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