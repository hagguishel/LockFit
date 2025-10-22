// Contrat d'entrée pour POST /auth/login
// On valide le format des champs avant d'exécuter la logique métier.

import { IsEmail, IsString, MinLength } from "class-validator";

export class Logindto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caratère' })
  password!: string;
}
