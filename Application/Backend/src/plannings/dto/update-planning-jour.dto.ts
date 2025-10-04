import { IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdatePlanningJourDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string; // attendu 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  @IsUUID()
  workoutId?: string;
}
