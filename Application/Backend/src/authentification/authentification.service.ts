//Fichier qui montre toute la logique métier de l'authentification 

import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";

import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { randomUUID } from 'crypto';

const ACCESS_TTL  = process.env.JWT_ACCES_TTL   || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

//AJOUT: fonction helper pour convertir une string en nombre ( pour problèmes de typage)
function parseTTL(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) {
        // Si pas de format reconnu, retourner un nombre par défaut
        return 900; // 15 minutes
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch(unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 900;
    }
}

function FromAuthz(header: string | undefined) {
    return (header || '').replace(/^Bearer\s+/i, ''); 
}

type AccesTokenPayload = {
    sub: string;
    email: string;
};

// Type de retour standard lors d'un login/signup (CORRIGÉ)
type AuthResult = {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        mfaEnabled: boolean;
    };
};

type SignupInput = {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
};

type LoginInput = {
    email: string;
    password: string;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) {
        authenticator.options = {
            step: Number(process.env.TOTP_STEP ?? 30),
            digits: Number(process.env.TOTP_DIGITS ?? 6),
            window: Number(process.env.TOTP_WINDOW ?? 1),
            algorithm: (process.env.TOTP_ALGO as any) ?? 'SHA1',
        };
    }

    // CORRIGÉ: Renommé pour correspondre à l'appel
    private async issueTokens(utilisateur: { id: string; email: string }) {
        // 1) ACCESS TOKEN (durée courte)
        const accessToken = await this.jwt.signAsync(
            { sub: utilisateur.id, email: utilisateur.email },
            {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: parseTTL(ACCESS_TTL),
            },
        );

        // 2) REFRESH TOKEN (durée longue) + identifiant unique
        const tokenId = randomUUID();
        const refreshToken = await this.jwt.signAsync(
            { sub: utilisateur.id, jti: tokenId },
            {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: parseTTL(REFRESH_TTL),
            },
        );

        // 3) Calculer la date d'expiration pour utiliser expiresAt
        const expiresInSeconds = parseTTL(REFRESH_TTL);
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000); //Transforme en millisecondes car JS travaille en millisecondes

        // 4) Stocker uniquement le hash du refresh (jamais en clair)
        const tokenHash = await argon2.hash(refreshToken);
        await this.prisma.refreshToken.create({
            data: { utilisateurId: utilisateur.id, tokenHash, jti: tokenId, expiresAt },
        });

        return { accessToken, refreshToken };
    }

    private toPublicUser(u: any) {
        return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            mfaEnabled: !!u.mfaEnabled,
        };
    }

    async signup(input: SignupInput): Promise<AuthResult> {
        const { email, password, firstName, lastName } = input;

        const emailexist = await this.prisma.utilisateur.findUnique({ where: { email } });
        if (emailexist) {
            throw new ConflictException('Email déjà existante');
        }

        const passwordHash = await argon2.hash(password);

        const user = await this.prisma.utilisateur.create({
            data: {
                email,
                password: passwordHash,
                firstName,
                lastName,
            },
        });

        const { accessToken, refreshToken } = await this.issueTokens({
            id: user.id,
            email: user.email,
        });

        return {
            accessToken,
            refreshToken,
            user: this.toPublicUser(user),
        };
    }

    // CORRIGÉ: Type de retour cohérent
    async login(input: LoginInput): Promise<AuthResult | { mfaRequired: true; user: AuthResult['user'] }> {
        const { email, password } = input;

        const user = await this.prisma.utilisateur.findUnique({ where: { email } });
        if (!user) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        const ok = await argon2.verify(user.password, password);
        if (!ok) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        if (user.mfaEnabled) {
            return {
                mfaRequired: true,
                user: this.toPublicUser(user),
            };
        }

        const { accessToken, refreshToken } = await this.issueTokens({
            id: user.id,
            email: user.email,
        });

        return {
            accessToken,
            refreshToken,
            user: this.toPublicUser(user),
        };
    }

    async mfaCreateSecret(id: string) {
        const user = await this.prisma.utilisateur.findUnique({ where: { id } });
        if (!user) throw new BadRequestException('Utilisateur introuvable');
        
        const secret = authenticator.generateSecret();
        const issuer = process.env.APP_NAME || 'LockFit';
        const label = user.email;
        const otpauthUrl = authenticator.keyuri(label, issuer, secret);
        
        await this.prisma.utilisateur.update({
            where: { id: user.id },
            data: { mfaSecret: secret },
        });

        return { secret, otpauthUrl };
    }

    async mfaEnable(id: string, totpCode: string) {
        const user = await this.prisma.utilisateur.findUnique({ where: { id } });
        if (!user || !user.mfaSecret) {
            throw new BadRequestException('Double authentification non initialisé');
        }

        const isValid = authenticator.verify({
            token: totpCode,
            secret: user.mfaSecret
        });

        if (!isValid) {
            throw new UnauthorizedException('Code TOTP non valide');
        }

        const updated = await this.prisma.utilisateur.update({
            where: { id: user.id },
            data: { mfaEnabled: true },
        });

        return { mfaEnabled: updated.mfaEnabled };
    }

    async mfaVerifyDuringLogin(email: string, totpCode: string): Promise<AuthResult> {
        const user = await this.prisma.utilisateur.findUnique({ where: { email } });

        if (!user || !user.mfaEnabled || !user.mfaSecret) {
            throw new BadRequestException('MFA non active pour cet utilisateur');
        }

        const ok = authenticator.verify({
            token: totpCode,
            secret: user.mfaSecret
        });

        if (!ok) {
            throw new UnauthorizedException('Code TOTP invalide');
        }

        const { accessToken, refreshToken } = await this.issueTokens({
            id: user.id,
            email: user.email,
        });

        return {
            accessToken,
            refreshToken,
            user: this.toPublicUser(user),
        };
    }

    // AJOUT: Méthodes manquantes pour refresh et logout
    async refresh(userId: string, tokenId: string, authzHeader: string) {
        const refreshToken = FromAuthz(authzHeader);
        
        // Vérifier que le refresh token existe en base
        const storedToken = await this.prisma.refreshToken.findFirst({
            where: { 
                utilisateurId: userId,
                revoked: false,
                jti: tokenId,
                expiresAt: { gt: new Date() }
            }
        });

        if (!storedToken) {
            throw new UnauthorizedException('Token invalide ou révoqué');
        }

        // Vérifier le hash
        const isValid = await argon2.verify(storedToken.tokenHash, refreshToken);
        if (!isValid) {
            throw new UnauthorizedException('Token invalide');
        }

        // Révoquer l'ancien refresh token
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true }
        });

        // Récupérer l'utilisateur
        const user = await this.prisma.utilisateur.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new UnauthorizedException('Utilisateur introuvable');
        }

        // Émettre de nouveaux tokens
        const { accessToken, refreshToken: newRefreshToken } = await this.issueTokens({
            id: user.id,
            email: user.email,
        });

        return {
            accessToken,
            refreshToken: newRefreshToken,
            user: this.toPublicUser(user),
        };
    }

    async logout(userId: string, authzHeader: string) {
        // 1) Récupère le token brut depuis "Authorization: Bearer <token>"
        const rawRefreshToken = FromAuthz(authzHeader);
        if(!rawRefreshToken) {
            return { message: 'Deconnexion réussie'};
        }

        try {
            // 2) Décode/valide le JWT pour récupérer le jti (ID unique du token) et le sub (userId)
            const payload = this.jwt.verify(rawRefreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            }) as { jti: string; sub: string};

            // 3) Révoque par jti
            await this.prisma.refreshToken.updateMany({
                where: { jti: payload.jti, utilisateurId: payload.sub, revoked: false }, //on cherche les tokens encore actifs
                data: { revoked: true, revokedAt: new Date() }, // et on les revoque
            });
        } catch {
            //Si le token est invalide ou expiré, on retrouve l'entrée via le hash stocké et on révoque (au cas ou)
            const candidate = await this.prisma.refreshToken.findFirst({
                where: { utilisateurId: userId, revoked: false },
                orderBy: { createdAt: 'desc' }, // le plus récent d'abord (optionnel)
                });

            if (candidate) {
                const isValid = await argon2.verify(candidate.tokenHash, rawRefreshToken);
                if (isValid) {
                    await this.prisma.refreshToken.update({
                        where: { id: candidate.id },
                        data: { revoked: true, revokedAt: new Date() },
                    });
                }
            }
        }
        
        return { message: 'Déconnexion réussie' };
    }
}