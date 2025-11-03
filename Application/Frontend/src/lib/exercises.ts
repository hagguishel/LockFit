// src/lib/exercises.ts
// Client pour récupérer la liste des exercices depuis l'API Nest.

import { httpGet } from "@/api/http";

export type ExerciseDef = {
  id: string;
  slug: string;
  name: string;
  primaryMuscle?: string;
  secondaryMuscle?: string;
  equipment?: string;
  level?: string;
};

export async function listExercises(): Promise<ExerciseDef[]> {
  console.log("[exercices.ts] -> GET /exercises");
  const data = await httpGet<ExerciseDef[]>("/exercises");
  console.log("[exercises.ts <- /exercises response:", data);
  return data ?? [];
}
