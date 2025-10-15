export type PlanningItem = {
  id: string;
  date:  string
  workoutId: string;
  note?: string | null;
};

export type Planning = {
  id: string;
  title: string;
  rangeStart: string;
  rangeEnd: string;
  items: PlanningItem[];
}
