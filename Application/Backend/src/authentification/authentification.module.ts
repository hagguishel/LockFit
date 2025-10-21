// =====================================================
// Module "Authentification" (connexion, MFA, refresh, déconnexion).
//
// Rôle :
//  - Brancher Passport (stratégies d'auth) et JWT (signature/validation des tokens)
//  - Fournir AuthService (logique métier) + PrismaService (accès BDD)
//  - Mettre à disposition les contrôleurs (routes REST)
//  - Optionnel : enregistrer aussi une stratégie "refresh" si tu utilises un refresh JWT
//    (si tu utilises un refresh OPAQUE stocké en BDD → la stratégie refresh JWT est inutile)
// =====================================================

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt"; //Verifie les JWT (acces token)
import { PassportModule } from "@nestjs/passport"; // Integre les stratégies d'auth (JWT)

// Contrôleur + Service (ton code métier) )
import { AuthService } from './authentification.service';
import { AuthController } from './authentification.controller';


// Accès Base de données (Prisma)
import { PrismaService } from "../prisma/prisma.service";
// Stratégies d'authentification :
// - JwtStrategy : vérifie l'access token "Authorization: Bearer <jwt>"
// - RefreshJwtStrategy : (optionnel) si ton refresh est aussi un JWT (différent du modèle refresh OPAQUE)
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshJwtStrategy } from "./strategies/refresh.strategy";

/**
 * Convertit une durée lisible (ex: "15m", "30d") en secondes numériques.
 * Pourquoi ? Parce que "expiresIn" du JwtModule accepte soit une string lisible,
 * soit un nombre de secondes. Les deux marchent.
 *
 * Si la variable d'environnement est absente ou mal formée, on retombe
 * sur une valeur par défaut passée en paramètre.
 */

function parseTTL(ttl: string | undefined, defaultSeconds: number): number {
    if (!ttl) return defaultSeconds;

    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return defaultSeconds;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch(unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return defaultSeconds;
    }
}

@Module({
    imports: [
            // -------------------------------------------------
            // 1) Passport : permet @UseGuards(AuthGuard()) sans préciser 'jwt' à chaque fois
            //    (la stratégie par défaut devient 'jwt', donc AuthGuard() === AuthGuard('jwt'))
            // -------------------------------------------------
        PassportModule.register({ defaultStrategy: 'jwt' }),

            // -------------------------------------------------
            // 2) JWT : on lit secrets/durées depuis process.env (cf. .env)
            //    - secret   : clé de signature du token d'accès
            //    - expiresIn: durée de vie (en s ou string "15m")
            //
            // NB: On utilise registerAsync() pour pouvoir charger dynamiquement.
            //     Tu pourrais aussi passer directement expiresIn: process.env.JWT_ACCESS_TTL (string),
            //     Nest accepte les deux formats.
            // -------------------------------------------------
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.JWT_ACCESS_SECRET,
                // ici on convertit "15m" → 900 (secondes)

                signOptions: {
                    expiresIn: parseTTL(process.env.JWT_ACCESS_TTL, 900),
                },
            }),
        }),
    ],
          // -------------------------------------------------
          // Routes exposées par ce module (ex: /api/v1/auth/login)
          // -------------------------------------------------

    controllers: [AuthController],

          // -------------------------------------------------
          // Providers : logique + stratégies + services de bas niveau
          // -------------------------------------------------
    providers: [
      AuthService,              // login / mfa / refresh / logout (révocation)
      PrismaService,            // accès BDD (Utilisateur, RefreshToken, MfaChallenge)
      JwtStrategy,              // vérifie "access token" sur les routes protégées
      RefreshJwtStrategy        // ⚠️ seulement si tu utilises un "refresh JWT". Si refresh OPAQUE → inutile.
    ],

          // -------------------------------------------------
          // Exports : rend dispo ces éléments à d'autres modules (facultatif mais pratique)
          // -------------------------------------------------
    exports: [
      AuthService,               // permet à d'autres modules d'appeler logoutAllByUserId par ex.
      JwtModule,                 // si tu veux signer un token ailleurs
      PassportModule             // si un autre module a besoin d'AuthGuard()
    ],
})
export class AuthModule {}
