// http.ts — centralise la construction d’URL, les en-têtes, la sérialisation JSON et la gestion des erreurs

// =======================================================
// 🌐 Configuration de base de l'API
// =======================================================
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
export const CLEAN_BASE = RAW_BASE.trim().replace(/\/+$/, ""); // on retire les / en fin d’URL
if (!CLEAN_BASE) {
  // Sur téléphone réel, on DOIT fournir EXPO_PUBLIC_API_URL (tunnel HTTPS conseillé)
  throw new Error(
    "EXPO_PUBLIC_API_URL manquant (ex: https://<ton-tunnel>.trycloudflare.com/api/v1)"
  );
}

export const API_BASE = `${CLEAN_BASE}/api/v1`;

// Petit helper pour assembler l’URL finale sans // doublons
function buildUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`.replace(/(?<!:)\/{2,}/g, "/"); // garde 'https://' intact
}

// =======================================================
// ⚙️ Type d’options acceptées par la fonction http()
// =======================================================
export type HttpOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  signal?: AbortSignal | null;
  headers?: Record<string, string>;
  timeoutMs?: number;      // ⏱️ annule auto si trop long (par défaut 20s)
  token?: string | null;   // 🔐 JWT si besoin → Authorization: Bearer <token>
};

// =======================================================
// ❗️Classe d’erreur personnalisée (conserve le code HTTP)
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

// =======================================================
// 🚀 Fonction principale http()
// =======================================================
export async function http<T = unknown>(
  path: string,
  opts: HttpOptions = {}
): Promise<T | null> {
  const url = buildUrl(path);

  const {
    method = "GET",
    body,
    signal: externalSignal = null,
    headers: extraHeaders,
    timeoutMs = 20000,
    token = null,
  } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extraHeaders ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = {
    method,
    headers,
  };

  // 🚫 Pas de body pour GET
  if (body !== undefined && body !== null && method !== "GET") {
  // 🔧 Correction: ne JSON.stringify que si c'est un objet.
  // Si c'est déjà une string (ou FormData/Blob), on n'y touche pas.
  init.body =
    typeof body === "string" || body instanceof FormData || body instanceof Blob
      ? body
      : JSON.stringify(body);
}


  // ⏱️ Timeout + annulation
  const controller = !externalSignal ? new AbortController() : null;
  const combinedSignal = externalSignal ?? controller?.signal ?? null;
  if (combinedSignal) init.signal = combinedSignal;

  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let res: Response;
  try {
    // Debug utile (tu peux commenter si bruyant)
    // console.log("HTTP:", method, url);
    res = await fetch(url, init);
  } catch (e: any) {
    if (timer) clearTimeout(timer);
    // Erreur réseau (API down, mauvaise URL, HTTP clair bloqué, DNS tunnel, etc.)
    const hint = [
      `Échec réseau vers ${url}`,
      `Vérifie :`,
      `• Le tunnel HTTPS est bien actif (cloudflared en cours d’exécution)`,
      `• L’URL dans .env (EXPO_PUBLIC_API_URL) est exacte et finit par /api/v1`,
      `• Android ≥ 9/iOS bloquent souvent le HTTP clair → utilise HTTPS`,
    ].join("\n");
    throw new Error(`${e?.message || String(e)}\n${hint}`);
  } finally {
    if (timer) clearTimeout(timer);
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const hasBody = res.status !== 204 && res.status !== 205;

  let data: any = null;
  if (hasBody && isJson) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
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
