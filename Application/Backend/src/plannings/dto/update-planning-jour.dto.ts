import { IsISO8601, IsOptional, IsString, IsNotEmpty, Length } from "class-validator";

export class UpdatePlanningJourDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string; // attendu 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(20, 40) // cadre large pout CUID
  workoutId?: string;
}
