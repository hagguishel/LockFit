//Fichier qui lit le token dans le header dans Authorization, verifie la signature, et attache le payload a req.user pour les routes protégées.
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Où trouver le token dans la requête HTTP
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Clé secrète pour vérifier la signature du token (doit être la même que celle utilisée pour signer)
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
      // Si le token est expiré, on le refuse (false = on respecte l’expiration)
      ignoreExpiration: false,
    });
  }

  // Cette méthode est appelée si la vérification du token réussit.
  // 'payload' = contenu du token (ce qu’on a signé : sub, email, etc.).
  async validate(payload: { sub: string; email: string }) {
    // La valeur retournée sera accessible dans les handlers via req.user
    // Exemple: req.user.sub = userId ; req.user.email = email
    return payload;
  }
}
