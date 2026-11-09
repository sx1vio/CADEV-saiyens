// L'envoi d'e-mails est une brique partagée (infrastructure/mail) ; ré-export pour ce module.
export {
  MAILER,
  type MailMessage,
  type Mailer,
  SmtpMailer,
} from '../../../infrastructure/mail/mailer';
