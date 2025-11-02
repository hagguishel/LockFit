// Fichier : src/authentification/authentification.controller.ts
// Fichier qui expose les routes HTTP de l'authentification (signup, login, MFA, email verification, password reset).
// Le controller NE contient pas la logique : il délègue tout à AuthService.
// Les DTO ci-dessous servent à valider les entrées (class-validator).

import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Req,
  Get,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

import { AuthService } from './authentification.service';

// ---------- DTOs (validation des payloads) ----------

// Inscription
class SignupDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;
}

// Connexion
class LoginDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}

// Vérifier un code TOTP pendant le login MFA
class MfaVerifyTotpDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  totpCode!: string;
}

// Activer la MFA (code requis)
class MfaCodeDto {
  @IsNotEmpty()
  totpCode!: string;
}

class MfaChallengeVerifyDto {
  @IsNotEmpty()
  tempSessionId!: string;

  @IsNotEmpty()
  code!: string;
}

class RefreshDto {
  @IsNotEmpty()
  refresh!: string;
}

// Password reset
class PasswordResetRequestDto {
  @IsEmail()
  email!: string;
}

class PasswordResetConfirmDto {
  @IsString()
  token!: string;

  @MinLength(8)
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --------- SIGNUP ---------
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // --------- LOGIN ---------
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('mfa/verify')
  @HttpCode(200)
  async mfaVerifyChallenge(@Body() body: MfaChallengeVerifyDto) {
    return this.authService.mfaVerify(body.tempSessionId, body.code);
  }

  // --------- MFA : créer le secret + otpauth URL (QR) ---------
  @Post('mfa/secret')
  @UseGuards(AuthGuard('jwt'))
  async mfaCreateSecret(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.authService.mfaCreateSecret(userId);
  }

  // --------- MFA : activer après vérification du code ---------
  @Post('mfa/enable')
  @UseGuards(AuthGuard('jwt'))
  async mfaEnable(@Req() req: Request, @Body() body: MfaCodeDto) {
    const userId = (req.user as any).sub;
    return this.authService.mfaEnable(userId, body.totpCode);
  }

  @Post('mfa/verify-totp')
  @HttpCode(200)
  async mfaVerifyTotp(@Body() body: MfaVerifyTotpDto) {
    return this.authService.mfaVerifyDuringLogin(body.email, body.totpCode);
  }

  // --------- Refresh ---------
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refresh);
  }

  // --------- Logout ---------
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request) {
    const authz = (req.headers['authorization'] as string) || '';
    return this.authService.logout('', authz);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  Getme(@Req() req: Request) {
    return req.user;
  }

  // ============================
  // ✉️ Email verification
  // ============================

  // 1) Demander l’envoi du lien de vérification (auth requis)
  @UseGuards(AuthGuard('jwt'))
  @Post('email/verify/request')
  async requestEmailVerify(@Req() req: Request) {
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    return this.authService.requestEmailVerification(userId);
  }

  // 2) Valider le token reçu par e-mail (public)
  @Get('email/verify')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  // ============================
  // 🔒 Password reset
  // ============================

  // 1️⃣ Demander un lien de réinitialisation
  @Post('password/reset/request')
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // 2️⃣ Confirmer le changement avec le token reçu par e-mail
  @Post('password/reset/confirm')
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto.token, dto.newPassword);
  }
}
