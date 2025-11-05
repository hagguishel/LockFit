//Fichier qui accepte les données pour modifier un entrainement. Pars du Create DTO en rendant les changements optionnels.

import { IsISO8601, IsOptional, IsString } from 'class-validator';                //Règles les validations pour les dates optionnelles (format ISO)

export class UpdateWorkoutDto  {
    @IsOptional() @IsString() title?: string | null;
    @IsOptional() @IsString() note?: string | null;
    @IsOptional() @IsISO8601() finishedAt?: string;
}
