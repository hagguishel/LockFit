// src/lib/workouts.ts
// Client métier pour parler aux routes /workouts
import { http } from "@/api/http";
import type { Workout, WorkoutItem, WorkoutSet } from "@/types/workout";

export type ListResponse = {
  items: Workout[];
  total: number;
};

export type CreateWorkoutInput = {
  title: string;
  note?: string;
  finishedAt?: string;
  items?: WorkoutItem[];
};

export async function listWorkouts(params?: { from?: string; to?: string }): Promise<ListResponse> {
  // params peut contenir "from" et/ou "to".
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const data = await http<ListResponse>(`/workouts${suffix}`);

  // Normalisation robuste
  const items = Array.isArray(data?.items) ? data!.items : [];
  const total =
    typeof data?.total === "number"
      ? data!.total
      : items.length;

  return { items, total };
}

/** Détail d’une séance (GET /workouts/:id) */
export async function getWorkout(id: string): Promise<Workout> {
  const w = await http<Workout>(`/workouts/${id}`);
  if (!w) throw new Error("Séance introuvable");
  return w;
}

/** Création d’une séance (POST /workouts) */
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
  patch: Partial<CreateWorkoutInput>
) {
  return http<Workout>(`/workouts/${id}`, {
    method: "PATCH",
    body: patch,
  });
}

/** Suppression (DELETE /workouts/:id) */
export async function deleteWorkout(id: string) {
  return http<{ ok: true; id: string }>(`/workouts/${id}`, {
    method: "DELETE",
  });
}

/** Marquer comme terminée (POST /workouts/:id/finish) */
export async function finishWorkout(id: string) {
  return http<Workout>(`/workouts/${id}/finish`, { method: "POST" });
}

export type { Workout } from "@/types/workout";

/** Ajouter un item (exercise) à une séance existante */
export type NewWorkoutItemInput = {
  exerciseId: string;
  reps: number;
  weight?: number;
  rest?: number;
};

export async function addWorkoutItem(workoutId: string, input: NewWorkoutItemInput) {
  // 1) charger la séance actuelle
  const w = await getWorkout(workoutId);
  // 2) fabriquer l'item à partir de l'input
  const nextOrder = (w.items?.length ?? 0) + 1;
  const newItem: WorkoutItem = {
    exerciseId: input.exerciseId,
    order: nextOrder,
    sets: [{ reps: input.reps, weight: input.weight, rest: input.rest } satisfies WorkoutSet],
  };
  // 3) construire le nouveau tableau items
  const items = [...(w?.items ?? []), newItem];
  // 4) PATCH /workouts/:id
  await updateWorkout(workoutId, { items });
  return getWorkout(workoutId);
}

export async function completeSet(workoutId: string, setId: string) {
  const url = `/workout/${workoutId}/sets/${setId}/complete`;
  console.log(`[completeSet] PATCH ${url}`);
  try {
    const res = await http<WorkoutSet>(url, { method: "PATCH" });
    console.log("[completeSet] OK:", res);
    return res;
  } catch (e: any) {
    console.error("[completeSet ERREUR]", e?.message || e);
    throw e;
  }
}
