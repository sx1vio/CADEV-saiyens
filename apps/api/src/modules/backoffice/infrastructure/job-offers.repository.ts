import { Injectable } from '@nestjs/common';
import type { AdminJobView, JobOfferInput, PublicJobView } from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JobOffer } from '../../../generated/prisma/client';

type Row = JobOffer & {
  companyRef: { id: string; slug: string; name: string } | null;
  _count: { applications: number };
};

/** Relations lues avec chaque offre. */
export const JOB_INCLUDE = {
  companyRef: { select: { id: true, slug: true, name: true } },
  _count: { select: { applications: true } },
} as const;

/** Visible publiquement : publiée, non expirée, et entreprise validée s'il y en a une. */
export const publicWhere = (now: Date) => ({
  status: 'published',
  publishedAt: { not: null },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  AND: [{ OR: [{ companyId: null }, { companyRef: { status: 'verified' } }] }],
});

export const toAdmin = (j: Row): AdminJobView => ({
  id: j.id,
  title: j.title,
  company: j.company,
  companyUrl: j.companyUrl,
  location: j.location,
  country: j.country,
  workMode: j.workMode as AdminJobView['workMode'],
  contract: j.contract as AdminJobView['contract'],
  seniority: j.seniority as AdminJobView['seniority'],
  salary: j.salary,
  description: j.description,
  applyUrl: j.applyUrl,
  sourceUrl: j.sourceUrl,
  tags: j.tags,
  status: j.status as AdminJobView['status'],
  companyRef: j.companyRef,
  applications: j._count.applications,
  expiresAt: j.expiresAt?.toISOString() ?? null,
  publishedAt: j.publishedAt?.toISOString() ?? null,
  createdAt: j.createdAt.toISOString(),
  updatedAt: j.updatedAt.toISOString(),
});

const toData = (input: JobOfferInput) => ({
  title: input.title,
  company: input.company,
  companyUrl: input.companyUrl,
  location: input.location,
  country: input.country,
  workMode: input.workMode,
  contract: input.contract,
  seniority: input.seniority,
  salary: input.salary,
  description: input.description,
  applyUrl: input.applyUrl,
  sourceUrl: input.sourceUrl,
  tags: [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))],
  status: input.status,
  expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
});

export const toPublic = (r: Row): PublicJobView => {
  const { status: _s, createdAt: _c, applications: _a, ...rest } = toAdmin(r);
  return { ...rest, publishedAt: rest.publishedAt! };
};

@Injectable()
export class JobOffersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<AdminJobView[]> {
    const rows = await this.prisma.jobOffer.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
      include: JOB_INCLUDE,
    });
    return rows.map(toAdmin);
  }

  /** Offres publiques : publiées et non expirées, les plus récentes d'abord. */
  async listPublished(now: Date): Promise<PublicJobView[]> {
    const rows = await this.prisma.jobOffer.findMany({
      where: publicWhere(now),
      orderBy: [{ publishedAt: 'desc' }],
      take: 200,
      include: JOB_INCLUDE,
    });
    return rows.map(toPublic);
  }

  async findPublished(id: string, now: Date): Promise<PublicJobView | null> {
    const r = await this.prisma.jobOffer.findFirst({
      where: { id, ...publicWhere(now) },
      include: JOB_INCLUDE,
    });
    return r ? toPublic(r) : null;
  }

  async create(input: JobOfferInput, adminId: string, now: Date): Promise<AdminJobView> {
    const row = await this.prisma.jobOffer.create({
      include: JOB_INCLUDE,
      data: {
        ...toData(input),
        publishedAt: input.status === 'published' ? now : null,
        createdById: adminId,
      },
    });
    await this.audit(adminId, 'job_create', row.id, `${input.title} · ${input.company}`);
    return toAdmin(row);
  }

  async update(id: string, input: JobOfferInput, adminId: string, now: Date) {
    const prev = await this.prisma.jobOffer.findUnique({ where: { id } });
    if (!prev) return null;
    // Offre d'une entreprise inscrite : l'administration ne réécrit pas son contenu, elle peut
    // seulement la retirer (statut) ou en changer l'échéance.
    const data = prev.companyId
      ? { status: input.status, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
      : toData(input);
    const row = await this.prisma.jobOffer.update({
      where: { id },
      include: JOB_INCLUDE,
      data: {
        ...data,
        // La date de publication est posée au premier passage en « publiée », puis conservée.
        publishedAt: input.status === 'published' ? (prev.publishedAt ?? now) : prev.publishedAt,
      },
    });
    await this.audit(adminId, 'job_update', id, `${input.title} · ${input.status}`);
    return toAdmin(row);
  }

  async delete(id: string, adminId: string): Promise<boolean> {
    const prev = await this.prisma.jobOffer.findUnique({ where: { id } });
    if (!prev) return false;
    await this.prisma.jobOffer.delete({ where: { id } });
    await this.audit(adminId, 'job_delete', id, `${prev.title} · ${prev.company}`);
    return true;
  }

  private async audit(adminId: string, action: string, targetId: string, reason: string) {
    await this.prisma.adminAction.create({
      data: { adminId, action, targetType: 'job_offer', targetId, reason: reason.slice(0, 500) },
    });
  }
}
