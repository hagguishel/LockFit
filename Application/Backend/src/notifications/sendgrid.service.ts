// src/notifications/sendgrid.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail'; // 👈 important: import *

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);

  constructor() {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      this.logger.warn('SENDGRID_API_KEY manquant — aucun email ne sera envoyé.');
    } else {
      sgMail.setApiKey(key); // 👈 maintenant c'est bien une fonction
      this.logger.log('SendGrid initialisé.');
    }
  }

  async sendEmailVerification(toEmail: string, verifyUrl: string) {
    // si une des 2 infos manque, on log et on sort
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
      this.logger.warn('Envoi email ignoré (clé ou expéditeur manquant).');
      return;
    }

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM!,
      subject: 'LockFit – Vérifie ton e-mail',
      html: `
        <p>Bonjour 👋</p>
        <p>Merci de vérifier ton e-mail pour utiliser LockFit.</p>
        <p><a href="${verifyUrl}">→ Vérifier mon e-mail</a></p>
        <p>(ce lien expire dans 24h)</p>
      `,
    };

    try {
      await sgMail.send(msg as any);
      this.logger.log(`Email de vérification envoyé à ${toEmail}`);
    } catch (err) {
      this.logger.error('Erreur SendGrid', err as any);
      // on ne throw pas, pour ne pas casser la route
    }
  }

  // tu pourras ajouter ça plus tard pour le reset password
  async sendPasswordReset(toEmail: string, resetUrl: string) {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
      this.logger.warn('Envoi reset ignoré (clé ou expéditeur manquant).');
      return;
    }

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM!,
      subject: 'LockFit – Réinitialisation de mot de passe',
      html: `
        <p>Tu as demandé à réinitialiser ton mot de passe.</p>
        <p><a href="${resetUrl}">→ Réinitialiser mon mot de passe</a></p>
        <p>Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>
      `,
    };

    try {
      await sgMail.send(msg as any);
      this.logger.log(`Email de reset envoyé à ${toEmail}`);
    } catch (err) {
      this.logger.error('Erreur SendGrid (reset)', err as any);
    }
  }
}
