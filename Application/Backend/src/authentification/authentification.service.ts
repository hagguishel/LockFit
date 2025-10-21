// ======================================================================
// Service "Authentification" — toute la logique métier (sans HTTP).
// - Hash/verify des mots de passe (argon2)
// - Emission/rotation de tokens (access JWT + refresh JWT stocké en DB sous forme HASHÉE)
// - MFA par challenge 6 chiffres (table Prisma MfaChallenge)
// - (Optionnel) MFA TOTP (otplib) — tu peux garder pour activer Google Authenticator plus tard
// - Déconnexion (révocation refresh) / Déconnexion complète (gérée côté contrôleur si besoin)
// ======================================================================

import { Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";

import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { randomUUID, randomBytes } from 'crypto';

// ----------------------------------------------------------------------
// ⚙️ Variables d'environnement (avec valeurs par défaut raisonnables)
// ----------------------------------------------------------------------

const ACCESS_TTL  = process.env.JWT_ACCESS_TTL   || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';
const MFA_TTL_SEC = Number(process.env.MFA_CODE_TTL_SEC || 300);

// ----------------------------------------------------------------------
// 🧰 Helpers
// ----------------------------------------------------------------------

/** Convertit une durée lisible ("15m", "30d") en secondes numériques. */

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

/** Extrait le token brut depuis un header Authorization (Bearer …). */
function fromAuthz(header: string | undefined) {
    return (header || '').replace(/^Bearer\s+/i, '');
}

// ----------------------------------------------------------------------
// 🧾 Types internes (retours structurés, clairs côté contrôleur)
// ----------------------------------------------------------------------
type PublicUser = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    mfaEnabled: boolean;
};

type AuthResult = {
    accessToken: string;
    refreshToken: string;
    user: PublicUser;
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
      // Paramétrage TOTP (Google Authenticator) — optionnel
        authenticator.options = {
            step: Number(process.env.TOTP_STEP ?? 30),
            digits: Number(process.env.TOTP_DIGITS ?? 6),
            window: Number(process.env.TOTP_WINDOW ?? 1),
            algorithm: (process.env.TOTP_ALGO as any) ?? 'SHA1',
        };
    }

      // ======================================================================
      // 🔐 Emission des tokens (Access JWT + Refresh JWT hashé en DB)
      // ======================================================================

    private async issueTokens(utilisateur: { id: string; email: string }) {
        // 1) ACCESS (durée courte) — utilisé sur toutes les requêtes protégées
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
    /** Mise en forme d'un utilisateur public (sans champs sensibles). */
    private toPublicUser(u: any): PublicUser {
        return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            mfaEnabled: !!u.mfaEnabled,
        };
    }
      // ======================================================================
      // 👤 Signup (facultatif)
      // ======================================================================

    async signup(input: SignupInput): Promise<AuthResult> {
        const email = input.email.trim().toLowerCase();
        const emailexist = await this.prisma.utilisateur.findUnique({ where: { email } });
        if (emailexist) {
            throw new ConflictException('Email déjà existante');
        }

        const passwordHash = await argon2.hash(input.password);

        const user = await this.prisma.utilisateur.create({
            data: {
                email,
                password: passwordHash,
                firstName: input.firstName,
                lastName: input.lastName,
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
      // ======================================================================
      // 🔑 Login — si MFA activé, on crée un challenge et on renvoie tempSessionId
      // ======================================================================
    async login(input: LoginInput): Promise<
    AuthResult | { mfaRequired: true; tempSessionId: string }
    > {
        const email = input.email.trim().toLowerCase();

        const user = await this.prisma.utilisateur.findUnique({ where: { email } });
        if (!user) throw new UnauthorizedException('Identifiants invalides');

        const ok = await argon2.verify(user.password, input.password);
        if (!ok) throw new UnauthorizedException('Identifiants invalides');

         // 🔐 MFA ON → créer un challenge 6 chiffres et renvoyer un ticket temporaire
        if (user.mfaEnabled) {
          const code = (Math.floor(100000 + Math.random() * 900000)).toString();
          const tempSessionId = randomBytes(24).toString("hex");
          const expiresAt = new Date(Date.now() + MFA_TTL_SEC * 1000);

          await this.prisma.mfaChallenge.create({
            data: {
              utilisateurId: user.id,
              code,
              tempSessionId,
              expiresAt,
            },
          });

          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log(`[MFA] code pour ${email} = ${code}`);
          }

          return { mfaRequired: true, tempSessionId };
        }
        // sinon ->tokens immédiats
        const { accessToken, refreshToken } = await this.issueTokens({ id: user.id, email: user.email });
        return { accessToken, refreshToken , user: this.toPublicUser(user) };
      }

        // ======================================================================
        // ✅ MFA Verify — consomme le challenge (tempSessionId + code) → émet tokens
        // ======================================================================

    async mfaVerify(tempSessionId: string, code: string): Promise<AuthResult> {
      // 1) retrouver le challenge
      const ch = await this.prisma.mfaChallenge.findUnique({ where: { tempSessionId } });
      if (!ch) throw new UnauthorizedException("Session MFA introuvable");

      // 2) Vérification standard
      if (ch.used) throw new UnauthorizedException("Challenge déjà utilisé");
      if (ch.expiresAt.getTime() < Date.now()) throw new UnauthorizedException("Challenge expiré");
      if (ch.code !== code) throw new UnauthorizedException("Code incorrect");

      // 3) Charger l'utilisateur
      const user = await this.prisma.utilisateur.findUnique({ where: { id: ch.utilisateurId } });
      if (!user) throw  new UnauthorizedException("Utilisateur introuvable");

      // 4) Marquer "used" (anti-replay)
      await this.prisma.mfaChallenge.update({
        where: { id: ch.id },
        data: { used: true },
      });

      // 5) Emettre tokens
      const { accessToken, refreshToken } = await this.issueTokens({ id: user.id, email: user.email });
      return { accessToken, refreshToken, user: this.toPublicUser(user) };
    }

    // ======================================================================
    // 🔁 Refresh — reçoit le refresh JWT (via body), vérifie & rotate
    // ======================================================================

    async refresh(refreshTokenFromClient: string): Promise<AuthResult> {
      if (!refreshTokenFromClient) throw new BadRequestException("refresh manquant");

      // 1) Vérifier signature/expiration du refresh JWT
      let payload: { sub: string; jti: string; exp: number };
      try {
        payload = this.jwt.verify(refreshTokenFromClient, {
          secret: process.env.JWT_REFRESH_SECRET,
        }) as any;
      } catch {
        throw new UnauthorizedException("Refresh invalide");
      }

      const userId = payload.sub;
      const tokenId = payload.jti;
      if (!userId || !tokenId) throw new UnauthorizedException("Refresh incomplet");

      // 2) Retrouver l'enregistrement DB (non révoqué, non expiré)
      const rec = await this.prisma.refreshToken.findFirst({
        where: {
          utilisateurId: userId,
          jti: tokenId,
          revoked: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!rec) throw new UnauthorizedException("Refresh révoqué ou expiré");

      // 3) comparer au HASH stocké (sécurité anti-substitution)
      const ok = await argon2.verify(rec.tokenHash, refreshTokenFromClient);
      if (!ok) throw new UnauthorizedException("Refresh non reconnu");

      // 4) Rotation : révoquer l'ancien refresh
      await this.prisma.refreshToken.update({
        where: { id: rec.id },
        data: { revoked: true, revokedAt: new Date() },
      });

      // 5) Re-générer tokens
      const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException("Utilisateur introuvable");

      const { accessToken, refreshToken } = await this.issueTokens({ id: user.id, email: user.email, });
      return { accessToken, refreshToken, user: this.toPublicUser(user) };
    }

    // ======================================================================
    // 🚪 Logout — révoque le refresh courant (via Authorization: Bearer <refresh>)
    // ======================================================================

    async logout(userId: string, authzHeader: string) {
        // 1) Récupère le token brut depuis "Authorization: Bearer <token>"
        const rawRefreshToken = fromAuthz(authzHeader);
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

            return { message: "Déconnexion réussie" };
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
    // ======================================================================
    // 🧩 (Optionnel) TOTP (Google Authenticator)
    // ======================================================================

    /** Démarre le MFA TOTP : génère un secret + URL otpauth:// à scanner. */
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
        if (!isValid)  throw new UnauthorizedException('Code TOTP non valide');

        const updated = await this.prisma.utilisateur.update({
            where: { id: user.id },
            data: { mfaEnabled: true },
        });

        return { mfaEnabled: updated.mfaEnabled };
    }

    async mfaVerifyDuringLogin(email: string, totpCode: string): Promise<AuthResult> {
        const user = await this.prisma.utilisateur.findUnique({ where: {
          email: email.trim().toLowerCase() },
         });

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


}
