import { IsISO8601, IsOptional } from "class-validator";

export class FinishPlanningJourDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  finishedAt?: string; // ISO date-time
}
