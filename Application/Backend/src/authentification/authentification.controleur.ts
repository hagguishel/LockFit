// Fichier : src/authentification/authentification.controller.ts
// Fichier qui expose les routes HTTP de l'authentification (signup, login, MFA).
// Le controller NE contient pas la logique : il délègue tout à AuthService.
// Les DTO ci-dessous servent à valider les entrées (class-validator).

import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';              // Protège les routes avec JWT
import { Request } from 'express';                         //Type de l’objet req (utile quand on fait @Req() req: Request).
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

import { AuthService } from './authentification.service';

// ---------- DTOs (validation des payloads) ----------

// Inscription
class SignupDto {       //Classe décrivant les données attendues pour /signup.
  @IsEmail()
  email!: string;

  @MinLength(8) // règle minimale; on pourra durcir plus tard (majuscule, symbole, etc.)
  password!: string;

  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;
}

// Connexion
class LoginDto {        //DTO pour /login (email + mot de passe obligatoires).
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}

// Vérifier un code TOTP pendant le login MFA
class MfaVerifyLoginDto {       //DTO pour /mfa/verify (étape 2 du login MFA) : email + code TOTP.
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  totpCode!: string;
}

// Activer la MFA (code requis)
class MfaCodeDto {      //DTO pour /mfa/enable (activer la MFA) : on attend uniquement le code TOTP.
  @IsNotEmpty()
  totpCode!: string;
}

@Controller('auth') // Préfixe commun à toutes les routes d'auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --------- SIGNUP ---------
  // Route : POST /api/v1/auth/signup
  // Objectif : créer un utilisateur (hash argon2) et renvoyer accessToken + user public
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // --------- LOGIN ---------
  // Route : POST /api/v1/auth/login
  // Objectif : vérifier email + mot de passe.
  // - Si MFA désactivée : retourne accessToken immédiat.
  // - Si MFA activée : ne retourne PAS de token; renvoie mfaRequired: true (step 2).
  @Post('login')
  @HttpCode(200) // explicite (OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // --------- MFA : créer le secret + otpauth URL (QR) ---------
  // Route protégée (il faut être connecté)
  @Post('mfa/secret')
  @UseGuards(AuthGuard('jwt'))
  async mfaCreateSecret(@Req() req: Request) {
    const userId = (req.user as any).sub; // défini par JwtStrategy.validate(payload)
    return this.authService.mfaCreateSecret(userId);
  }

  // --------- MFA : activer après vérification du code ---------
  // Route protégée (il faut être connecté)
  @Post('mfa/enable')
  @UseGuards(AuthGuard('jwt'))
  async mfaEnable(@Req() req: Request, @Body() body: MfaCodeDto) {
    const userId = (req.user as any).sub;
    return this.authService.mfaEnable(userId, body.totpCode);
  }

  // --------- MFA : vérifier pendant le login (step 2) ---------
  // Public : utilisé juste après un login qui a renvoyé mfaRequired: true
  @Post('mfa/verify')
  @HttpCode(200)
  async mfaVerifyDuringLogin(@Body() body: MfaVerifyLoginDto) {
    return this.authService.mfaVerifyDuringLogin(body.email, body.totpCode);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(200)
  async refresh(@Req() req: Request) {
  // 1) Récupérer le header Authorization brut (contient le refresh token)
    const authz = (req.headers['authorization'] as string) || '';
  // 2) Le payload du refresh validé par la stratégie est disponible dans req.user
    const { sub, tokenId } = (req.user as any);
  // 3) Déléguer au service: vérifier le hash en base, révoquer l’ancien, renvoyer nouveaux tokens
    return this.authService.refresh(sub, tokenId, authz);
}

  @Post('logout')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(200)
  async logout(@Req() req: Request) {
  // 1) On lit le refresh token brut pour vérifier son hash et le marquer révoqué
    const authz = (req.headers['authorization'] as string) || '';
    const { sub } = (req.user as any);
  // 2) Le service révoque le refresh courant (sécurité)
    return this.authService.logout(sub, authz);
  }
}
