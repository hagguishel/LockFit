//Fichier qui impose des données qui l'API accepte pour créer un entrainement.
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsDateString } from 'class-validator';

//Données attendues pour créer un entraînement

export class CreateWorkoutDto {
    @IsString() //title doit etre une chaine
    @IsNotEmpty()
    @MaxLength(250)
    title!: string; //Le "!" car c'est un champ obligatoire

    @IsString() // Vérifie que "note" est du texte
    @IsOptional()
    note?: string;

    @IsDateString() // Vérifie que "finishedAt" est une date ISO
    @IsOptional()
    finishedAt?: string;
}
