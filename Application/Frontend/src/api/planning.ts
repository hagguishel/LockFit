import { http } from "@/api/http";

export type PlanningJour = {
  id: string;
  date: string;
  note?: string | null;
  planningId: string;
  workoutId: string;
  status: "PLANNED" | "DONE";
  doneAt?: string | null;
  workout?: {
    id: string;
    title: string;
    note?: string | null; finisheAt?:
    string | null;
    createAt: string;
    updateAt: string;
  };
}

export type Planning = {
  id: string;
  nom: string;
  debut: string;
  fin: string;
  createAt: string;
  updatedAt: string;
  jours?: PlanningJour[];
};

/**
 * Liste tous les plannings
 * CORRECTION: listPlanning → listPlannings (pluriel pour cohérence)
 */
export const listPlannings = () =>
  http<{ items: Planning[]; total: number }>("/plannings");

/**
 * Récupère un planning spécifique par son ID
 */
export const getPlanning = (id: string) =>
  http<Planning>(`/plannings/${id}`);

/**
 * Crée un nouveau planning
 */
export const createPlanning = (payload: {
  nom: string;
  debut: string; // Format: YYYY-MM-DD
  fin: string;   // Format: YYYY-MM-DD
}) => http<Planning>("/plannings", {
  method: "POST",
  body: payload
});

/**
 * Met à jour un planning existant
 */
export const updatePlanning = (id: string, payload: Partial<{
  nom: string;
  debut: string;
  fin: string;
}>) => http<Planning>(`/plannings/${id}`, {
  method: "PATCH",
  body: payload,
});

/**
 * Supprime un planning
 */
export const deletePlanning = (id: string) =>
  http<void>(`/plannings/${id}`, { method: "DELETE" });

/**
 * Ajoute ou met à jour un item dans un planning (workout assigné à une date)
 */
export const upsertPlanningItem = (planningId: string, payload: {
  date: string;       // Format: YYYY-MM-DD
  workoutId: string;
  note?: string;
}) => http<Planning>(`/plannings/${planningId}/items`, {
  method: "POST",
  body: payload
});

/**
 * Supprime un item d'un planning
 * CORRECTION: URL était /plannings/${id} au lieu de /planning/${id}
 */
export const removePlanningItem = (planningId: string, itemId: string) =>
  http<Planning>(`/plannings/${planningId}/items/${itemId}`, {
    method: "DELETE"
  });
