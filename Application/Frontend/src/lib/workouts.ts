// src/lib/workouts.ts
// Client "métier" du FRONT pour parler aux routes /workouts de l'API Nest.
//
// PRINCIPES IMPORTANTS
// --------------------
// 1) PATCH /workouts/:id n'accepte QUE: { title, note, finishedAt }.
//    ❌ NE JAMAIS envoyer { items: [...] } sur cette route -> 400 "property items should not exist"
//    ✅ Pour modifier une SERIE (set): utiliser PATCH /workouts/:workoutId/sets/:setId
//
// 2) On centralise ici toutes les fonctions d'appel à l'API pour que les écrans
//    n'aient pas à connaître la forme exacte des endpoints.
//
// 3) On utilise les helpers httpGet/httpPatch/httpPost pour plus de lisibilité
//    (http "générique" reste importé pour DELETE, sauf si tu as un httpDelete).

import { http, httpGet, httpPatch, httpPost } from "@/api/http";
import type {
  Workout,
  WorkoutItem,
  WorkoutSet,
  WorkoutSetPatch, // défini dans src/types/workout.ts
} from "@/types/workout";

// -------- Types de réponses/requêtes --------

/** Réponse de GET /workouts (liste paginée simple) */
export type ListResponse = {
  items: Workout[];
  total: number;
};

/** Corps attendu par POST /workouts (création) */
export type CreateWorkoutInput = {
  title: string;
  note?: string;
  finishedAt?: string;
  items?: WorkoutItem[]; // optionnel: tu peux créer direct avec items/sets
};

/** Petits types utilitaires (si besoin pour composer des items localement) */
export type PatchSerie = { reps?: number; weight?: number | null; rest?: number | null };

/**
 * ⚠️ Type RESTREINT pour PATCH /workouts/:id
 * ==> UNIQUEMENT ce que le backend accepte sur cette route
 * ==> On évite ainsi d'envoyer des champs interdits (ex: items)
 */
export type UpdateWorkoutBody = Partial<
  Pick<CreateWorkoutInput, "title" | "note" | "finishedAt">
>;

// -------- Endpoints --------

/**
 * GET /workouts
 * - Filtre possible par "from" et "to" (ISO string)
 * - Retourne { items, total }
 */
// ─────────────────────────────────────────────────────────────────────────────
// listWorkouts : maintenant on renvoie à la fois les séances réelles (/workouts)
// ET, si un intervalle (from/to) est fourni, on AJOUTE les planifiées
// (/workouts/scheduled), puis on fusionne sans doublons.
// ─────────────────────────────────────────────────────────────────────────────
export async function listWorkouts(params?: { from?: string; to?: string }): Promise<ListResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const base = await httpGet<ListResponse>(`/workouts${suffix}`);
  const baseItems = base?.items ?? [];

  let scheduledItems: Workout[] = [];
  if (params?.from || params?.to) {
    try {
      const scheduled = await listScheduled(params?.from, params?.to);
      const fallbackDate = new Date(0).toISOString(); // 1970-01-01T00:00:00.000Z
      scheduledItems = (scheduled ?? []).map(s => ({
        id: s.id,
        title: s.title,
        finishedAt: s.finishedAt ?? null,
        items: [],
        createdAt: (s as any).createdAt ?? fallbackDate,
        updatedAt: (s as any).updatedAt ?? fallbackDate,
      })) as Workout[];
    } catch {
      scheduledItems = [];
    }
  }

  const seen = new Set<string>();
  const merged = [...baseItems, ...scheduledItems].filter(w => {
    if (!w?.id) return false;
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });

  return { items: merged, total: merged.length };
}


/**
 * GET /workouts/:id
 * - Détail d'une séance, avec items + sets + exercise
 */
export async function getWorkout(id: string): Promise<Workout> {
  const w = await httpGet<Workout>(`/workouts/${id}`);
  if (!w) throw new Error("Séance introuvable");
  return w;
}

/**
 * POST /workouts
 * - Création d'une séance (tu peux créer sans items au début)
 */
export async function createWorkout(input: CreateWorkoutInput) {
  const payload = {
    title: input.title,
    note: input.note,
    finishedAt: input.finishedAt,
    items: Array.isArray(input.items) ? input.items : [],
  };
  return httpPost<Workout>("/workouts", payload);
}

/**
 * PATCH /workouts/:id
 * ⚠️ N'accepte QUE: { title, note, finishedAt }
 * -> NE PAS envoyer { items } ici (sinon 400)
 */
export async function updateWorkout(id: string, body: UpdateWorkoutBody) {
  return httpPatch<Workout>(`/workouts/${id}`, body);
}

/**
 * DELETE /workouts/:id
 * - Suppression de la séance (cascade items/sets côté DB)
 * - Remarque: si tu as un helper httpDelete, tu peux l'utiliser ici.
 */
export async function deleteWorkout(id: string) {
  return http<{ ok: true; id: string }>(`/workouts/${id}`, { method: "DELETE" });
}

/**
 * PATCH /workouts/:workoutId/sets/:setId/complete
 * - Marquer 1 série comme terminée
 */
export async function completeSet(workoutId: string, setId: string) {
  return httpPatch<WorkoutSet>(`/workouts/${workoutId}/sets/${setId}/complete`, {});
}

/**
 * PATCH /workouts/:workoutId/sets/:setId
 * - ✅ Route à utiliser pour les boutons +/− sur reps/poids/rest/RPE
 * - Le backend gère:
 *   * null préservé (ex: rpe:null ne devient pas 0)
 *   * "" ignoré (ex: rest:"" => inchangé)
 */
export async function updateSet(workoutId: string, setId: string, patch: WorkoutSetPatch) {
  return httpPatch<WorkoutSet>(`/workouts/${workoutId}/sets/${setId}`, patch);
}

/**
 * POST /workouts/:id/finish
 * - Marque la séance comme terminée (finishedAt = now)
 */
export async function finishWorkout(id: string) {
  return httpPost<Workout>(`/workouts/${id}/finish`, {});
}

/** Re-export pratique si tes écrans font `import { type Workout } from "@/lib/workouts"` */
export type { Workout } from "@/types/workout";

// -------- Fonction volontairement désactivée --------

/**
 * Ajout d'un item (exercice) dans une séance existante (DÉSACTIVÉ).
 *
 * ❌ Actuellement, ton backend NE PERMET PAS de modifier "items"
 *    via PATCH /workouts/:id, d'où l'erreur 400 si on tente.
 *
 * ✅ À faire plus tard côté API si tu veux cette feature:
 *    - Créer un endpoint dédié: POST /workouts/:id/items
 *    - et éventuellement: DELETE /workouts/:id/items/:itemId, PATCH /.../items/:itemId, etc.
 */
export type NewWorkoutItemInput = {
  exerciseId: string; // id d'un exercice existant en DB
  reps: number;
  weight?: number;
  rest?: number;
};
  export async function duplicateWorkout(id: string) {
    return httpPost<Workout>(`/workouts/${id}/duplicate`, {});
  }

  export async function scheduleWorkout(id: string, scheduledFor: string) {
    return httpPost<Workout>(`/workouts/${id}/schedule`, { scheduledFor });
  }

  export type ScheduledItem = Pick<
  Workout,
  "id" | "title" | "finishedAt"
  > & { scheduledFor: string | null; isTemplate?: boolean };

  export async function listScheduled(from?: string, to?: string) {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
     try {
      return await httpGet<ScheduledItem[]>(`/workouts/scheduled${suffix}`);
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
}

export async function addWorkoutItem(_workoutId: string, _input: NewWorkoutItemInput) {
  throw new Error(
    "addWorkoutItem désactivé: pas d'endpoint backend pour ajouter un item à une séance. " +
      "Implémente POST /workouts/:id/items côté API si tu veux cette fonctionnalité."
  );

}
