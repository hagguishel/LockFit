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
    note?: string | null;
    finishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type Planning = {
  id: string;
  nom: string;
  debut: string;
  fin: string;
  createdAt: string;
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
 * ajouter un jour au planning
 */

export const addPlanningDay = (
  planningId: string,
  payload: {
    date: string;
    workoutId: string;
    note?: string;
   }
) =>
  http<PlanningJour>(`/plannings/${planningId}/jours`, {
    method: "POST",
    body: payload,
});
