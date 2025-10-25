import { http } from "@/api/http";

/* ============================== Types ============================== */

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
  debut: string; // YYYY-MM-DD
  fin: string;   // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  jours?: PlanningJour[];
};

export type Paginated<T> = { items: T[]; total: number };

/* ============================== API =============================== */

/** Liste des plannings (valeur par défaut sûre si 204/no content) */
export const listPlannings = async (): Promise<Paginated<Planning>> => {
  return (await http<Paginated<Planning>>("/plannings")) ?? { items: [], total: 0 };
};

/** Récupère un planning par ID */
export const getPlanning = (id: string) => http<Planning>(`/plannings/${id}`);

/** Crée un planning */
export const createPlanning = (payload: {
  nom: string;
  debut: string; // YYYY-MM-DD
  fin: string;   // YYYY-MM-DD
}) => http<Planning>("/plannings", { method: "POST", body: payload });

/** Ajoute un jour à un planning */
export const addPlanningDay = (
  planningId: string,
  payload: {
    date: string;      // YYYY-MM-DD
    workoutId: string;
    note?: string;
  }
) =>
  http<PlanningJour>(`/plannings/${planningId}/jours`, {
    method: "POST",
    body: payload,
  });
