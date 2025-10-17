// http.ts — centralise la construction d’URL, les en-têtes, la sérialisation JSON et la gestion des erreurs

// =======================================================
// 🌐 Configuration de base de l'API
// =======================================================
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
export const API_BASE = RAW_BASE.trim().replace(/\/+$/, ""); // on retire les / en fin d’URL
if (!API_BASE) {
  // Sur téléphone réel, on DOIT fournir EXPO_PUBLIC_API_URL (tunnel HTTPS conseillé)
  throw new Error(
    "EXPO_PUBLIC_API_URL manquant (ex: https://<ton-tunnel>.trycloudflare.com/api/v1)"
  );
}

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

  _retry?: boolean;        // [AJOUT] interne: marqueur pour savoir si on a déjà retenté après un refresh (évite la boucle)
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

// ========================== gestion des tokens & refresh ==========================
// On réutilise TON stockage sécurisé existant
import { loadTokens, saveTokens, clearTokens } from "../lib/tokenStorage"; //  on lit/sauve/efface access+refresh

let refreshing = false;        //  drapeau: un refresh est-il déjà en cours ?
let waiters: Array<() => void> = []; //  liste d'attente: les requêtes attendent que le refresh finisse

/**  Tente de renouveler l'access token via le refresh token. Retourne true si OK. */
async function tryRefreshOnce(): Promise<boolean> {
  if (refreshing) {                          //  si un refresh est déjà en cours
    await new Promise<void>((resolve) => waiters.push(resolve)); // on attend gentiment la fin
    return true;                              // on considère le refresh “géré” (réussi ou pas, l’appelant verra)
  }

  refreshing = true;                          // on passe en mode "refresh en cours"
  try {
    const tokens = await loadTokens();        // on récupère le refresh token stocké
    const refresh = tokens?.refresh;
    if (!refresh) return false;               //  pas de refresh => impossible de renouveler

    const resp = await fetch(buildUrl("/auth/refresh"), { // appelle l’endpoint /auth/refresh de ton back
      method: "POST",
      headers: { Authorization: `Bearer ${refresh}` },    // ton back attend le refresh en Authorization
    });

    if (!resp.ok) return false;               // si le back refuse, on s’arrête

    const data = await resp.json();           //  on récupère la nouvelle paire
    const accessToken = (data as any)?.accessToken;
    const refreshToken = (data as any)?.refreshToken;
    if (!accessToken || !refreshToken) return false; // sécurité: on vérifie qu’on a bien les 2

    await saveTokens({ access: accessToken, refresh: refreshToken }); // on met à jour le coffre
    return true;                                //  refresh OK
  } catch {
    return false;                               //  en cas d’erreur réseau/parsing: échec
  } finally {
    refreshing = false;                         //  fin du refresh (réussi ou pas)
    waiters.forEach((w) => w());                //  on réveille ceux qui attendaient
    waiters = [];                               //  on vide la file d’attente
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
  const url = buildUrl(path);

  const {
    method = "GET",
    body,
    signal: externalSignal = null,
    headers: extraHeaders,
    timeoutMs = 20000,
    token = null,           // 🔐 si un token est passé manuellement, on l’utilise tel quel
    _retry = false,         //  interne: déjà retenté après refresh ?
  } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extraHeaders ?? {}),
  };

  //  Si aucun token explicite n’est fourni, on essaie d’ajouter automatiquement l’access token stocké
  if (!token) {
    const stored = await loadTokens();                    //  lit { access, refresh } depuis SecureStore
    if (stored?.access && !headers["Authorization"]) {    //  si on a un access, on le met dans l’en-tête
      headers["Authorization"] = `Bearer ${stored.access}`;
    }
  } else {
    headers["Authorization"] = `Bearer ${token}`;         //  priorité au token fourni via les options
  }

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

  // ============================= [AJOUT] gestion auto du 401 → refresh → retry =============================
  if (res.status === 401 && !_retry) {                             // si non autorisé et pas encore retenté
    const refreshed = await tryRefreshOnce();                      //  on tente de renouveler les tokens
    if (refreshed) {                                               // si OK, on rejoue la même requête 1 fois
      const fresh = await loadTokens();                            //  on relit l’access tout neuf
      const retryHeaders: Record<string, string> = {
        ...headers,
        ...(fresh?.access ? { Authorization: `Bearer ${fresh.access}` } : {}), // remet l'Authorization à jour
      };
      const retryRes = await fetch(url, { ...init, headers: retryHeaders, signal: combinedSignal });
      const retryCT = retryRes.headers.get("content-type") || "";
      const retryIsJson = retryCT.includes("application/json");
      const retryHasBody = retryRes.status !== 204 && retryRes.status !== 205;
      let retryData: any = null;
      if (retryHasBody && retryIsJson) {
        try {
          retryData = await retryRes.json();
        } catch {
          retryData = null;
        }
      }
      if (!retryRes.ok) {                                          //  si ça échoue encore
        if (retryRes.status === 401) {                              //  si toujours 401 => session KO
          await clearTokens();                                      //  on se déconnecte côté app (tokens effacés)
        }
        const msg2 =
          (retryData && (retryData.message || retryData.error)) || `HTTP ${retryRes.status}`;
        const text2 = Array.isArray(msg2) ? msg2.join("\n") : String(msg2);
        throw new HttpError(retryRes.status, text2, retryData);     //  on remonte une erreur propre
      }
      return (retryData as T) ?? null;                              // retry OK -> on renvoie la réponse
    } else {
      await clearTokens();                                          //  refresh impossible -> on nettoie la session locale
      // on laisse l'erreur 401 d'origine être gérée ci-dessous (throw HttpError)
    }
  }
  // =========================== FIN gestion auto du 401 → refresh → retry ===========================

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
