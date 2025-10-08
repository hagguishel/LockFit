//Fichier qui montre toute la logique métier de l'authentification 

import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";

import * as argon2 from 'argon2';
import { authenticator } from 'otplib';

// Payload minimal dans le JWT d'accès, suffisant pôur retrouver l'utilisateur côté API, sans exposer d'infos sensibles.
type AccesTokenPayload = {
    sub: string;          // userId
    email: string;
};

// Type de retour standard lors d'un login/signup
type AuthResult = {
    accessToken: string;    // le JWT d'accès que le front stocke
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        mfaEnabled: boolean;   // indique si la MFA est activée sur ce compte
    };
};

// provisoire, côté service, pour avancer sans créer encore les fichiers DTO
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
        private readonly prisma: PrismaService,   //Acces base de données
        private readonly jwt: JwtService,
    ) {
        authenticator.options = {   // La configuration du MFA  avec Google authentificator
            step: Number(process.env.TOTP_STEP ?? 30),   //Periode en secondes
            digits: Number(process.env.TOTP_DIGITS ?? 6), //nombre de chiffres
            window: Number(process.env.TOTP_WINDOW ?? 1), // tolérance du au décalage d'horloge
            algorithm: (process.env.TOTP_ALGO as any) ?? 'SHA1',
        };
    }

    private async signAccessToken(utilisateur: { id: string; email: string}): Promise<string> { // fonction asynchrone qui attend une chaine (le jwt)
        const payload: AccesTokenPayload = { sub: utilisateur.id, email: utilisateur.email };
        return this.jwt.signAsync(payload);
    }

    // Retourne l'objet utilisateur "public" (sans password, sans secret MFA), but : ne pas envoyer les infos sensibles
    private toPublicUser(u: any) {
        return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            mfaEnabled: !!u.mfaEnabled,
        };
    }

    // Inscription : crée un user si l'email n'existe pas, hash le mot de passe avec argon2,
    // puis émet un access token.
    async signup(input: SignupInput): Promise<AuthResult> {
        const { email, password, firstName, lastName } = input;

        //Vérifie l'unicité de l'email
        const emailexist =  await this.prisma.utilisateur.findUnique({ where: { email } });
        if (emailexist) {
            throw new ConflictException('Email déjà existante');
        }

        //Le sel est automatiquement appliqué dans le hashage par argon2
        const passwordHash = await argon2.hash(password);

        //Créer l'utilisateur
        const user = await this.prisma.utilisateur.create({
            data: {
                email,
                password: passwordHash,
                firstName,
                lastName,
            },
        });

        //Emet un accesToken a l'utilisateur. Attend la promesse de signAccesToken, pour envoyer le token
        const accessToken = await this.signAccessToken({ id: user.id, email: user.email });

        return {
            accessToken,
            user: this.toPublicUser(user),
        };
    }

    // --------- LOGIN (sans MFA) ---------

    // Connexion standard : vérifie l'email + hash argon2.
    // Si le compte a MFA activé, on retourne un "hint" côté front pour lancer le step MFA (optionnel).
    async login(input: LoginInput): Promise<AuthResult & { mfaRequired?: boolean }> {
        const { email, password } = input;

        // 1) Récupérer l'utilisateur par email
        const user = await this.prisma.utilisateur.findUnique({ where: { email } });
        if (!user) {
            // Pour éviter de "leaker" si l'email existe, on répond un Unauthorized générique
            throw new UnauthorizedException('Identifiants invalides');
        }

        // 2) Vérifier le mot de passe (argon2.verify)
        const ok = await argon2.verify(user.password, password);
        if (!ok) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        // 3) Si MFA activé, on peut exiger une étape supplémentaire côté front
        if (user.mfaEnabled) {
            // Deux approches possibles :
            // A) Retourner un flag mfaRequired=true et NE PAS délivrer de token ici.
            // B) Délivrer un "token temporaire" ou un "challengeId" et demander le TOTP ensuite.
            // Pour rester simple (V1), on exige une vérification TOTP séparée et on NE délivre pas l'access token ici.
            return {
                accessToken: '', // pas de token tant que le TOTP n’est pas validé
                user: this.toPublicUser(user),
                mfaRequired: true,
            };
        }

        // 4) Sinon, login direct : on signe et on retourne
        const accessToken = await this.signAccessToken({ id: user.id, email: user.email });

        return {
            accessToken,
            user: this.toPublicUser(user),
        };
    }

    //-----MFA (TOTP).
    // Le serveur et l'app d'auth (google authentificator) partagent le même secret

    //MfaCreateSecret: fonction qui créer le secret initial
    async mfaCreateSecret(id: string) {
        const user = await this.prisma.utilisateur.findUnique({ where: { id } });
        if (!user) throw new BadRequestException('Utilisateur introuvable');
        
        //Génère le secret en Base32. Ce secret sera la "graine" pour générer tous les codes à 6 chiffres
        const secret = authenticator.generateSecret();

        const issuer = process.env.APP_NAME || 'LockFit';
        const label = user.email;
        const otpauthUrl = authenticator.keyuri(label, issuer, secret); //Créer l'url spéciale qui contient issuer, label, et secret
        
        //Met a jour l'utilisateur dans la base de données
        await this.prisma.utilisateur.update({
            where: { id: user.id },
            data: { mfaSecret: secret }, //Sauvegarde le secret dans la colonne mfaSecret
        });

        return { secret, otpauthUrl };
    }

    async mfaEnable(id: string, totpCode: string) { //Prend l'id utilisateur et le code a 6 chiffres que l'utilisateur a vu sur son app 
        const user = await this.prisma.utilisateur.findUnique({ where: { id } });
        if (!user || !user.mfaSecret) { //Si pas d'utilisateur ou n'a pas fait l'etape 1
            throw new BadRequestException('Double authentification non initialisé');
        }

        //MOMENT CRUCIAL: On verifie si le code est bon
        const isValid = authenticator.verify({
            token: totpCode,
            secret: user.mfaSecret
        });

        if (!isValid) {
            throw new UnauthorizedException('Code TOTP non valide');
        }

        const updated = await this.prisma.utilisateur.update({
            where : { id: user.id },
            data: { mfaEnabled: true },
        });

        //A partir d'ici, l'utilisateur devra mettre un code pour se connecter
        return { mfaEnabled: updated.mfaEnabled };
    }

    async mfaVerifyDuringLogin(email: string, totpCode: string): Promise<AuthResult> {
        const user = await this.prisma.utilisateur.findUnique({ where: { email } });

        if (!user || !user.mfaEnabled || !user.mfaSecret) { // Si l'utilsateur n'a pas la MFA activée ou n'a pas de secret
            throw new BadRequestException('MFA non active pour cet utilisateur');
        }

        const ok = authenticator.verify({ // on vérifie le code TOTP comme dans mfaEnable  
            token: totpCode,
            secret: user.mfaSecret
        });

        if (!ok) {
            throw new UnauthorizedException('Code TOTP invalide');
        }

        const accessToken = await this.signAccessToken({
            id: user.id,
            email: user.email
        });

        return {
            accessToken,
            user: this.toPublicUser(user),
        };
    }
}
