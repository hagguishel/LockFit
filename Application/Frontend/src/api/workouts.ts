// src/api/workouts.ts
import { http } from "./http";
import type { Workout, Paginated } from "@/types/workout";
export type { Workout, Paginated }

type ListQuery = { from?: string; to?: string };

type WorkoutItem = {
  exerciseId: string;
  sets: Array<{ reps: number; weight?: number; restSec?: number }>;
}
/**
 * Liste paginée des entraînements
 * GET /workouts?from=&to=
 */
export function listWorkouts(q?: ListQuery) {
  const params = new URLSearchParams();
  if (q?.from) params.append("from", q.from);
  if (q?.to) params.append("to", q.to);

  const qp = params.toString() ? `?${params.toString()}` : "";
  return http<Paginated<Workout>>(`/workouts${qp}`);
}

/**
 * Détail d'un entraînement
 * GET /workouts/:id
 */
export function getWorkout(id: string) {
  return http<Workout>(`/workouts/${id}`);
}

/**
 * Création d'un entraînement
 * POST /workouts
 */
export function createWorkout(payload: {
  title: string;
  note?: string | null;
  items?: WorkoutItem[]
}) {
  return http<Workout>("/workouts", {
    method: "POST",
    body: payload,
  });
}

/**
 * Marquer un entraînement comme terminé
 * POST /workouts/:id/finish
 */
export function finishWorkout(id: string) {
  return http<Workout>(`/workouts/${id}/finish`, { method: "POST" });
}

export async function addWorkoutItem(workoutId: string,
  item: WorkoutItem
) {
  // 1) on récupère l'etat actuel
  const current = await getWorkout(workoutId);
  if (!current) {
    throw new Error(`Workout ${workoutId} not found`)
  }
  const nextItems = [...(current.items ?? []), item];

  // 2) on pousse via patch
  return http<Workout>(`/workouts/${workoutId}`, {
    method: "PATCH",
    body: { items: nextItems },
  });
}
