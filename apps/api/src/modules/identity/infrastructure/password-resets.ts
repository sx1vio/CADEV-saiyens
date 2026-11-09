import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export type ResetKind = 'user' | 'business';

/** Un lien de réinitialisation vaut une heure. */
export const RESET_TTL_MS = 60 * 60 * 1000;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Jetons de réinitialisation du mot de passe : 256 bits aléatoires, stockés hachés,
 * à usage unique. Un nouveau lien annule les précédents du même compte.
 */
@Injectable()
export class PasswordResets {
  constructor(private readonly prisma: PrismaService) {}

  async issue(kind: ResetKind, subjectId: string, now = new Date()): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.passwordReset.updateMany({
        where: { kind, subjectId, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordReset.create({
        data: {
          kind,
          subjectId,
          tokenHash: hash(token),
          expiresAt: new Date(now.getTime() + RESET_TTL_MS),
        },
      }),
    ]);
    return token;
  }

  /** Renvoie le compte du lien et le consomme ; null si le lien est inconnu, utilisé ou expiré. */
  async consume(kind: ResetKind, token: string, now = new Date()): Promise<string | null> {
    const row = await this.prisma.passwordReset.findUnique({ where: { tokenHash: hash(token) } });
    if (!row || row.kind !== kind || row.usedAt || row.expiresAt <= now) return null;
    // Consommation atomique : deux envois simultanés du même lien n'en valident qu'un.
    const { count } = await this.prisma.passwordReset.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    return count === 1 ? row.subjectId : null;
  }
}

/** E-mail du lien de réinitialisation, en texte et en HTML minimal (vouvoiement pour les recruteurs). */
export function resetEmail(opts: { name: string; url: string; product: string; formal?: boolean }) {
  const f = opts.formal;
  const lines = {
    asked: f
      ? `Vous avez demandé à changer le mot de passe de votre compte ${opts.product}.`
      : `Tu as demandé à changer le mot de passe de ton compte ${opts.product}.`,
    open: f
      ? 'Ouvrez ce lien dans l’heure pour en choisir un nouveau :'
      : 'Ouvre ce lien dans l’heure pour en choisir un nouveau :',
    notYou: f
      ? 'Si ce n’est pas vous, ignorez cet e-mail : votre mot de passe actuel reste valable.'
      : 'Si ce n’est pas toi, ignore cet e-mail : ton mot de passe actuel reste valable.',
  };
  const text = [
    `Bonjour ${opts.name},`,
    '',
    lines.asked,
    lines.open,
    opts.url,
    '',
    lines.notYou,
  ].join('\n');
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const html = `<p>Bonjour ${esc(opts.name)},</p>
<p>${esc(lines.asked)}</p>
<p><a href="${esc(opts.url)}">Choisir un nouveau mot de passe</a> (lien valable une heure).</p>
<p>${esc(lines.notYou)}</p>`;
  return { subject: `${opts.product} : nouveau mot de passe`, text, html };
}
