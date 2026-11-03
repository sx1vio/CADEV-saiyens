import { Injectable } from '@nestjs/common';
import type {
  ApplicationStatus,
  ApplicationView,
  BusinessJobInput,
  BusinessJobView,
  BusinessMeView,
  BusinessRegisterRequest,
  CompanyProfileInput,
  CompanyPublicView,
  CompanyView,
  MyApplicationView,
} from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { publishToUsers } from '../../../infrastructure/realtime/realtime.publisher';
import type { Company } from '../../../generated/prisma/client';
import { JOB_INCLUDE, publicWhere, toPublic } from '../../backoffice';
import { companySlug } from '../domain/slug';

export class EmailTakenError extends Error {}
export class CompanyNotVerifiedError extends Error {}

const companyView = (c: Company): CompanyView => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  website: c.website,
  country: c.country,
  city: c.city,
  sector: c.sector,
  size: c.size as CompanyView['size'],
  about: c.about,
  status: c.status as CompanyView['status'],
  statusReason: c.statusReason,
  verifiedAt: c.verifiedAt?.toISOString() ?? null,
  createdAt: c.createdAt.toISOString(),
});

const STATUS_LABEL: Record<string, string> = {
  seen: 'consultée',
  interview: 'retenue pour un entretien',
  rejected: 'non retenue',
  hired: 'acceptée',
};

@Injectable()
export class BusinessRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------- Comptes ---------------- */

  private async freeSlug(name: string): Promise<string> {
    const base = companySlug(name);
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? base : `${base}-${i + 1}`;
      if (!(await this.prisma.company.findUnique({ where: { slug }, select: { id: true } })))
        return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async register(input: BusinessRegisterRequest, passwordHash: string): Promise<string> {
    if (await this.prisma.businessAccount.findUnique({ where: { email: input.account.email } }))
      throw new EmailTakenError();
    const slug = await this.freeSlug(input.company.name);
    const company = await this.prisma.company.create({
      data: {
        slug,
        ...input.company,
        members: {
          create: {
            email: input.account.email,
            name: input.account.name,
            role: 'owner',
            passwordHash,
          },
        },
      },
      select: { members: { select: { id: true } } },
    });
    return company.members[0]!.id;
  }

  findAccountByEmail(email: string) {
    return this.prisma.businessAccount.findFirst({
      where: { email, disabledAt: null, company: { status: { not: 'suspended' } } },
      select: { id: true, passwordHash: true },
    });
  }

  async me(accountId: string): Promise<BusinessMeView> {
    const a = await this.prisma.businessAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { company: true },
    });
    return {
      account: { id: a.id, name: a.name, email: a.email, role: a.role as 'owner' | 'recruiter' },
      company: companyView(a.company),
    };
  }

  /** Une entreprise refusée qui corrige son profil repasse en attente de validation. */
  async updateCompany(companyId: string, input: CompanyProfileInput): Promise<CompanyView> {
    const prev = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const c = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...input,
        // Le nom d'une entreprise validée ne change pas sans nouvelle validation.
        name: prev.status === 'verified' ? prev.name : input.name,
        ...(prev.status === 'rejected' ? { status: 'pending', statusReason: null } : {}),
      },
    });
    return companyView(c);
  }

  /* ---------------- Offres ---------------- */

  private async jobView(id: string): Promise<BusinessJobView> {
    const j = await this.prisma.jobOffer.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { applications: true } },
        applications: { where: { status: 'submitted' }, select: { id: true } },
      },
    });
    return {
      id: j.id,
      title: j.title,
      location: j.location,
      country: j.country,
      workMode: j.workMode as BusinessJobView['workMode'],
      contract: j.contract as BusinessJobView['contract'],
      seniority: j.seniority as BusinessJobView['seniority'],
      salary: j.salary,
      description: j.description,
      tags: j.tags,
      expiresAt: j.expiresAt?.toISOString() ?? null,
      status: j.status as BusinessJobView['status'],
      publishedAt: j.publishedAt?.toISOString() ?? null,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
      applications: j._count.applications,
      newApplications: j.applications.length,
    };
  }

  async listJobs(companyId: string): Promise<BusinessJobView[]> {
    const rows = await this.prisma.jobOffer.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return Promise.all(rows.map((r) => this.jobView(r.id)));
  }

  private jobData(input: BusinessJobInput, company: Company) {
    return {
      title: input.title,
      company: company.name,
      companyUrl: company.website,
      location: input.location,
      country: input.country,
      workMode: input.workMode,
      contract: input.contract,
      seniority: input.seniority,
      salary: input.salary,
      description: input.description,
      tags: [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))],
      status: input.status,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      applyUrl: null,
      sourceUrl: null,
    };
  }

  async createJob(companyId: string, input: BusinessJobInput, now: Date) {
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    if (input.status === 'published' && company.status !== 'verified')
      throw new CompanyNotVerifiedError();
    const j = await this.prisma.jobOffer.create({
      data: {
        ...this.jobData(input, company),
        companyId,
        publishedAt: input.status === 'published' ? now : null,
      },
      select: { id: true },
    });
    return this.jobView(j.id);
  }

  async updateJob(companyId: string, id: string, input: BusinessJobInput, now: Date) {
    const prev = await this.prisma.jobOffer.findFirst({ where: { id, companyId } });
    if (!prev) return null;
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    if (input.status === 'published' && company.status !== 'verified')
      throw new CompanyNotVerifiedError();
    await this.prisma.jobOffer.update({
      where: { id },
      data: {
        ...this.jobData(input, company),
        publishedAt: input.status === 'published' ? (prev.publishedAt ?? now) : prev.publishedAt,
      },
    });
    return this.jobView(id);
  }

  async deleteJob(companyId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.jobOffer.deleteMany({ where: { id, companyId } });
    return count > 0;
  }

  /* ---------------- Candidatures ---------------- */

  async applications(companyId: string, jobId: string): Promise<ApplicationView[] | null> {
    const job = await this.prisma.jobOffer.findFirst({ where: { id: jobId, companyId } });
    if (!job) return null;
    const rows = await this.prisma.jobApplication.findMany({
      where: { jobId, status: { not: 'withdrawn' } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            bio: true,
            githubId: true,
            skills: {
              orderBy: { score: 'desc' },
              take: 6,
              select: { score: true, tag: { select: { label: true } } },
            },
          },
        },
      },
    });
    const xp = await this.prisma.xpEvent.groupBy({
      by: ['userId'],
      where: { userId: { in: rows.map((r) => r.userId) } },
      _sum: { points: true },
    });
    return rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      status: r.status as ApplicationStatus,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      candidate: {
        handle: r.user.handle,
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl,
        country: r.user.country,
        bio: r.user.bio,
        githubLinked: r.user.githubId !== null,
        proofXp: xp.find((x) => x.userId === r.userId)?._sum.points ?? 0,
        skills: r.user.skills.map((s) => ({ label: s.tag.label, score: s.score })),
      },
    }));
  }

  /** L'entreprise change le statut ; le dev reçoit une notification. */
  async setApplicationStatus(companyId: string, id: string, status: ApplicationStatus) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { id, job: { companyId }, status: { not: 'withdrawn' } },
      include: { job: { select: { id: true, title: true, company: true } } },
    });
    if (!app) return false;
    if (app.status === status) return true;
    await this.prisma.$transaction(async (tx) => {
      await tx.jobApplication.update({ where: { id }, data: { status } });
      if (STATUS_LABEL[status]) {
        await tx.notification.create({
          data: {
            userId: app.userId,
            type: 'application.status',
            payload: {
              jobId: app.job.id,
              title: app.job.title,
              company: app.job.company,
              status,
              label: STATUS_LABEL[status],
            },
          },
        });
        await publishToUsers(tx, [app.userId]);
      }
    });
    return true;
  }

  /* ---------------- Côté devs ---------------- */

  /** Le dev postule à une offre publique d'une entreprise inscrite. */
  async apply(jobId: string, userId: string, message: string, now: Date) {
    const job = await this.prisma.jobOffer.findFirst({
      where: { id: jobId, companyId: { not: null }, ...publicWhere(now) },
      select: { id: true },
    });
    if (!job) return 'not_found' as const;
    const prev = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (prev && prev.status !== 'withdrawn') return 'already' as const;
    if (prev)
      await this.prisma.jobApplication.update({
        where: { id: prev.id },
        data: { message, status: 'submitted' },
      });
    else await this.prisma.jobApplication.create({ data: { jobId, userId, message } });
    return 'ok' as const;
  }

  async withdraw(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.jobApplication.updateMany({
      where: { id, userId, status: { notIn: ['hired', 'withdrawn'] } },
      data: { status: 'withdrawn' },
    });
    return count > 0;
  }

  async myApplications(userId: string): Promise<MyApplicationView[]> {
    const rows = await this.prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { job: { select: { id: true, title: true, company: true, location: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status as ApplicationStatus,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      job: r.job,
    }));
  }

  async publicCompany(slug: string, now: Date): Promise<CompanyPublicView | null> {
    const c = await this.prisma.company.findFirst({ where: { slug, status: 'verified' } });
    if (!c) return null;
    const jobs = await this.prisma.jobOffer.findMany({
      where: { companyId: c.id, ...publicWhere(now) },
      orderBy: { publishedAt: 'desc' },
      include: JOB_INCLUDE,
    });
    return {
      slug: c.slug,
      name: c.name,
      website: c.website,
      country: c.country,
      city: c.city,
      sector: c.sector,
      size: c.size as CompanyPublicView['size'],
      about: c.about,
      verifiedAt: c.verifiedAt!.toISOString(),
      jobs: jobs.map(toPublic),
    };
  }
}
