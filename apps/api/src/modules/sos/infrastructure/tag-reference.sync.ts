import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { TAG_REFERENCE } from '@devhub/core';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/**
 * BUG-026 : en production, seules les migrations tournent (pas le seed de développement) ; la
 * table `tags` restait vide et bloquait l'onboarding, les questions et l'import GitHub.
 * L'API aligne donc le référentiel (@devhub/core) à chaque démarrage, en une requête
 * idempotente : étiquettes ajoutées, libellés et alias mis à jour, rien n'est supprimé.
 */
@Injectable()
export class TagReferenceSync implements OnApplicationBootstrap {
  private readonly logger = new Logger(TagReferenceSync.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'http') return;
    const changed = await this.sync();
    if (changed > 0) this.logger.log({ changed }, 'Référentiel des étiquettes aligné');
  }

  /** Nombre d'étiquettes créées ou modifiées. */
  sync(): Promise<number> {
    return this.prisma.$executeRaw`
      INSERT INTO tags (slug, label, aliases)
      SELECT t->>'slug', t->>'label', ARRAY(SELECT jsonb_array_elements_text(t->'aliases'))
      FROM jsonb_array_elements(${JSON.stringify(TAG_REFERENCE)}::jsonb) AS t
      ON CONFLICT (slug) DO UPDATE
        SET label = EXCLUDED.label, aliases = EXCLUDED.aliases
        WHERE tags.label IS DISTINCT FROM EXCLUDED.label
           OR tags.aliases IS DISTINCT FROM EXCLUDED.aliases`;
  }
}
