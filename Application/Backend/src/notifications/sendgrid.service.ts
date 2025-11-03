// src/notifications/sendgrid.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  private readonly hasApi: boolean;

  constructor() {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      this.logger.warn('SENDGRID_API_KEY manquant — les emails ne seront pas envoyés.');
      this.hasApi = false;
    } else {
      sgMail.setApiKey(key); // 👈 il manquait ça
      this.hasApi = true;
    }
  }

  /**
   * Email de vérification (après signup / demande de vérif)
   */
  async sendEmailVerification(toEmail: string, verifyUrl: string) {
    // on loggue toujours le lien pour debug Render
    this.logger.log(`💌 [EmailVerification] vers ${toEmail} → ${verifyUrl}`);

    const from =
      process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM || 'no-reply@lockfit.app';

    // si pas de clé ou pas de from → on s'arrête après le log
    if (!this.hasApi) return;

    try {
      await sgMail.send({
        to: toEmail,
        from,
        subject: 'LockFit – Vérifie ton adresse e-mail',
        html: `
          <p>Bonjour 👋</p>
          <p>Clique sur le lien ci-dessous pour vérifier ton e-mail :</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>Ce lien expire dans 24h.</p>
        `,
      } as any);
      this.logger.log(`[SendGrid] Email de vérification envoyé à ${toEmail}`);
    } catch (err) {
      this.logger.error('[SendGrid] Erreur lors de l’envoi de l’email de vérification', err as any);
      // on ne throw pas pour ne pas casser le flux côté API
    }
  }

  /**
   * Email de reset mot de passe (forgot password)
   */
  async sendPasswordReset(toEmail: string, resetUrl: string) {
    this.logger.log(`💌 [PasswordReset] vers ${toEmail} → ${resetUrl}`);

    const from =
      process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM || 'no-reply@lockfit.app';

    if (!this.hasApi) return;

    try {
      await sgMail.send({
        to: toEmail,
        from,
        subject: 'LockFit – Réinitialisation de mot de passe',
        html: `
          <p>Bonjour 👋</p>
          <p>Tu as demandé à réinitialiser ton mot de passe.</p>
          <p>Clique ici :</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Si tu n'es pas à l’origine de cette demande, ignore cet email.</p>
        `,
      } as any);
      this.logger.log(`[SendGrid] Email de reset envoyé à ${toEmail}`);
    } catch (err) {
      this.logger.error('[SendGrid] Erreur lors de l’envoi de l’email de reset', err as any);
    }
  }
}
