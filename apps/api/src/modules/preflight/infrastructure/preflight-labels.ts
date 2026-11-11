import { Injectable } from '@nestjs/common';
import {
  PREFLIGHT_LABEL_TTL_DAYS,
  type PreflightLabel,
  type RecetteSectionKey,
} from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AwardXp } from '../../reputation';
import type { PreflightLabelsPort } from '../application/run-preflight';
import { labelDomain } from '../domain/label-domain';
import { PreflightRepository } from './preflight.repository';

export { labelDomain };

// Label « DevHub Ready » (11/11/2026). Un domaine reçoit le label quand son propriétaire prouvé
// (fichier .well-known ou DNS) obtient un verdict de recette GO au pré-vol. Le label suit toujours
// le dernier pré-vol prouvé : un NO-GO le retire, et il expire 30 jours après le dernier GO.
// Page publique /label/:domaine, badge SVG pour le README, 10 Proof XP la première fois.

const DAY_MS = 24 * 3600 * 1000;

const SECTION_LABELS: Record<RecetteSectionKey, string> = {
  functional: 'Fonctionnel',
  security: 'Sécurité',
  accessibility: 'Accessibilité',
  performance: 'Performance',
  network: 'Réseau et fiabilité',
  privacy: 'Vie privée',
  platform: 'PWA',
};

type Row = {
  domain: string;
  decision: string;
  score: number;
  recetteScore: number;
  checkedAt: Date;
  readySince: Date | null;
  reportId: string;
  user: { handle: string; displayName: string; avatarUrl: string | null };
};

export function labelStatus(
  decision: string,
  checkedAt: Date,
  now: Date,
): { status: PreflightLabel['status']; expiresAt: Date | null } {
  if (decision !== 'go') return { status: 'not_ready', expiresAt: null };
  const expiresAt = new Date(checkedAt.getTime() + PREFLIGHT_LABEL_TTL_DAYS * DAY_MS);
  return { status: expiresAt > now ? 'ready' : 'expired', expiresAt };
}

@Injectable()
export class PreflightLabels implements PreflightLabelsPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: PreflightRepository,
    private readonly award: AwardXp,
  ) {}

  /** Après un pré-vol : met à jour le label du domaine si l'auteur l'a prouvé. */
  async record(reportId: string, now = new Date()): Promise<void> {
    const report = await this.reports.get(reportId);
    if (!report?.url || !report.recette || !report.label?.owned) return;
    const domain = labelDomain(report.url);
    if (!domain) return;
    const row = await this.prisma.preflightReport.findUniqueOrThrow({
      where: { id: reportId },
      select: { userId: true },
    });
    const decision = report.recette.decision;
    const previous = await this.prisma.preflightLabel.findUnique({ where: { domain } });
    const readySince =
      decision === 'go'
        ? previous?.decision === 'go' && previous.readySince && previous.userId === row.userId
          ? previous.readySince
          : now
        : null;
    const data = {
      userId: row.userId,
      reportId,
      score: report.score,
      recetteScore: report.recette.score,
      decision,
      checkedAt: now,
      readySince,
    };
    const label = await this.prisma.preflightLabel.upsert({
      where: { domain },
      create: { domain, ...data },
      update: data,
      select: { id: true },
    });
    if (decision === 'go')
      await this.award.preflightReady({ labelId: label.id, userId: row.userId });
  }

  async get(domain: string, now = new Date()): Promise<PreflightLabel | null> {
    const row = await this.prisma.preflightLabel.findUnique({
      where: { domain: domain.toLowerCase() },
      include: { user: { select: { handle: true, displayName: true, avatarUrl: true } } },
    });
    return row ? this.view(row, now) : null;
  }

  /** Labels d'un dev (Passport) : actifs d'abord. */
  async listByOwner(handle: string, now = new Date()): Promise<PreflightLabel[]> {
    const rows = await this.prisma.preflightLabel.findMany({
      where: { user: { handle, deletedAt: null } },
      include: { user: { select: { handle: true, displayName: true, avatarUrl: true } } },
      orderBy: { checkedAt: 'desc' },
      take: 20,
    });
    const views = await Promise.all(rows.map((r) => this.view(r, now)));
    const rank = { ready: 0, expired: 1, not_ready: 2 } as const;
    return views.sort((a, b) => rank[a.status] - rank[b.status]);
  }

  private async view(row: Row, now: Date): Promise<PreflightLabel> {
    const { status, expiresAt } = labelStatus(row.decision, row.checkedAt, now);
    const report = await this.reports.get(row.reportId);
    return {
      domain: row.domain,
      status,
      decision: row.decision as PreflightLabel['decision'],
      score: row.score,
      recetteScore: row.recetteScore,
      checkedAt: row.checkedAt.toISOString(),
      readySince: row.readySince?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      reportId: row.reportId,
      owner: {
        handle: row.user.handle,
        displayName: row.user.displayName,
        avatarUrl: row.user.avatarUrl,
      },
      sections: (report?.recette?.sections ?? []).map((s) => ({
        key: s.key,
        label: SECTION_LABELS[s.key],
        score: s.score,
      })),
    };
  }
}

/** Badge SVG du label, façon shields.io : à afficher dans un README. */
export function labelBadge(label: PreflightLabel | null): string {
  const [right, color] = !label
    ? ['non vérifié', '#6b7280']
    : label.status === 'ready'
      ? [`Ready ✓ ${label.recetteScore}`, '#16a34a']
      : label.status === 'expired'
        ? ['label expiré', '#6b7280']
        : [`pré-vol ${label.recetteScore}/100`, '#d97706'];
  const left = 'DevHub';
  const w = (t: string) => Math.round(t.length * 6.6 + 14);
  const lw = w(left);
  const rw = w(right);
  const total = lw + rw;
  const esc = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const title = esc(`${left} : ${right}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${title}"><title>${title}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#0b1f4d"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/><rect width="${total}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="${lw / 2}" y="14">${esc(left)}</text><text x="${lw + rw / 2}" y="14">${esc(right)}</text></g></svg>`;
}
