// Contrat d'entrée pour POST /auth/refresh
// On attend le token de refresh OPAQUE (côté DB on stocke seulement un hash).

import { IsString, MinLength } from "class-validator";


export class RefreshDto {
  @IsString()
  @MinLength(10) // arbitraire, pour eviter les valeurs vides
  refresh!: string;
}
