// src/types/workout.ts
export type WorkoutSet = {
  id? : string;
  reps: number;
  weight?: number | null;
  rest?: number | null;
  rpe?: number | null;
  completed?: boolean;
  workoutItemId?: string;
};

export type WorkoutItem = {
  id?: string;
  order: number;
  workoutId?: string;
  exerciseId: string;
  exercise?: {
    id: string;
    name: string;
    primaryMuscle?: string | null;
    secondaryMuscle?: string | null;
    equipment?: string | null;
    level?: string |null;
  };
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  title: string;
  note?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: WorkoutItem[];
};

export type Paginated<T> = {
  items: T[];
  total?: number;
};
