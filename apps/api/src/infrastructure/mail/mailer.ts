import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Transporter, createTransport } from 'nodemailer';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * En-têtes List-Unsubscribe (RFC 2369) et List-Unsubscribe-Post (RFC 8058) des e-mails
   * récurrents ; absent pour un e-mail transactionnel (lien de réinitialisation, invitation).
   */
  unsubscribeUrl?: string;
}

export interface Mailer {
  /** false si SMTP_HOST est vide : rien ne part, et rien n'est marqué comme envoyé. */
  readonly configured: boolean;
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');

/**
 * Messagerie pro Systalink (SMTP), partagée par les modules qui envoient des e-mails.
 * En développement : Mailpit (SMTP_HOST=localhost, port 1025).
 */
@Injectable()
export class SmtpMailer implements Mailer {
  private readonly logger = new Logger(SmtpMailer.name);
  private readonly transport: Transporter | null;
  readonly configured: boolean;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.configured = Boolean(env.SMTP_HOST);
    this.transport = env.SMTP_HOST
      ? createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } : undefined,
          connectionTimeout: 10_000,
        })
      : null;
  }

  async send(m: MailMessage): Promise<void> {
    if (!this.transport) return;
    await this.transport.sendMail({
      from: this.env.MAIL_FROM,
      to: m.to,
      subject: m.subject,
      text: m.text,
      html: m.html,
      headers: m.unsubscribeUrl
        ? {
            'List-Unsubscribe': `<${m.unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : undefined,
    });
    this.logger.debug({ to: m.to }, 'E-mail envoyé');
  }
}
