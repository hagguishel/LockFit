//Fichier client métier pour parler aux routes /workouts

import { http } from "../api/http";

export type Workout = { //Basé sur le schema.prisma
    id: string;
    title: string;
    note?: string | null;
    finishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ListResponse = { //Ce que renvoie GET /workouts
    items: Workout[];
    total: number;
};

export type CreateWorkoutInput = { //Ce que renvoie POST /workouts
    title: string;
    note?: string;
    finishedAt?: string;
};

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

export async function getWorkout(id: string) {   //On attend une string car le cuid est une string
    return http<Workout>(`/workouts/${id}`);     //Construit l'URL grâce a l'ID
}

export async function createWorkout(input: CreateWorkoutInput) {  //On se base sur CreateWorkoutInput plus haut
    return http<Workout>(`/workouts`, { method: "POST", body: input });
}

export async function updateWorkout(
    id: string,
    patch: Partial<CreateWorkoutInput>   //Partial: N'as pas besoin de prendre tout le modèle en entier
) {
    return http<Workout>(`/workouts/${id}`, {
        method: "PATCH",
        body: patch,
});
}

export async function deleteWorkout(id: string) {
    return http<{ok: true; id: string }>(`/workouts/${id}`, { //Le back renvoie { ok: true, id}
        method: "DELETE",
    });
}

export async function finishWorkout(id: string) {           //Marque une séance comme terminée
    return http<Workout>(`/workouts/${id}/finish`, {        //Le Back calcule lui meme que finishedAt = now() donc pas de body
        method: "POST",
    });
}
