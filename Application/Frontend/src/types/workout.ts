// src/types/workout.ts
export type WorkoutSet = {
  reps: number;
  weight?: number;
  rest?: number;
  done?: boolean;
};

export type WorkoutItem = {
  exerciseId: string;
  order: number;
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  title: string;
  note?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: WorkoutItem[];
};

export type Paginated<T> = {
  items: T[];
  total?: number;
};
