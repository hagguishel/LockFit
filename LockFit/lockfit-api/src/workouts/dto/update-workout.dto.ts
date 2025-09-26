//Fichier qui accepte les données pour modifier un entrainement. Pars du Create DTO en rendant les changements optionnels.

import { PartialType } from '@nestjs/mapped-types';                     //Utilitaire Nest qui prend un autre DTO et le transforme pour le rendre optionnel
import { CreateWorkoutDto } from './create-workout.dto';                // On part du contrat de création.
import { IsISO8601, IsOptional } from 'class-validator';                //Règles les validations pour les dates optionnelles (format ISO)

export class UpdateWorkoutDto extends PartialType(CreateWorkoutDto) {
    @IsOptional()
    @IsISO8601()
    finishedAt?: string;
}
