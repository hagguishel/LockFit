-- CreateEnum
CREATE TYPE "PlanningJourStatus" AS ENUM ('PLANNED', 'DONE');

-- AlterTable
ALTER TABLE "PlanningJour" ADD COLUMN     "doneAt" TIMESTAMP(3),
ADD COLUMN     "status" "PlanningJourStatus" NOT NULL DEFAULT 'PLANNED';
