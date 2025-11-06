// src/lib/workouts.ts
// Client métier pour parler aux routes /workouts
import { http } from "@/api/http";
import type { Workout, WorkoutItem, WorkoutSet } from "@/types/workout";

export type ListResponse = { //Ce que renvoie GET /workouts
    items: Workout[];
    total: number;
};

export type CreateWorkoutInput = { //Ce que renvoie POST /workouts
    title: string;
    note?: string;
    finishedAt?: string;
    items?: WorkoutItem[];
};

export type PatchSerie = { reps?: number; weight?: number | null; rest?: number | null };
export type PatchItem = { exerciseId?: string; order?: number; sets?: PatchSerie[] };
export type UpdateWorkoutPatch = { items?: PatchItem[] };
export type UpdateWorkoutBody = Partial<CreateWorkoutInput> | UpdateWorkoutPatch;

export async function listWorkouts(params?: { from?: string; to?: string }): Promise<ListResponse> {
  //params peut contenir "from" et/ou "to". Coté back Nest, ca arrive sur findAll (from et to pour lister)
  const qs = new URLSearchParams();                                         //créer un constructeur de query string
  if (params?.from) qs.set("from", params.from);                            //Si params existe et qu'il contient un from, on ajoute une valeur a from
  if (params?.to) qs.set("to", params.to);                                  //Si params existe et qu'il contient un to, on ajoute une valeur a to
  const suffix = qs.toString() ? `?${qs.toString()}` : "";                  //S’il y a au moins un paramètre de filtre, fabrique ?from=...&to=.... Sinon, ne rajoute rien à l’URL.

  const data = await http<ListResponse>(`/workouts${suffix}`);

  // 🔒 Normalisation: jamais null/undefined
  return {
    items: data?.items ?? [],
    total: typeof data?.total === "number" ? data.total : (data?.items?.length ?? 0),
  };
}

/** Détail d’une séance (GET /workouts/:id) */
export async function getWorkout(id: string): Promise<Workout> {
  const w = await http<Workout>(`/workouts/${id}`);
  if (!w) throw new Error("Séance introuvable");
  return w;
}

/** Création d’une séance (POST /workouts)
 *  NB: ton écran new.tsx envoie seulement { title } pour l’instant.
 */

export async function createWorkout(input: CreateWorkoutInput) {
  const payload = {
    title: input.title,
    note: input.note,
    finishedAt: input.finishedAt,
    items: Array.isArray(input.items) ? input.items : [],
  };
  return http<Workout>("/workouts", { method: "POST", body: payload });
}

/** Mise à jour d’une séance (PATCH /workouts/:id) */
export async function updateWorkout(
  id: string,
  body: UpdateWorkoutBody
) {
  return http<Workout>(`/workouts/${id}`, {
    method: "PATCH",
    body,
  });
}

/** Suppression (DELETE /workouts/:id) */
export async function deleteWorkout(id: string) {
  return http<{ ok: true; id: string }>(`/workouts/${id}`, {
    method: "DELETE",
  });
}

/** Marquer une serie comme termine */
export async function completeSet(workoutId :string, setId: string) {
  return http<WorkoutSet>(`/workouts/${workoutId}/sets/${setId}/complete`, {
    method: "PATCH",
    body: {},
  });
}

/** Marquer comme terminée (POST /workouts/:id/finish) */
export async function finishWorkout(id: string) {
  return http<Workout>(`/workouts/${id}/finish`, { method: "POST" });
}

// export pratique si tes écrans font `import { type Workout } from "@/lib/workouts"`
export type { Workout } from "@/types/workout";

/** Ajout un item (exercise) à une scéance existante */

export type NewWorkoutItemInput = {
  exerciseId: string;               // id d'un exercise en DB
  reps: number;                     // nb de rep
  weight?: number;
  rest?: number;
};

export async function addWorkoutItem(workoutId :string, input: NewWorkoutItemInput) {
  //1) charger la sceance actuelle
  const w = await getWorkout(workoutId);
  //2) fabriquer l'item a partir de l'input
  const nextOrder = (w.items?.length ?? 0) + 1;
  const newItem: PatchItem = {
    exerciseId: input.exerciseId,
    order: nextOrder,
    sets: [{ reps: input.reps, weight: input.weight, rest: input.rest }],
  };
 await updateWorkout(workoutId, { items: [newItem] });
 return getWorkout(workoutId);
}
