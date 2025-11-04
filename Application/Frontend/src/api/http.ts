// src/api/http.ts
// centralise la construction d'URL, les en-têtes, la sérialisation JSON et la gestion des erreurs

// =======================================================
// 🌐 Configuration de base de l'API
// =======================================================
// EXPO_PUBLIC_API_URL peut être:
//   - https://lockfit.onrender.com
//   - https://lockfit.onrender.com/api/v1
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
const CLEAN_BASE = RAW_BASE.trim().replace(/\/+$/, ""); // retire les / finaux

if (!CLEAN_BASE) {
  // Sur téléphone réel, fournir EXPO_PUBLIC_API_URL (HTTPS conseillé)
  throw new Error(
    "EXPO_PUBLIC_API_URL manquant (ex: https://lockfit.onrender.com ou https://lockfit.onrender.com/api/v1)"
  );
}

// Si l'URL finit déjà par /api/v1, on la garde telle quelle; sinon on l'ajoute.
const API_BASE =
  /\/api\/v1$/i.test(CLEAN_BASE) ? CLEAN_BASE : `${CLEAN_BASE}/api/v1`;

// Petit helper pour assembler l'URL finale sans // doublons (conserve https://)
function buildUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`.replace(/(?<!:)\/{2,}/g, "/");
}

// =======================================================
// ⚙️ Type d'options acceptées par la fonction http()
// =======================================================
export type HttpOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  signal?: AbortSignal | null;
  headers?: Record<string, string>;
  timeoutMs?: number; // ⏱️ annule auto si trop long (par défaut 20s)
  token?: string | null; // 🔐 JWT si besoin → Authorization: Bearer <token>
  _retry?: boolean; // interne: a-t-on déjà retenté après un refresh ?
};

// =======================================================
// ❗️Classe d'erreur personnalisée (conserve le code HTTP)
// =======================================================
export class HttpError extends Error {
  status: number;
  payload: any;

  constructor(status: number, message: string, payload?: any) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.payload = payload;
  }
}

// ========================== gestion des tokens & refresh ==========================
// On réutilise TON stockage sécurisé existant
import { loadTokens, saveTokens, clearTokens } from "../lib/tokenStorage";

let refreshing = false;
let waiters: Array<() => void> = [];

/** Tente de renouveler l'access token via le refresh token. Retourne true si OK. */
async function tryRefreshOnce(): Promise<boolean> {
  if (refreshing) {
    await new Promise<void>((resolve) => waiters.push(resolve));
    return true; // on considère le refresh "géré" (réussi ou pas, l'appelant verra)
  }

  refreshing = true;
  try {
    const tokens = await loadTokens();
    const refresh = tokens?.refresh;
    if (!refresh) return false;

    const resp = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { Authorization: `Bearer ${refresh}` },
    });

    if (!resp.ok) return false;

    const data = await resp.json().catch(() => null);
    const accessToken = (data as any)?.accessToken;
    const refreshToken = (data as any)?.refreshToken;
    if (!accessToken || !refreshToken) return false;

    await saveTokens({ access: accessToken, refresh: refreshToken });
    return true;
  } catch {
    return false;
  } finally {
    refreshing = false;
    waiters.forEach((w) => w());
    waiters = [];
  }
}
// ======================== FIN  gestion des tokens & refresh ========================

// =======================================================
// 🚀 Fonction principale http()
// =======================================================
export async function http<T = unknown>(
  path: string,
  opts: HttpOptions = {}
): Promise<T | null> {
  const {
    method = "GET",
    body,
    signal: externalSignal = null,
    headers: extraHeaders,
    timeoutMs = 30000,
    token = null,
    _retry = false,
  } = opts;

  const url = buildUrl(path)

  console.log(`🌐 HTTP ${method} ${url}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extraHeaders ?? {}),
  };

  // Ajout auto de l'access token si aucun token explicite n'est fourni
  if (!token) {
    const stored = await loadTokens();
    if (stored?.access && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${stored.access}`;
    }
  } else {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers,
  };

  // 🚫 Pas de body pour GET — et ne stringify que si nécessaire
  if (body !== undefined && body !== null && method !== "GET") {
    // si déjà string/FormData/Blob -> on n'y touche pas
    const isString = typeof body === "string";
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
    init.body = isString || isFormData || isBlob ? body : JSON.stringify(body);
  }

  // ⏱️ Timeout + annulation
  const controller = !externalSignal ? new AbortController() : null;
  const combinedSignal = externalSignal ?? controller?.signal ?? undefined;
  if (combinedSignal) init.signal = combinedSignal;

  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: any) {
    if (timer) clearTimeout(timer);
    const hint = [
      `Échec réseau vers ${url}`,
      `Vérifie :`,
      `• Le tunnel/HTTPS Render ou cloudflared est actif`,
      `• EXPO_PUBLIC_API_URL est correcte (avec ou sans /api/v1)`,
      `• Sur device réel, évite http:// → préfère https://`,
    ].join("\n");
    throw new Error(`${e?.message || String(e)}\n${hint}`);
  } finally {
    if (timer) clearTimeout(timer);
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = /\bapplication\/json\b/i.test(contentType);
  const hasBody = res.status !== 204 && res.status !== 205;

  let data: any = null;
  if (hasBody) {
    if (isJson) {
      data = await res.json().catch(() => null);
    } else {
      // on tente de lire le texte (utile pour 4xx HTML, etc.) sans casser l'API
      data = await res.text().catch(() => null);
      try {
        // parfois c'est du JSON sans header correct
        data = data ? JSON.parse(data) : null;
      } catch {
        // laisse data en string
      }
    }
  }

  // ======= gestion auto du 401 → refresh → retry (1 seule fois) =======
  if (res.status === 401 && !_retry) {
    const refreshed = await tryRefreshOnce();
    if (refreshed) {
      const fresh = await loadTokens();
      const retryHeaders: Record<string, string> = {
        ...headers,
        ...(fresh?.access ? { Authorization: `Bearer ${fresh.access}` } : {}),
      };
      const retryRes = await fetch(url, { ...init, headers: retryHeaders, signal: combinedSignal });
      const retryCT = retryRes.headers.get("content-type") || "";
      const retryIsJson = /\bapplication\/json\b/i.test(retryCT);
      const retryHasBody = retryRes.status !== 204 && retryRes.status !== 205;
      let retryData: any = null;
      if (retryHasBody) {
        if (retryIsJson) {
          retryData = await retryRes.json().catch(() => null);
        } else {
          const txt = await retryRes.text().catch(() => null);
          try {
            retryData = txt ? JSON.parse(txt) : null;
          } catch {
            retryData = txt;
          }
        }
      }
      if (!retryRes.ok) {
        if (retryRes.status === 401) {
          await clearTokens();
        }
        const msg2 =
          (retryData && ((retryData as any).message || (retryData as any).error)) ||
          `HTTP ${retryRes.status}`;
        const text2 = Array.isArray(msg2) ? msg2.join("\n") : String(msg2);
        throw new HttpError(retryRes.status, text2, retryData);
      }
      return (retryData as T) ?? null;
    } else {
      await clearTokens();
      // on laissera tomber sur l'erreur 401 originale ci-dessous
    }
  }
  // ====================== FIN 401 → refresh → retry ======================

  if (!res.ok) {
    const msg =
      (data && (typeof data === "object") && ("message" in data || "error" in data)
        ?
          (data.message || data.error)
        : `HTTP ${res.status}`);
    const text = Array.isArray(msg) ? msg.join("\n") : String(msg);
    throw new HttpError(res.status, text, data);
  }

  return (data as T) ?? null;
}

// =======================================================
// 💡 Helpers pratiques
// =======================================================
export const httpGet = <T>(
  path: string,
  opts: Omit<HttpOptions, "method" | "body"> = {}
) => http<T>(path, { ...opts, method: "GET" });

export const httpPost = <T>(
  path: string,
  body?: any,
  opts: Omit<HttpOptions, "method" | "body"> = {}
) => http<T>(path, { ...opts, method: "POST", body });

export const httpPatch = <T>(
  path: string,
  body?: any,
  opts: Omit<HttpOptions, "method" | "body"> = {}
) => http<T>(path, { ...opts, method: "PATCH", body });

export const httpDelete = <T>(
  path: string,
  opts: Omit<HttpOptions, "method" | "body"> = {}
) => http<T>(path, { ...opts, method: "DELETE" });
