// Contrat d'entrée pour POST /auth/mfa/verify
// On attend le "ticket" (tempSessionId) + le code 6 chiffres envoyé à l'utilisateur.

import { IsString, Length } from "class-validator";

export class MfaVerifyDto {
  @IsString()
  tempSessionId!: string;

  @IsString()
  @Length(6, 6, { message: 'Le code MFA doit contenir 6 chiffres' })
  code!: string;
}
