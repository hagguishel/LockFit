-- CreateTable
CREATE TABLE "public"."Planning" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanningJour" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "planningId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,

    CONSTRAINT "PlanningJour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningJour_planningId_date_idx" ON "public"."PlanningJour"("planningId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningJour_planningId_date_workoutId_key" ON "public"."PlanningJour"("planningId", "date", "workoutId");

-- AddForeignKey
ALTER TABLE "public"."PlanningJour" ADD CONSTRAINT "PlanningJour_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "public"."Planning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanningJour" ADD CONSTRAINT "PlanningJour_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
