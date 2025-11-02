import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);

  constructor() {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      this.logger.warn('SENDGRID_API_KEY manquant');
    } else {
      sgMail.setApiKey
    }
  }

  async sendEmailVerification(toEmail: string, verifyUrl: string) {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) return;

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM!,
      subject: 'LockFit – Vérifiez votre e-mail',
      html: `
        <p>Bonjour,</p>
        <p>Merci de vérifier votre e-mail en cliquant sur le lien ci-dessous, pour utiliser LockFit :</p>
        <p><a href="${verifyUrl}">Vérifier mon e-mail</a></p>
        <p>Ce lien expire dans 24h.</p>
      `,
    };

    try {
      await sgMail.send(msg as any);
    } catch (err) {
      this.logger.error('SendGrid error', err as any);
      // On ne jette pas l'erreur : la génération du token reste valide
    }
  }
}
