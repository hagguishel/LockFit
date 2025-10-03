// Fichier qui centralise la construction d’URL, en-têtes, sérialisation JSON, gestion des erreurs pour tous les appels.

const BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, ""); // base d’URL lue depuis .env, on retire les / de fin

type HttpOptions = {                                                      // options possibles pour un appel
  method?: "GET" | "POST" | "PATCH" | "DELETE";                           // verbe HTTP
  body?: any;                                                             // corps à envoyer (objet JS)
  signal?: AbortSignal | null;                                            // permet d’annuler la requête
  headers?: Record<string, string>;                                       // en-têtes supplémentaires
};

export async function http<T = unknown>(path: string, opts: HttpOptions = {}) { // fonction générique d’appel HTTP
  const url = `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;              // construit l’URL finale proprement

  const {                                                                     // on récupère les options avec des valeurs par défaut
    method = "GET",                                                           // par défaut on fait un GET
    body,                                                                     // corps éventuel
    signal = null,                                                            // pas de signal par défaut
    headers: extraHeaders,                                                    // en-têtes en plus
  } = opts;

  const init: RequestInit = {                                                 // objet d’init pour fetch()
    method: method as RequestInit["method"],                                  // on caste pour rassurer TypeScript
    headers: {                                                                // en-têtes à envoyer
      "Content-Type": "application/json",                                     // on parle JSON
      ...(extraHeaders ?? {}),                                                // on ajoute/écrase avec ceux fournis
    } as HeadersInit,
  };

  if (signal) {                                                               // si on a un signal d’annulation
    (init as any).signal = signal;                                            // on le met dans l’init (cast simple)
  }

  if (body !== undefined && body !== null) {                                  // si on a un corps à envoyer
    init.body = JSON.stringify(body);                                         // on le transforme en chaîne JSON
  }

  const res = await fetch(url, init);                                         // on envoie la requête

  const data = (await res.json().catch(() => null)) as T | null;              // on tente de lire du JSON (sinon null)

  if (!res.ok) {                                                              // si le statut HTTP n’est pas 2xx
    const msg =                                                               // on fabrique un message d’erreur lisible
      (data && ((data as any).message || (data as any).error)) ||             // priorité au message d’erreur du back
      `HTTP ${res.status}`;                                                   // sinon un fallback générique
    throw new Error(Array.isArray(msg) ? msg.join("\n") : msg);               // on jette une Error avec un texte propre
  }

  return data as T;                                                           // en succès, on renvoie les données JSON (ou null si 204)
}