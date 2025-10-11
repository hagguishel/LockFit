//Fichier qui impose des données qui l'API accepte pour créer un entrainement.
import { Type } from 'class-transformer';
import { IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  Min,
  ValidateNested
 } from 'class-validator';
//Données attendues pour créer un entraînement
export class CreateWorkoutSetDto {
  @IsInt() @Min(1) reps!: number;
  @IsOptional() weight?: number;
  @IsOptional() rest?: number;
  @IsOptional() rpe?: number;
}

export class CreateWorkoutItemDto {
  @IsString() exerciseId!: string;
  @IsInt() @Min(1) order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutSetDto)
  sets!: CreateWorkoutSetDto[];
}
export class CreateWorkoutDto {
    @IsString() @IsNotEmpty() @MaxLength(250)
    title!: string;

    @IsString() @IsOptional()
    note?: string;

    @IsDateString() @IsOptional()
    finishedAt?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateWorkoutItemDto)
    items!: CreateWorkoutItemDto[];
}
