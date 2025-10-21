//Fichier qui configure ce qui est branché dans le domaine Auth

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt"; //Verifie les JWT (acces token)
import { PassportModule } from "@nestjs/passport"; // Integre les stratégies d'auth (JWT)

//Controleurs et services d'authentification (routes + logique métier)
import { AuthService } from './authentification.service';
import { AuthController } from './authentification.controleur';

// Stratégie JWT : lit le header Authorization, vérifie la signature et attache le payload à req.user

// Accès a la base de données avec Prisma
import { PrismaModule } from "../prisma/prisma.module";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshJwtStrategy } from "./strategies/refresh.strategy";

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
        //Branche Passport et déclare la stratégie par default  "jwt"
        // En gros, permet d'utiliser @UseGuards(AuthGuard()) sans préciser 'jwt' à chaque fois.
        PrismaModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),

        // Configure le module JWT de manière asynchrone pour lire les secrets depuis les variables d'environnement
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.JWT_ACCESS_SECRET,

                signOptions: {
                    expiresIn: parseTTL(process.env.JWT_ACCESS_TTL, 900),
                },
            }),
        }),
    ],
        // Déclare les routes / contrôleurs exposés par le module
    controllers: [AuthController],

    // Enregistre les "fournisseurs" (providers) disponibles à l'injection
    // - AuthService : inscription, login, MFA (argon2 + otplib utilisés dans le service)
    // - JwtStrategy : vérifie les tokens entrants
    // - PrismaService : accès BD (users, etc.)
    providers: [AuthService, JwtStrategy, RefreshJwtStrategy],

    // Exporte certains éléments pour réutilisation par d'autres modules si besoin
    // (par exemple, utiliser JwtService ailleurs pour signer un token)
    exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
