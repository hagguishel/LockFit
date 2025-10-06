import { IsISO8601, IsOptional, IsString, IsNotEmpty, Length } from "class-validator";

/** DTO pour POST /plannings/:id/jours */
export class AjouterJourDto {
  @IsISO8601({ strict: true })
  date!: string;

  @IsString()
  @IsNotEmpty()
  @Length(20, 40)
  workoutId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
