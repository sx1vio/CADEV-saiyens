import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Controller, Get, Header, Inject, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { PassportReader } from '../../passport';
import { RoomReader } from '../../rooms';
import { type ShareMeta, oneLine, renderSharePage } from '../domain/share-page';

/** Page minimale si l'index.html construit n'est pas là (développement sans build du front). */
const FALLBACK_INDEX =
  '<!doctype html><html lang="fr"><head><meta charset="UTF-8" /></head><body></body></html>';
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const CODE = /^[a-z0-9]{4,16}$/;

const ROOM_STATE: Record<string, string> = {
  idea: 'Idée',
  in_progress: 'En construction',
  looking_for_help: 'Cherche des contributeurs',
  shipped: 'En ligne',
};

// R7, PR2 (ADR-0012) : Caddy envoie /u/* et /p/* ici. Humains et robots reçoivent la même page :
// la SPA, avec les balises de partage de la page demandée. Aucune détection d'agent utilisateur.
@ApiExcludeController()
@Controller()
export class ShareController {
  private index: Promise<string> | null = null;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly passports: PassportReader,
    private readonly rooms: RoomReader,
  ) {}

  @Get('u/:handle')
  @Header('Cache-Control', 'public, max-age=300')
  async passport(@Param('handle') handle: string, @Res() res: Response): Promise<void> {
    const p = HANDLE.test(handle) ? await this.passports.byHandle(handle) : null;
    if (!p) return this.send(res, 404, null);
    const skills = p.skills.slice(0, 3).map((s) => s.tag.label);
    const parts = [
      skills.join(', '),
      p.stats ? `${p.stats.totalXp} Proof XP` : '',
      p.stats?.answersAccepted ? `${p.stats.answersAccepted} devs débloqués` : '',
    ].filter(Boolean);
    return this.send(res, 200, {
      title: `${p.user.displayName} (@${p.user.handle}) · Developer Passport`,
      description: oneLine(
        parts.length ? parts.join(' · ') : (p.user.bio ?? 'Developer Passport sur DevHub Africa'),
        200,
      ),
      url: this.url(`/u/${p.user.handle}`),
      image: this.url('/pwa-512.png'),
      type: 'profile',
    });
  }

  @Get('p/:code')
  @Header('Cache-Control', 'public, max-age=300')
  async room(@Param('code') code: string, @Res() res: Response): Promise<void> {
    const r = CODE.test(code) ? await this.rooms.detailByCode(code, null) : null;
    if (!r) return this.send(res, 404, null);
    const facts = [
      ROOM_STATE[r.state] ?? '',
      r.stack
        .map((t) => t.label)
        .slice(0, 4)
        .join(', '),
      r.openTaskCount
        ? `${r.openTaskCount} tâche${r.openTaskCount > 1 ? 's' : ''} ouverte${r.openTaskCount > 1 ? 's' : ''}`
        : '',
    ].filter(Boolean);
    return this.send(res, 200, {
      title: `${r.name} · salle de projet DevHub Africa`,
      description: oneLine(`${facts.join(' · ')}. ${r.description}`, 200),
      url: this.url(`/p/${r.code}`),
      image: this.url('/pwa-512.png'),
      type: 'website',
    });
  }

  private url(path: string): string {
    return new URL(path, this.env.APP_URL).toString();
  }

  /** Inconnu : 404, mais la SPA s'affiche quand même et montre sa page « introuvable ». */
  private async send(res: Response, status: number, meta: ShareMeta | null): Promise<void> {
    const index = await this.loadIndex();
    res
      .status(status)
      .type('html')
      .send(meta ? renderSharePage(index, meta) : index);
  }

  private loadIndex(): Promise<string> {
    // Image Docker : apps/web/dist/index.html copié dans ./web (infra/Dockerfile.api).
    this.index ??= readFile(
      this.env.WEB_INDEX_HTML ?? resolve(process.cwd(), 'web/index.html'),
      'utf8',
    ).catch(() => FALLBACK_INDEX);
    return this.index;
  }
}
