import { http } from "@/api/http";
import type { Planning } from "@/types/planning";

/**
 * Liste tous les plannings
 * CORRECTION: listPlanning → listPlannings (pluriel pour cohérence)
 */
export const listPlannings = () =>
  http<Planning[]>("/plannings");

/**
 * Récupère un planning spécifique par son ID
 */
export const getPlanning = (id: string) =>
  http<Planning>(`/planning/${id}`);

/**
 * Crée un nouveau planning
 */
export const createPlanning = (payload: {
  title: string;
  rangeStart: string; // Format: YYYY-MM-DD
  rangeEnd: string;   // Format: YYYY-MM-DD
}) => http<Planning>("/planning", {
  method: "POST",
  body: payload
});

/**
 * Met à jour un planning existant
 */
export const updatePlanning = (id: string, payload: Partial<{
  title: string;
  rangeStart: string;
  rangeEnd: string;
}>) => http<Planning>(`/planning/${id}`, {
  method: "PATCH",
  body: payload
});

/**
 * Supprime un planning
 */
export const deletePlanning = (id: string) =>
  http<void>(`/planning/${id}`, { method: "DELETE" });

/**
 * Ajoute ou met à jour un item dans un planning (workout assigné à une date)
 */
export const upsertPlanningItem = (planningId: string, payload: {
  date: string;       // Format: YYYY-MM-DD
  workoutId: string;
  note?: string;
}) => http<Planning>(`/planning/${planningId}/items`, {
  method: "POST",
  body: payload
});

/**
 * Supprime un item d'un planning
 * CORRECTION: URL était /plannings/${id} au lieu de /planning/${id}
 */
export const removePlanningItem = (planningId: string, itemId: string) =>
  http<Planning>(`/planning/${planningId}/items/${itemId}`, {
    method: "DELETE"
  });
