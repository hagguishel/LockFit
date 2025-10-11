//fichier qui lit le token dans Authorization: Bearer "<refresh_token>", verifie la signature avec JWT_REFRESH_SECRET et attache le payload a req.user.// src/authentification/strategies/refresh.strategy.ts
// Stratégie Passport pour valider les JWT de REFRESH.

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type RefreshPayload = {
  sub: string;     // ID utilisateur (subject)
  tokenId: string; // identifiant unique du refresh (sert à la rotation/revocation)
  iat?: number;    // (auto) issued-at
  exp?: number;    // (auto) expiration
};

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      // Où chercher le token : dans le header Authorization
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Clé secrète pour vérifier la signature du *refresh* (PAS la même que l'access)
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      // On respecte l'expiration : un refresh expiré est refusé
      ignoreExpiration: false,
    });
  }

  // Appelée si la signature + l'expiration sont OK.
  // On reçoit le *payload* du refresh (ici { sub, tokenId, ... }).
  async validate(payload: RefreshPayload) {
    // Cette valeur sera disponible dans req.user sur les routes protégées par AuthGuard('jwt-refresh')
    // Exemple: req.user.sub, req.user.tokenId
    return payload;
  }
}
