// http.ts — centralise la construction d’URL, les en-têtes, la sérialisation JSON et la gestion des erreurs

// =======================================================
// 🌐 Configuration de base de l'API
// =======================================================
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
const BASE = RAW_BASE.replace(/\/+$/, ""); // on retire les / en fin d’URL
if (!BASE) {
  throw new Error(
    "EXPO_PUBLIC_API_URL manquant (ex: http://localhost:3000/api/v1)"
  );
}

// =======================================================
// ⚙️ Type d’options acceptées par la fonction http()
// =======================================================
type HttpOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  signal?: AbortSignal | null;
  headers?: Record<string, string>;
  timeoutMs?: number; // ⏱️ optionnel — pour annuler automatiquement une requête trop longue
};

// =======================================================
// ❗️Classe d’erreur personnalisée (conserve le code HTTP)
// =======================================================
class HttpError extends Error {
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
  // 🧱 Construction de l’URL complète
  const url = `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  // 🎛️ Extraction des options avec valeurs par défaut
  const {
    method = "GET",
    body,
    signal: externalSignal = null,
    headers: extraHeaders,
    timeoutMs,
  } = opts;

  // 📨 Préparation de la requête
  const init: RequestInit = {
    method: method as RequestInit["method"],
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(extraHeaders ?? {}),
    } as HeadersInit,
  };

  // 🚫 Ne pas envoyer de body pour un GET (incompatible avec certaines API)
  if (body !== undefined && body !== null && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  // ⏱️ Timeout et gestion du signal d’annulation
  const controller = !externalSignal && timeoutMs ? new AbortController() : null;
  const signal = externalSignal ?? controller?.signal ?? null;
  if (signal) (init as RequestInit).signal = signal;
  const timer =
    controller && timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    // 📡 Envoi de la requête
    const res = await fetch(url, init);

    // 📦 Lecture conditionnelle du corps JSON
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const hasBody = res.status !== 204 && res.status !== 205;

    let data: any = null;
    if (hasBody && isJson) {
      data = await res.json().catch(() => null);
    }

    // ❌ Gestion d’erreur enrichie
    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) || `HTTP ${res.status}`;
      const text = Array.isArray(msg) ? msg.join("\n") : String(msg);
      throw new HttpError(res.status, text, data);
    }

    // ✅ Succès
    return (data as T) ?? null;
  } finally {
    // 🧹 Nettoyage du timer de timeout s’il existe
    if (timer) clearTimeout(timer);
  }
}

// =======================================================
// 💡 Helpers pratiques pour simplifier les appels
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
