// src/notifications/sendgrid.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  private readonly client: any;

  constructor() {
    // compat ESM/CJS
    const client = (sgMail as any).default ?? sgMail;
    this.client = client;

    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      this.logger.warn('SENDGRID_API_KEY manquant — aucun email ne sera envoyé.');
    } else {
      try {
        this.client.setApiKey(key);
        this.logger.log('SendGrid initialisé.');
      } catch (e) {
        this.logger.error('Impossible d’initialiser SendGrid', e as any);
      }
    }
  }

  async sendEmailVerification(toEmail: string, verifyUrl: string) {
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
      await this.client.send(msg);
      this.logger.log(`Email de vérification envoyé à ${toEmail}`);
    } catch (err) {
      this.logger.error('Erreur SendGrid (verify)', err as any);
    }
  }

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
      await this.client.send(msg);
      this.logger.log(`Email de reset envoyé à ${toEmail}`);
    } catch (err) {
      this.logger.error('Erreur SendGrid (reset)', err as any);
    }
  }

  // 🔴 NOUVEAU : envoi du code MFA par e-mail
  async sendMfaCode(toEmail: string, code: string) {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
      this.logger.warn('Envoi MFA ignoré (clé ou expéditeur manquant).');
      return;
    }

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM!,
      subject: 'LockFit – Ton code de connexion',
      html: `
        <p>Bonjour 👋</p>
        <p>Voici ton code à 6 chiffres pour te connecter à LockFit :</p>
        <p style="font-size: 26px; font-weight: 700; letter-spacing: 6px; margin: 18px 0;">${code}</p>
        <p>Ce code expire dans quelques minutes.</p>
        <p>Si tu n'es pas à l'origine de cette connexion, tu peux ignorer cet e-mail.</p>
      `,
    };

    try {
      await this.client.send(msg);
      this.logger.log(`Code MFA envoyé à ${toEmail}`);
    } catch (err) {
      this.logger.error('Erreur SendGrid (MFA)', err as any);
    }
  }
}
