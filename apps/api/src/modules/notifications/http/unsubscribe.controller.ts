import { Controller, Get, HttpCode, Inject, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AllowCrossOrigin } from '../../identity';
import { verifyUnsubscribeToken } from '../infrastructure/unsubscribe-token';

const page = (title: string, body: string) =>
  `<!doctype html><html lang="fr"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5"><h1 style="font-size:1.3rem">${title}</h1><p>${body}</p></body></html>`;

// Y3 : désabonnement en un clic, sans connexion, depuis le lien ou le bouton du client mail.
@ApiExcludeController()
@Controller('api/v1/unsubscribe')
export class UnsubscribeController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  /** Lien de l'e-mail : désabonne et le confirme. */
  @Get()
  async viaLink(@Query('token') token: string | undefined, @Res() res: Response): Promise<void> {
    const ok = await this.unsubscribe(token);
    const settings = new URL('/reglages', this.env.APP_URL).toString();
    res
      .status(ok ? 200 : 400)
      .type('html')
      .send(
        ok
          ? page(
              'Tu ne recevras plus ces e-mails',
              `Les notifications restent visibles dans l'application. Tu peux les réactiver dans tes <a href="${settings}">réglages</a>.`,
            )
          : page('Lien invalide', 'Ce lien de désabonnement est incomplet ou a été modifié.'),
      );
  }

  /** RFC 8058 : bouton « Se désabonner » du client mail (POST sans cookie ni en-tête maison). */
  @Post()
  @HttpCode(200)
  @AllowCrossOrigin()
  async oneClick(@Query('token') token: string | undefined): Promise<{ unsubscribed: boolean }> {
    return { unsubscribed: await this.unsubscribe(token) };
  }

  private async unsubscribe(token: string | undefined): Promise<boolean> {
    const userId = token ? verifyUnsubscribeToken(this.env.SESSION_SECRET, token) : null;
    if (!userId) return false;
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { emailNotifications: false },
    });
    return true;
  }
}
