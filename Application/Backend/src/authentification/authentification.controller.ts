// src/authentification/authentification.controller.ts
// Expose les routes HTTP d'authentification : signup, login, MFA, vérif email, reset password.

import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Req,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

import { AuthService } from './authentification.service';

// ---------- DTOs (validation) ----------

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

// Password reset (version JSON)
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

  // --------------------------------------------------
  // SIGNUP
  // --------------------------------------------------
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // --------------------------------------------------
  // MFA (challenge 6 chiffres)
  // --------------------------------------------------
  @Post('mfa/verify')
  @HttpCode(200)
  async mfaVerifyChallenge(@Body() body: MfaChallengeVerifyDto) {
    return this.authService.mfaVerify(body.tempSessionId, body.code);
  }

  // Créer un secret TOTP (protégé)
  @Post('mfa/secret')
  @UseGuards(AuthGuard('jwt'))
  async mfaCreateSecret(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.authService.mfaCreateSecret(userId);
  }

  // Challenge 
  @Post('mfa/enable')
  @UseGuards(AuthGuard('jwt'))
  async mfaEnable(@Req() req: Request) {
  const userId = (req.user as any).sub;
    return this.authService.mfaEnableChallenge(userId);
}

  @Post('mfa/disable')
  @UseGuards(AuthGuard('jwt'))
  async mfaDisable(@Req() req: Request) {
  const userId = (req.user as any).sub;
    return this.authService.mfaDisableChallenge(userId);
}



  // Vérifier un TOTP pendant le login
  @Post('mfa/verify-totp')
  @HttpCode(200)
  async mfaVerifyTotp(@Body() body: MfaVerifyTotpDto) {
    return this.authService.mfaVerifyDuringLogin(body.email, body.totpCode);
  }

  // --------------------------------------------------
  // Refresh token
  // --------------------------------------------------
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refresh);
  }

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request) {
    const authz = (req.headers['authorization'] as string) || '';
    return this.authService.logout('', authz);
  }

  // --------------------------------------------------
  // /me
  // --------------------------------------------------
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: Request) {
    return req.user;
  }

  // --------------------------------------------------
  // ✉️ Email verification
  // --------------------------------------------------

  // 1) Demander l’envoi du lien de vérif
  @UseGuards(AuthGuard('jwt'))
  @Post('email/verify/request')
  async requestEmailVerify(@Req() req: Request) {
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    return this.authService.requestEmailVerification(userId);
  }

  // 2) Cliquer sur le lien reçu
  @Get('email/verify')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  // --------------------------------------------------
  // 🔒 Password reset (API)
  // --------------------------------------------------

  // 1) Demande de reset (depuis l’app / site)
  @Post('password/reset/request')
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // 2) Confirmation du reset
  // On accepte JSON (mobile) ET form-url-encoded (notre page HTML)
  @Post('password/reset/confirm')
  async confirmPasswordReset(@Body() body: any) {
    const token = body.token;
    const newPassword = body.newPassword;
    return this.authService.confirmPasswordReset(token, newPassword);
  }

  // --------------------------------------------------
  // 🖥️ Page HTML de reset
  // GET /api/v1/auth/password/reset?token=...
  // --------------------------------------------------
  @Get('password/reset')
  async resetPasswordPage(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      return res
        .status(400)
        .send('<h1>Token manquant</h1><p>Le lien de réinitialisation est incomplet.</p>');
    }

    return res.send(`
      <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>LockFit – Réinitialiser le mot de passe</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background:#0b0b1a; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:16px; }
          .card { background:#0e1a23; padding:24px; border-radius:16px; width:100%; max-width:420px; box-shadow:0 15px 40px rgba(0,0,0,.25); }
          h1 { margin-top:0; font-size:1.35rem; }
          label { display:block; margin-bottom:6px; font-weight:600; }
          input { width:100%; padding:10px 12px; border-radius:10px; border:1px solid #13343d; background:#0b1720; color:#fff; margin-bottom:14px; }
          button { background:#16a968; color:#fff; border:none; padding:11px 14px; border-radius:10px; font-weight:700; width:100%; cursor:pointer; }
          .muted { font-size:.75rem; opacity:.7; margin-top:10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Nouveau mot de passe</h1>
          <p>Choisis un nouveau mot de passe pour ton compte.</p>
          <form method="POST" action="/api/v1/auth/password/reset/confirm">
            <input type="hidden" name="token" value="${token}" />
            <label for="pw">Nouveau mot de passe</label>
            <input id="pw" name="newPassword" type="password" required minlength="8" placeholder="********" />
            <button type="submit">Mettre à jour</button>
            <p class="muted">Si ce lien a expiré, recommence depuis l’application.</p>
          </form>
        </div>
      </body>
      </html>
    `);
  }
}
