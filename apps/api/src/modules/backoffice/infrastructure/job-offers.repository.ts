import { Injectable } from '@nestjs/common';
import type { AdminJobView, JobOfferInput, PublicJobView } from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JobOffer } from '../../../generated/prisma/client';

const toAdmin = (j: JobOffer): AdminJobView => ({
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

@Injectable()
export class JobOffersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<AdminJobView[]> {
    const rows = await this.prisma.jobOffer.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
    });
    return rows.map(toAdmin);
  }

  /** Offres publiques : publiées et non expirées, les plus récentes d'abord. */
  async listPublished(now: Date): Promise<PublicJobView[]> {
    const rows = await this.prisma.jobOffer.findMany({
      where: {
        status: 'published',
        publishedAt: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) => {
      const { status: _s, createdAt: _c, ...rest } = toAdmin(r);
      return { ...rest, publishedAt: rest.publishedAt! };
    });
  }

  async findPublished(id: string, now: Date): Promise<PublicJobView | null> {
    const r = await this.prisma.jobOffer.findFirst({
      where: {
        id,
        status: 'published',
        publishedAt: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    if (!r) return null;
    const { status: _s, createdAt: _c, ...rest } = toAdmin(r);
    return { ...rest, publishedAt: rest.publishedAt! };
  }

  async create(input: JobOfferInput, adminId: string, now: Date): Promise<AdminJobView> {
    const row = await this.prisma.jobOffer.create({
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
    const row = await this.prisma.jobOffer.update({
      where: { id },
      data: {
        ...toData(input),
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
