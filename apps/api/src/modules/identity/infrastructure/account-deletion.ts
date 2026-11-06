import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/** Handle de remplacement : « deleted- » et 8 caractères aléatoires (05-modele-donnees.md). */
export const deletedHandle = (bytes: Uint8Array = randomBytes(6)): string =>
  `deleted-${Buffer.from(bytes)
    .toString('base64url')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '0')
    .slice(0, 8)}`;

/**
 * A3 : suppression du compte par anonymisation, en une transaction (05-modele-donnees.md).
 * Les questions, réponses, messages et le journal des Proof XP restent, attribués au compte
 * anonymisé : les fils des autres ne sont pas cassés. Le Passport répond 404 ensuite.
 */
@Injectable()
export class AccountDeletion {
  constructor(private readonly prisma: PrismaService) {}

  async anonymize(userId: string, now = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId }, select: { deletedAt: true } });
      if (!user || user.deletedAt) return; // déjà supprimé : rien à refaire

      await tx.user.update({
        where: { id: userId },
        data: {
          handle: deletedHandle(),
          displayName: 'Compte supprimé',
          githubId: null,
          email: null,
          emailVerified: false,
          passwordHash: null,
          avatarUrl: null,
          bio: null,
          country: null,
          timezone: null,
          languages: [],
          availability: {},
          lookingFor: null,
          canHelpTagIds: [],
          wantLearnTagIds: [],
          privacy: { unlisted: true },
          onboardingIntent: null,
          githubCreatedAt: null,
          communityId: null,
          isAdmin: false,
          deletedAt: now,
        },
      });
      // Données de connexion et données personnelles dérivées : supprimées.
      await tx.oAuthAccount.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.apiToken.deleteMany({ where: { userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.idempotencyKey.deleteMany({ where: { userId } });
      await tx.userSkill.deleteMany({ where: { userId } });
      // Plus de sollicitation de matching ni de demande d'adhésion en attente.
      await tx.joinRequest.updateMany({
        where: { userId, status: 'pending' },
        data: { status: 'cancelled' },
      });
    });
  }
}
