import { Injectable } from '@nestjs/common';
import type {
  ApplyRequest,
  ApplicationStatus,
  ApplicationView,
  BusinessJobInput,
  BusinessJobView,
  BusinessMeView,
  BusinessRegisterRequest,
  BusinessTeamMember,
  CompanyProfileInput,
  CompanyPublicView,
  CompanyView,
  MyApplicationView,
  RecentApplicationView,
} from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { publishToUsers } from '../../../infrastructure/realtime/realtime.publisher';
import type { Company } from '../../../generated/prisma/client';
import { JOB_INCLUDE, publicWhere, toPublic } from '../../backoffice';
import { companySlug } from '../domain/slug';

export class EmailTakenError extends Error {}

export type ApplyResult =
  | { kind: 'not_found' }
  | { kind: 'already' }
  | { kind: 'bad_cv' }
  | { kind: 'external'; url: string | null }
  | {
      kind: 'ok';
      applicationId: string;
      jobTitle: string;
      candidate: { displayName: string; handle: string };
      recruiters: { email: string; name: string }[];
    };

export type StatusChange =
  | { changed: false }
  | {
      changed: true;
      email: string | null;
      displayName: string;
      jobTitle: string;
      company: string;
      label: string | null;
      note: string | null;
    };
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
    return (await this.loadApplications({ jobId, status: { not: 'withdrawn' } })).map(
      ({ jobTitle: _title, ...a }) => a,
    );
  }

  /** Dernières candidatures reçues par l'entreprise, toutes offres confondues. */
  recentApplications(companyId: string, take: number): Promise<RecentApplicationView[]> {
    return this.loadApplications({ job: { companyId }, status: { not: 'withdrawn' } }, take);
  }

  private async loadApplications(
    where: Prisma.JobApplicationWhereInput,
    take?: number,
  ): Promise<RecentApplicationView[]> {
    const rows = await this.prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(take ? { take } : {}),
      include: {
        job: { select: { title: true } },
        cv: { select: { name: true, size: true } },
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
      jobTitle: r.job.title,
      status: r.status as ApplicationStatus,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      contactEmail: r.contactEmail,
      links: r.links,
      cv: r.cv,
      note: r.note,
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

  /**
   * L'entreprise change le statut, avec un mot facultatif ; le dev reçoit une notification.
   * Renvoie de quoi le prévenir par e-mail (null : candidature introuvable pour cette entreprise).
   */
  async setApplicationStatus(
    companyId: string,
    id: string,
    status: ApplicationStatus,
    note?: string,
  ): Promise<StatusChange | null> {
    const app = await this.prisma.jobApplication.findFirst({
      where: { id, job: { companyId }, status: { not: 'withdrawn' } },
      include: {
        job: { select: { id: true, title: true, company: true } },
        user: { select: { email: true, displayName: true, emailNotifications: true } },
      },
    });
    if (!app) return null;
    const text = note?.trim() || null;
    if (app.status === status && !text) return { changed: false };
    await this.prisma.$transaction(async (tx) => {
      await tx.jobApplication.update({
        where: { id },
        data: { status, ...(text ? { note: text } : {}) },
      });
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
              ...(text ? { note: text } : {}),
            },
          },
        });
        await publishToUsers(tx, [app.userId]);
      }
    });
    return {
      changed: true,
      email: app.user.emailNotifications ? app.user.email : null,
      displayName: app.user.displayName,
      jobTitle: app.job.title,
      company: app.job.company,
      label: STATUS_LABEL[status] ?? null,
      note: text,
    };
  }

  /* ---------------- Compte et équipe ---------------- */

  findAccount(id: string) {
    return this.prisma.businessAccount.findFirst({
      where: { id, disabledAt: null },
      select: { id: true, name: true, email: true, passwordHash: true, companyId: true },
    });
  }

  /** Compte actif d'une entreprise non suspendue, pour le lien « mot de passe oublié ». */
  findResettable(email: string) {
    return this.prisma.businessAccount.findFirst({
      where: { email, disabledAt: null, company: { status: { not: 'suspended' } } },
      select: { id: true, name: true, email: true },
    });
  }

  /** Nouveau mot de passe ; ferme toutes les sessions du compte sauf celle à garder. */
  async setPassword(accountId: string, passwordHash: string, keepSession?: string) {
    await this.prisma.$transaction([
      this.prisma.businessAccount.update({ where: { id: accountId }, data: { passwordHash } }),
      this.prisma.businessSession.deleteMany({
        where: { accountId, ...(keepSession ? { id: { not: keepSession } } : {}) },
      }),
    ]);
  }

  async team(companyId: string): Promise<BusinessTeamMember[]> {
    const rows = await this.prisma.businessAccount.findMany({
      where: { companyId, disabledAt: null },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role as 'owner' | 'recruiter',
      lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async addRecruiter(
    companyId: string,
    input: { name: string; email: string },
    passwordHash: string,
  ): Promise<BusinessTeamMember> {
    const taken = await this.prisma.businessAccount.findUnique({ where: { email: input.email } });
    // Un recruteur retiré de la même entreprise peut revenir : on réactive son compte.
    const back =
      taken && taken.companyId === companyId && taken.disabledAt && taken.role !== 'owner';
    if (taken && !back) throw new EmailTakenError();
    const data = { name: input.name, role: 'recruiter', passwordHash, disabledAt: null };
    const a = back
      ? await this.prisma.businessAccount.update({ where: { id: taken.id }, data })
      : await this.prisma.businessAccount.create({
          data: { ...data, companyId, email: input.email },
        });
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      role: 'recruiter',
      lastLoginAt: null,
      createdAt: a.createdAt.toISOString(),
    };
  }

  /** Retire un recruteur : compte désactivé (historique gardé), sessions fermées. */
  async removeRecruiter(companyId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.businessAccount.updateMany({
      where: { id, companyId, role: 'recruiter', disabledAt: null },
      data: { disabledAt: new Date() },
    });
    if (count) await this.prisma.businessSession.deleteMany({ where: { accountId: id } });
    return count > 0;
  }

  /* ---------------- Côté devs ---------------- */

  /**
   * Le dev postule à une offre publique d'une entreprise inscrite, avec son Passport, un message,
   * et s'il le veut son e-mail, des liens et un CV. Renvoie de quoi prévenir les recruteurs.
   */
  async apply(jobId: string, userId: string, input: ApplyRequest, now: Date): Promise<ApplyResult> {
    const job = await this.prisma.jobOffer.findFirst({
      where: { id: jobId, ...publicWhere(now) },
      select: {
        id: true,
        title: true,
        companyId: true,
        applyUrl: true,
        sourceUrl: true,
        companyRef: {
          select: {
            name: true,
            members: { where: { disabledAt: null }, select: { email: true, name: true } },
          },
        },
      },
    });
    if (!job) return { kind: 'not_found' };
    if (!job.companyId) return { kind: 'external', url: job.applyUrl ?? job.sourceUrl };
    if (input.cvId) {
      const cv = await this.prisma.cvFile.findFirst({
        where: { id: input.cvId, ownerId: userId },
        select: { id: true },
      });
      if (!cv) return { kind: 'bad_cv' };
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, displayName: true, handle: true },
    });
    const data = {
      message: input.message,
      contactEmail: input.shareEmail ? user.email : null,
      links: input.links ?? [],
      cvId: input.cvId ?? null,
      note: null,
    };
    const prev = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (prev && prev.status !== 'withdrawn') return { kind: 'already' };
    const row = prev
      ? await this.prisma.jobApplication.update({
          where: { id: prev.id },
          data: { ...data, status: 'submitted' },
          select: { id: true },
        })
      : await this.prisma.jobApplication.create({
          data: { ...data, jobId, userId },
          select: { id: true },
        });
    return {
      kind: 'ok',
      applicationId: row.id,
      jobTitle: job.title,
      candidate: { displayName: user.displayName, handle: user.handle },
      recruiters: job.companyRef?.members ?? [],
    };
  }

  /** CV privé : son auteur seulement. */
  myCv(id: string, ownerId: string) {
    return this.prisma.cvFile.findFirst({
      where: { id, ownerId },
      select: { name: true, bytes: true },
    });
  }

  /** CV joint à une candidature reçue par cette entreprise. */
  async applicationCv(companyId: string, applicationId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, job: { companyId }, status: { not: 'withdrawn' } },
      select: { cv: { select: { name: true, bytes: true } } },
    });
    return app?.cv ?? null;
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
      include: {
        job: { select: { id: true, title: true, company: true, location: true } },
        cv: { select: { id: true, name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status as ApplicationStatus,
      message: r.message,
      note: r.note,
      emailShared: r.contactEmail !== null,
      cv: r.cv,
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
