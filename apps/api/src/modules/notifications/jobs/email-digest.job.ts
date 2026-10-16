import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type EmailLang, renderDigest } from '../domain/email';
import { MAILER, type Mailer } from '../infrastructure/mailer';
import { unsubscribeToken } from '../infrastructure/unsubscribe-token';

/** Une notification non lue au bout de ce délai part par e-mail (07-taches-fond-temps-reel.md). */
const DELAY_MINUTES = 2;
/** Au-delà, elle n'est plus envoyée (ex. messagerie branchée après coup). */
const MAX_AGE_HOURS = 24;

interface Claimed {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  email: string;
  display_name: string;
  ui_lang: EmailLang;
}

/**
 * Y3 : toutes les 2 minutes (worker), un e-mail par personne pour ses notifications restées non
 * lues. Les notifications sont d'abord réservées (email_sent_at posé, SKIP LOCKED : jamais deux
 * envois), l'e-mail part hors transaction, et un échec les libère pour le passage suivant.
 */
@Injectable()
export class EmailDigestJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailDigestJob.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly jobs: JobQueue,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    await this.jobs.work(JOBS.notificationsEmail, () => this.run().then(() => undefined));
    await this.jobs.schedule(JOBS.notificationsEmail);
  }

  /** Nombre d'e-mails envoyés. */
  async run(now = new Date()): Promise<number> {
    if (!this.mailer.configured) return 0;
    const dueBefore = new Date(now.getTime() - DELAY_MINUTES * 60_000);
    const notOlderThan = new Date(now.getTime() - MAX_AGE_HOURS * 3_600_000);
    const claimed = await this.prisma.$queryRaw<Claimed[]>`
      WITH due AS (
        SELECT n.id FROM notifications n JOIN users u ON u.id = n.user_id
        WHERE n.read_at IS NULL AND n.email_sent_at IS NULL
          AND n.created_at <= ${dueBefore} AND n.created_at > ${notOlderThan}
          AND u.email IS NOT NULL AND u.email_notifications
          AND NOT u.is_demo AND u.deleted_at IS NULL
        ORDER BY n.created_at
        LIMIT 500
        FOR UPDATE OF n SKIP LOCKED
      )
      UPDATE notifications n SET email_sent_at = ${now}
      FROM due, users u
      WHERE n.id = due.id AND u.id = n.user_id
      RETURNING n.id, n.user_id, n.type, n.payload, u.email, u.display_name, u.ui_lang::text AS ui_lang`;

    const byUser = new Map<string, Claimed[]>();
    for (const c of claimed) byUser.set(c.user_id, [...(byUser.get(c.user_id) ?? []), c]);

    let sent = 0;
    for (const [userId, list] of byUser) {
      const unsubscribeUrl = new URL(
        `/api/v1/unsubscribe?token=${unsubscribeToken(this.env.SESSION_SECRET, userId)}`,
        this.env.API_URL,
      ).toString();
      const content = renderDigest(list, {
        lang: list[0]!.ui_lang,
        appUrl: this.env.APP_URL,
        unsubscribeUrl,
        displayName: list[0]!.display_name,
      });
      try {
        await this.mailer.send({ to: list[0]!.email, ...content, unsubscribeUrl });
        sent++;
      } catch (err) {
        // Messagerie injoignable : on libère ces notifications pour le prochain passage.
        await this.prisma.notification.updateMany({
          where: { id: { in: list.map((n) => n.id) } },
          data: { emailSentAt: null },
        });
        this.logger.warn({ err, userId }, 'E-mail non envoyé, nouvel essai au prochain passage');
      }
    }
    return sent;
  }
}
