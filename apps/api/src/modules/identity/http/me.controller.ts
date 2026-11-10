import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Prisma } from '../../../generated/prisma/client';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { resolvePrivacy } from '../domain/privacy';
import { trustSignals } from '../domain/trust';
import { AccountDeletion } from '../infrastructure/account-deletion';
import { SESSION_COOKIE, baseCookie } from './cookies';
import {
  type CodeOfConductResponse,
  CodeOfConductResponseDto,
  DeleteMeRequestDto,
  MeResponseDto,
  type MeResponse,
  UpdateMeRequestDto,
} from './me.dto';
import {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from './session.guard';

// Garde posée route par route : GET /me/session répond aussi aux visiteurs sans compte.
@Controller('api/v1/me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly deletion: AccountDeletion,
  ) {}

  /**
   * A3 : suppression du compte par anonymisation (05-modele-donnees.md), déconnexion partout.
   * La personne retape son handle. Pas de clé d'idempotence : un second appel n'a plus de
   * session et reçoit 401.
   */
  @Delete()
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async remove(
    @CurrentUser() auth: AuthenticatedUser,
    @Body() body: DeleteMeRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
      select: { handle: true },
    });
    if (body.confirmHandle.toLowerCase() !== me.handle.toLowerCase()) {
      throw new UnprocessableEntityException({
        code: 'account.confirmation_mismatch',
        title: 'Type your handle to confirm the deletion',
      });
    }
    await this.deletion.anonymize(auth.userId);
    res.clearCookie(SESSION_COOKIE, baseCookie);
  }

  @Get()
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentUser() auth: AuthenticatedUser): Promise<MeResponse> {
    return this.load(auth.userId);
  }

  /**
   * PR1, PR10, PR14 : fuseau, disponibilités, langues, « je cherche », « je peux aider » et
   * « je veux apprendre », confidentialité. Ces champs alimentent le matching (§6.2).
   */
  @Patch()
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: MeResponseDto })
  async update(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Body() body: UpdateMeRequestDto,
  ): Promise<MeResponse> {
    if (body.timezone && !isTimeZone(body.timezone)) {
      throw new UnprocessableEntityException({
        code: 'validation.failed',
        title: 'Unknown time zone',
        errors: [{ path: 'timezone', code: 'invalid_timezone' }],
      });
    }
    await this.idempotency.run(
      { userId: auth.userId, key, endpoint: 'PATCH /me', body },
      async (tx) => {
        const slugs = [...(body.canHelpTagSlugs ?? []), ...(body.wantLearnTagSlugs ?? [])];
        const tags = new Map(
          (
            await tx.tag.findMany({
              where: { slug: { in: slugs } },
              select: { id: true, slug: true },
            })
          ).map((t) => [t.slug, t.id]),
        );
        const unknown = slugs.filter((s) => !tags.has(s));
        if (unknown.length > 0) {
          throw new UnprocessableEntityException({
            code: 'question.tags_unknown',
            title: 'Unknown tags',
            errors: unknown.map((slug) => ({
              path: 'tags',
              code: 'unknown_tag',
              params: { slug },
            })),
          });
        }
        const ids = (list?: string[]) =>
          list ? [...new Set(list.map((s) => tags.get(s)!))] : undefined;
        const current = await tx.user.findUniqueOrThrow({
          where: { id: auth.userId },
          select: { privacy: true },
        });
        await tx.user.update({
          where: { id: auth.userId },
          data: {
            displayName: body.displayName,
            bio: body.bio,
            country: body.country,
            timezone: body.timezone,
            languages: body.languages,
            uiLang: body.uiLang,
            lookingFor: body.lookingFor,
            availability: body.availability as Prisma.InputJsonValue | undefined,
            canHelpTagIds: ids(body.canHelpTagSlugs),
            wantLearnTagIds: ids(body.wantLearnTagSlugs),
            doNotDisturb: body.doNotDisturb,
            emailNotifications: body.emailNotifications,
            privacy: body.privacy
              ? ({ ...(current.privacy as object), ...body.privacy } as Prisma.InputJsonValue)
              : undefined,
          },
        });
        return { status: 200, body: {} };
      },
    );
    return this.load(auth.userId);
  }

  /**
   * Session courante, ou `{ user: null }` sans compte (recette du 10/11/2026, FONC-02). Le front
   * démarre avec cet appel : un visiteur ne déclenche plus de 401, que le navigateur affichait
   * comme une erreur dans la console. GET /me garde son 401 pour les autres clients.
   */
  @Get('session')
  @UseGuards(OptionalSessionGuard)
  async session(
    @OptionalUser() auth: AuthenticatedUser | null,
  ): Promise<{ user: MeResponse | null }> {
    if (!auth) return { user: null };
    return { user: await this.load(auth.userId).catch(() => null) };
  }

  private async load(userId: string): Promise<MeResponse> {
    const auth = { userId };
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    return {
      id: u.id,
      handle: u.handle,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      email: u.email,
      emailVerified: u.emailVerified,
      bio: u.bio,
      country: u.country,
      timezone: u.timezone,
      languages: u.languages,
      uiLang: u.uiLang,
      emailNotifications: u.emailNotifications,
      lookingFor: u.lookingFor,
      githubLinked: u.githubId !== null,
      githubCreatedAt: u.githubCreatedAt?.toISOString() ?? null,
      codeOfConductAcceptedAt: u.cocAcceptedAt?.toISOString() ?? null,
      isAdmin: u.isAdmin,
      isDemo: u.isDemo,
      createdAt: u.createdAt.toISOString(),
      privacy: resolvePrivacy(u.privacy),
      trust: trustSignals(u, new Date()),
    };
  }

  /**
   * M3 : acceptation du code de conduite à la première connexion. Idempotent :
   * la date de la première acceptation est conservée.
   */
  @Post('code-of-conduct')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: CodeOfConductResponseDto })
  async acceptCodeOfConduct(
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<CodeOfConductResponse> {
    await this.prisma.user.updateMany({
      where: { id: auth.userId, cocAcceptedAt: null },
      data: { cocAcceptedAt: new Date() },
    });
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
      select: { cocAcceptedAt: true },
    });
    return { codeOfConductAcceptedAt: u.cocAcceptedAt!.toISOString() };
  }
}

function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
