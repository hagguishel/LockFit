import { IsISO8601, IsOptional, IsString } from "class-validator";

/** DTO pour POST /plannings/:id/jours */
export class AjouterJourDto {
  @IsISO8601()
  date!: string;

  @IsString()
  workoutId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
