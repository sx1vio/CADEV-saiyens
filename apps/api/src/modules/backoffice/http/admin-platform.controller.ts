import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  type AdminAccountView,
  type AdminActivityItem,
  AdminContentAction,
  AdminContentQuery,
  type AdminContentType,
  type AdminContentView,
  AdminFeedRunRequest,
  type AdminFeedsView,
  AdminInviteRequest,
  type AdminInviteResponse,
  AdminRoleRequest,
  type AdminStats,
  type AdminSystalinkView,
  AdminUserAction,
  AdminUsersQuery,
  type AdminUsersResponse,
  type AdminUserView,
  AnnouncementInput,
  type AnnouncementView,
} from '@devhub/contracts';
import { Prisma } from '../../../generated/prisma/client';
import { createZodDto } from 'nestjs-zod';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AccountDeletion, AesGcmTokenCipher, ScryptPasswordHasher } from '../../identity';
import { newTotpSecret, otpauthUrl } from '../domain/totp';
import { type AdminRequest, AdminSessionGuard, assertSuper } from './admin-session.guard';

class AdminUsersQueryDto extends createZodDto(AdminUsersQuery) {}
class AdminUserActionDto extends createZodDto(AdminUserAction) {}
class AdminContentQueryDto extends createZodDto(AdminContentQuery) {}
class AdminContentActionDto extends createZodDto(AdminContentAction) {}
class AnnouncementInputDto extends createZodDto(AnnouncementInput) {}
class AdminInviteRequestDto extends createZodDto(AdminInviteRequest) {}
class AdminRoleRequestDto extends createZodDto(AdminRoleRequest) {}
class AdminFeedRunRequestDto extends createZodDto(AdminFeedRunRequest) {}

const DAY = 24 * 60 * 60 * 1000;
const notFound = () => new NotFoundException({ code: 'not_found', title: 'Not found' });
const excerpt = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const author = (u: { handle: string; displayName: string } | null) =>
  u ? { handle: u.handle, displayName: u.displayName } : null;
const AUTHOR = { select: { handle: true, displayName: true } } as const;

const FEED_JOBS = {
  news: JOBS.newsIngest,
  github: JOBS.newsIngestGithub,
  jobs: JOBS.newsIngestJobs,
  certs: JOBS.newsIngestCerts,
  skills: JOBS.newsIngestSkills,
} as const;

/**
 * Administration complète de la plateforme : comptes, contenus, activité, statistiques,
 * annonces, flux collectés et administrateurs. Invisible (404) sans session d'administration ;
 * chaque action qui modifie quelque chose est inscrite au journal (admin_actions).
 */
@ApiExcludeController()
@Controller('api/v1/admin')
@UseGuards(AdminSessionGuard)
export class AdminPlatformController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deletion: AccountDeletion,
    private readonly hasher: ScryptPasswordHasher,
    private readonly cipher: AesGcmTokenCipher,
    private readonly queue: JobQueue,
  ) {}

  private audit(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    reason = '',
  ) {
    return this.prisma.adminAction.create({
      data: { adminId, action, targetType, targetId, reason: reason.slice(0, 500) },
    });
  }

  /* ---------------- Utilisateurs ---------------- */

  @Get('users')
  async users(@Query() q: AdminUsersQueryDto): Promise<AdminUsersResponse> {
    const where: Prisma.UserWhereInput = {
      ...(q.filter === 'deleted' ? { deletedAt: { not: null } } : { deletedAt: null }),
      ...(q.filter === 'new' ? { createdAt: { gte: new Date(Date.now() - 7 * DAY) } } : {}),
      ...(q.filter === 'suspended' ? { suspendedAt: { not: null } } : {}),
      ...(q.filter === 'admins' ? { isAdmin: true } : {}),
      ...(q.filter === 'demo' ? { isDemo: true } : {}),
      ...(q.q
        ? {
            OR: [
              { handle: { contains: q.q, mode: 'insensitive' } },
              { displayName: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: q.limit,
        skip: q.offset,
        select: {
          id: true,
          handle: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          country: true,
          githubId: true,
          isAdmin: true,
          adminRole: true,
          isDemo: true,
          suspendedAt: true,
          suspensionReason: true,
          deletedAt: true,
          createdAt: true,
          lastSeenAt: true,
          _count: { select: { questions: true, answers: true, posts: true, ownedRooms: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const ids = rows.map((r) => r.id);
    const [xp, reports] = await Promise.all([
      this.prisma.xpEvent.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _sum: { points: true },
      }),
      this.prisma.report.groupBy({
        by: ['targetId'],
        where: { targetType: 'user', targetId: { in: ids } },
        _count: { _all: true },
      }),
    ]);
    const xpBy = new Map(xp.map((x) => [x.userId, x._sum.points ?? 0]));
    const repBy = new Map(reports.map((r) => [r.targetId, r._count._all]));
    return {
      total,
      data: rows.map((u): AdminUserView => ({
        id: u.id,
        handle: u.handle,
        displayName: u.displayName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        country: u.country,
        githubLinked: u.githubId !== null,
        isAdmin: u.isAdmin,
        adminRole: u.isAdmin ? (u.adminRole === 'moderator' ? 'moderator' : 'super') : null,
        isDemo: u.isDemo,
        suspendedAt: u.suspendedAt?.toISOString() ?? null,
        suspensionReason: u.suspensionReason,
        deleted: u.deletedAt !== null,
        createdAt: u.createdAt.toISOString(),
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
        stats: {
          questions: u._count.questions,
          answers: u._count.answers,
          posts: u._count.posts,
          rooms: u._count.ownedRooms,
          xp: xpBy.get(u.id) ?? 0,
          reportsAgainst: repBy.get(u.id) ?? 0,
        },
      })),
    };
  }

  /** Suspendre, réactiver, supprimer (anonymiser) un compte, ou le marquer comme démo. */
  @Post('users/:id/action')
  @HttpCode(204)
  async userAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminUserActionDto,
    @Req() req: AdminRequest,
  ) {
    const adminId = req.admin!.userId;
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, handle: true, isAdmin: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw notFound();
    // Les administrateurs se gèrent dans l'onglet dédié (rôle retiré d'abord).
    if (user.isAdmin && (body.action === 'suspend' || body.action === 'delete'))
      throw new ConflictException({ code: 'admin.target_is_admin', title: 'Target is an admin' });
    const reason = `@${user.handle}${body.reason ? ` · ${body.reason}` : ''}`;

    switch (body.action) {
      case 'suspend':
        if (body.reason.length < 3)
          throw new BadRequestException({
            code: 'admin.reason_required',
            title: 'Reason required',
          });
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id },
            data: { suspendedAt: new Date(), suspensionReason: body.reason },
          }),
          this.prisma.session.deleteMany({ where: { userId: id } }),
          this.audit(adminId, 'user_suspend', 'user', id, reason),
        ]);
        break;
      case 'unsuspend':
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id },
            data: { suspendedAt: null, suspensionReason: null },
          }),
          this.audit(adminId, 'user_unsuspend', 'user', id, reason),
        ]);
        break;
      case 'delete':
        assertSuper(req);
        await this.deletion.anonymize(id);
        await this.audit(adminId, 'user_delete', 'user', id, reason);
        break;
      case 'mark_demo':
      case 'unmark_demo':
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id },
            data: { isDemo: body.action === 'mark_demo' },
          }),
          this.audit(
            adminId,
            body.action === 'mark_demo' ? 'flag_demo' : 'unflag_demo',
            'user',
            id,
            reason,
          ),
        ]);
        break;
    }
  }

  /* ---------------- Contenus ---------------- */

  @Get('content')
  async content(@Query() q: AdminContentQueryDto): Promise<{ data: AdminContentView[] }> {
    const hidden =
      q.state === 'hidden'
        ? { hiddenAt: { not: null } }
        : q.state === 'visible'
          ? { hiddenAt: null }
          : {};
    const text = (...fields: string[]) =>
      q.q ? { OR: fields.map((f) => ({ [f]: { contains: q.q, mode: 'insensitive' } })) } : {};
    const base = { orderBy: { createdAt: 'desc' as const }, take: q.limit };
    const view = (
      type: AdminContentType,
      r: { id: string; createdAt: Date; hiddenAt: Date | null },
      title: string | null,
      body: string,
      a: { handle: string; displayName: string } | null,
      path: string | null,
    ): AdminContentView => ({
      type,
      id: r.id,
      title,
      excerpt: excerpt(body),
      author: author(a),
      createdAt: r.createdAt.toISOString(),
      hidden: r.hiddenAt !== null,
      path,
    });

    switch (q.type) {
      case 'question': {
        const rows = await this.prisma.question.findMany({
          ...base,
          where: { ...hidden, ...text('title', 'body') },
          include: { author: AUTHOR },
        });
        return {
          data: rows.map((r) => view('question', r, r.title, r.body, r.author, `/sos/${r.id}`)),
        };
      }
      case 'answer': {
        const rows = await this.prisma.answer.findMany({
          ...base,
          where: { ...hidden, ...text('body') },
          include: { author: AUTHOR },
        });
        return {
          data: rows.map((r) => view('answer', r, null, r.body, r.author, `/sos/${r.questionId}`)),
        };
      }
      case 'room': {
        const rows = await this.prisma.room.findMany({
          ...base,
          where: { ...hidden, ...text('name', 'description') },
          include: { owner: AUTHOR },
        });
        return {
          data: rows.map((r) =>
            view('room', r, r.name, r.description, r.owner, `/p/${r.inviteCode}`),
          ),
        };
      }
      case 'room_message': {
        const rows = await this.prisma.roomMessage.findMany({
          ...base,
          where: { ...hidden, kind: 'text', ...text('body') },
          include: { author: AUTHOR, room: { select: { name: true, inviteCode: true } } },
        });
        return {
          data: rows.map((r) =>
            view('room_message', r, r.room.name, r.body, r.author, `/p/${r.room.inviteCode}`),
          ),
        };
      }
      case 'post': {
        const rows = await this.prisma.post.findMany({
          ...base,
          where: { ...hidden, ...text('title', 'body') },
          include: { author: AUTHOR },
        });
        return {
          data: rows.map((r) => view('post', r, r.title, r.body, r.author, `/post/${r.id}`)),
        };
      }
      case 'post_comment': {
        const rows = await this.prisma.postComment.findMany({
          ...base,
          where: { ...hidden, ...text('body') },
          include: { author: AUTHOR, post: { select: { title: true } } },
        });
        return {
          data: rows.map((r) =>
            view('post_comment', r, r.post.title, r.body, r.author, `/post/${r.postId}`),
          ),
        };
      }
      case 'bench_request': {
        const rows = await this.prisma.benchRequest.findMany({
          ...base,
          where: { ...hidden, ...text('title', 'instructions', 'appUrl') },
          include: { author: AUTHOR },
        });
        return {
          data: rows.map((r) =>
            view(
              'bench_request',
              r,
              r.title,
              `${r.appUrl}\n${r.instructions}`,
              r.author,
              `/banc/${r.id}`,
            ),
          ),
        };
      }
    }
  }

  /** Masquer ou rétablir un contenu, sans signalement préalable ; journalisé. */
  @Post('content/:type/:id')
  @HttpCode(204)
  async contentAction(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminContentActionDto,
    @Req() req: AdminRequest,
  ) {
    const data = { hiddenAt: body.action === 'hide' ? new Date() : null };
    const where = { id };
    const update = async () => {
      switch (type as AdminContentType) {
        case 'question':
          return this.prisma.question.updateMany({ where, data });
        case 'answer':
          return this.prisma.answer.updateMany({ where, data });
        case 'room':
          return this.prisma.room.updateMany({ where, data });
        case 'room_message':
          return this.prisma.roomMessage.updateMany({ where, data });
        case 'post':
          return this.prisma.post.updateMany({ where, data });
        case 'post_comment':
          return this.prisma.postComment.updateMany({ where, data });
        case 'bench_request':
          return this.prisma.benchRequest.updateMany({ where, data });
        default:
          return { count: 0 };
      }
    };
    const { count } = await update();
    if (!count) throw notFound();
    await this.audit(
      req.admin!.userId,
      body.action === 'hide' ? 'hide_content' : 'restore_content',
      type,
      id,
      body.reason,
    );
  }

  /* ---------------- Activité et statistiques ---------------- */

  /** Fil de tout ce qui se passe sur la plateforme, du plus récent au plus ancien. */
  @Get('activity')
  async activity(): Promise<{ data: AdminActivityItem[] }> {
    const take = 30;
    const desc = { createdAt: 'desc' as const };
    const [users, questions, answers, posts, comments, rooms, apps, companies, jobs, actions] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { deletedAt: null },
          orderBy: desc,
          take,
          select: { handle: true, displayName: true, createdAt: true, githubId: true },
        }),
        this.prisma.question.findMany({
          orderBy: desc,
          take,
          select: { id: true, title: true, createdAt: true, author: AUTHOR },
        }),
        this.prisma.answer.findMany({
          orderBy: desc,
          take,
          select: {
            questionId: true,
            createdAt: true,
            author: AUTHOR,
            question: { select: { title: true } },
          },
        }),
        this.prisma.post.findMany({
          orderBy: desc,
          take,
          select: { id: true, title: true, community: true, createdAt: true, author: AUTHOR },
        }),
        this.prisma.postComment.findMany({
          orderBy: desc,
          take,
          select: {
            postId: true,
            createdAt: true,
            author: AUTHOR,
            post: { select: { title: true } },
          },
        }),
        this.prisma.room.findMany({
          orderBy: desc,
          take,
          select: { name: true, inviteCode: true, createdAt: true, owner: AUTHOR },
        }),
        this.prisma.jobApplication.findMany({
          orderBy: desc,
          take,
          select: {
            createdAt: true,
            jobId: true,
            user: AUTHOR,
            job: { select: { title: true, company: true } },
          },
        }),
        this.prisma.company.findMany({
          orderBy: desc,
          take,
          select: { name: true, createdAt: true, status: true },
        }),
        this.prisma.jobOffer.findMany({
          orderBy: desc,
          take,
          select: { id: true, title: true, company: true, createdAt: true, companyId: true },
        }),
        this.prisma.adminAction.findMany({
          orderBy: desc,
          take,
          select: { action: true, reason: true, createdAt: true, admin: AUTHOR },
        }),
      ]);
    const at = (d: Date) => d.toISOString();
    const items: AdminActivityItem[] = [
      ...users.map((u) => ({
        at: at(u.createdAt),
        kind: 'user' as const,
        label: `Nouveau compte${u.githubId !== null ? ' (GitHub)' : ''}`,
        actor: `@${u.handle}`,
        path: `/u/${u.handle}`,
      })),
      ...questions.map((q) => ({
        at: at(q.createdAt),
        kind: 'question' as const,
        label: `Question : ${q.title}`,
        actor: `@${q.author.handle}`,
        path: `/sos/${q.id}`,
      })),
      ...answers.map((a) => ({
        at: at(a.createdAt),
        kind: 'answer' as const,
        label: `Réponse à « ${a.question.title} »`,
        actor: `@${a.author.handle}`,
        path: `/sos/${a.questionId}`,
      })),
      ...posts.map((p) => ({
        at: at(p.createdAt),
        kind: 'post' as const,
        label: `Publication dans ${p.community} : ${p.title}`,
        actor: `@${p.author.handle}`,
        path: `/post/${p.id}`,
      })),
      ...comments.map((c) => ({
        at: at(c.createdAt),
        kind: 'comment' as const,
        label: `Commentaire sur « ${c.post.title} »`,
        actor: `@${c.author.handle}`,
        path: `/post/${c.postId}`,
      })),
      ...rooms.map((r) => ({
        at: at(r.createdAt),
        kind: 'room' as const,
        label: `Projet créé : ${r.name}`,
        actor: `@${r.owner.handle}`,
        path: `/p/${r.inviteCode}`,
      })),
      ...apps.map((a) => ({
        at: at(a.createdAt),
        kind: 'application' as const,
        label: `Candidature : ${a.job.title} chez ${a.job.company}`,
        actor: `@${a.user.handle}`,
        path: `/emplois/${a.jobId}`,
      })),
      ...companies.map((c) => ({
        at: at(c.createdAt),
        kind: 'company' as const,
        label: `Entreprise inscrite : ${c.name} (${c.status})`,
        actor: null,
        path: null,
      })),
      ...jobs.map((j) => ({
        at: at(j.createdAt),
        kind: 'job' as const,
        label: `Offre ${j.companyId ? 'publiée par l’entreprise' : 'ajoutée'} : ${j.title} · ${j.company}`,
        actor: null,
        path: `/emplois/${j.id}`,
      })),
      ...actions.map((a) => ({
        at: at(a.createdAt),
        kind: 'admin' as const,
        label: `${a.action}${a.reason ? ` · ${excerpt(a.reason, 120)}` : ''}`,
        actor: `@${a.admin.handle}`,
        path: null,
      })),
    ];
    items.sort((a, b) => b.at.localeCompare(a.at));
    return { data: items.slice(0, 150) };
  }

  /** Activité jour par jour sur 30 jours, et membres actifs. */
  /** Tableau de bord Systalink : clics de déploiement, applications vérifiées, pré-vols. */
  @Get('systalink')
  async systalink(): Promise<AdminSystalinkView> {
    const since = new Date(Date.now() - 29 * DAY);
    since.setUTCHours(0, 0, 0, 0);
    const onSystalink = Prisma.sql`result->'checks' @> '[{"id":"host.systalink","status":"pass"}]'::jsonb`;
    const [
      total,
      last30d,
      byTarget,
      bySource,
      perDay,
      deployments,
      reports,
      reports30d,
      reportsOnSystalink,
      requests,
      benchReports,
      confirmed,
      certificates,
    ] = await Promise.all([
      this.prisma.systalinkReferral.count(),
      this.prisma.systalinkReferral.count({ where: { createdAt: { gte: since } } }),
      this.prisma.systalinkReferral.groupBy({ by: ['target'], _count: { _all: true } }),
      this.prisma.systalinkReferral.groupBy({ by: ['source'], _count: { _all: true } }),
      this.prisma.$queryRaw<{ d: string; n: number }[]>(
        Prisma.sql`SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS d,
                          count(*)::int AS n
                     FROM systalink_referrals WHERE created_at >= ${since} GROUP BY 1`,
      ),
      this.prisma.roomDeployment.findMany({
        where: { verifiedAt: { not: null } },
        include: { room: { select: { name: true, inviteCode: true } } },
        orderBy: { verifiedAt: 'desc' },
        take: 100,
      }),
      this.prisma.preflightReport.count(),
      this.prisma.preflightReport.count({ where: { createdAt: { gte: since } } }),
      this.prisma.$queryRaw<{ n: number }[]>(
        Prisma.sql`SELECT count(*)::int AS n FROM preflight_reports WHERE ${onSystalink}`,
      ),
      this.prisma.benchRequest.count(),
      this.prisma.benchReport.count({ where: { status: { not: 'rejected' } } }),
      this.prisma.benchReport.count({ where: { status: 'confirmed' } }),
      this.prisma.certificate.count(),
    ]);
    const uptimeOf = (d: { checksTotal: number; checksUp: number }) =>
      d.checksTotal ? Math.round((d.checksUp / d.checksTotal) * 1000) / 10 : null;
    const hosted = deployments.filter((d) => d.hostedOnSystalink && d.checksTotal > 0);
    const days = new Map(perDay.map((r) => [r.d, r.n]));
    return {
      referrals: {
        total,
        last30d,
        byTarget: byTarget
          .map((r) => ({ key: r.target, n: r._count._all }))
          .sort((a, b) => b.n - a.n),
        bySource: bySource
          .map((r) => ({ key: r.source, n: r._count._all }))
          .sort((a, b) => b.n - a.n),
        days: Array.from({ length: 30 }, (_, i) => {
          const date = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
          return { date, n: days.get(date) ?? 0 };
        }),
      },
      deployments: {
        verified: deployments.length,
        onSystalink: deployments.filter((d) => d.hostedOnSystalink).length,
        uptime: hosted.length
          ? Math.round(
              (hosted.reduce((s, d) => s + d.checksUp, 0) /
                hosted.reduce((s, d) => s + d.checksTotal, 0)) *
                1000,
            ) / 10
          : null,
        items: deployments.map((d) => ({
          room: d.room.name,
          code: d.room.inviteCode,
          url: d.url,
          hostedOnSystalink: d.hostedOnSystalink,
          verifiedAt: d.verifiedAt?.toISOString() ?? null,
          lastUp: d.lastUp,
          lastLatencyMs: d.lastLatencyMs,
          uptime: uptimeOf(d),
        })),
      },
      preflight: {
        reports,
        last30d: reports30d,
        onSystalink: reportsOnSystalink[0]?.n ?? 0,
      },
      bench: { requests, reports: benchReports, confirmed },
      certificates,
    };
  }

  @Get('stats')
  async stats(): Promise<AdminStats> {
    const since = new Date(Date.now() - 29 * DAY);
    since.setUTCHours(0, 0, 0, 0);
    const perDay = async (table: string, extra = '') => {
      const rows = await this.prisma.$queryRaw<{ d: string; n: number }[]>(
        Prisma.sql`SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS d,
                          count(*)::int AS n
                     FROM ${Prisma.raw(table)}
                    WHERE created_at >= ${since} ${Prisma.raw(extra)}
                 GROUP BY 1`,
      );
      return new Map(rows.map((r) => [r.d, r.n]));
    };
    const [users, questions, answers, posts, applications, rooms, a7, a30] = await Promise.all([
      perDay('users', 'AND is_demo = false'),
      perDay('questions'),
      perDay('answers'),
      perDay('posts'),
      perDay('job_applications'),
      perDay('rooms'),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          isDemo: false,
          lastSeenAt: { gte: new Date(Date.now() - 7 * DAY) },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          isDemo: false,
          lastSeenAt: { gte: new Date(Date.now() - 30 * DAY) },
        },
      }),
    ]);
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
      return {
        date,
        users: users.get(date) ?? 0,
        questions: questions.get(date) ?? 0,
        answers: answers.get(date) ?? 0,
        posts: posts.get(date) ?? 0,
        applications: applications.get(date) ?? 0,
        rooms: rooms.get(date) ?? 0,
      };
    });
    return { days, activeUsers7d: a7, activeUsers30d: a30 };
  }

  /* ---------------- Flux collectés ---------------- */

  @Get('feeds')
  async feeds(): Promise<AdminFeedsView> {
    const [counts, runs] = await Promise.all([
      this.prisma.newsItem.groupBy({
        by: ['kind'],
        _count: { _all: true },
        _max: { fetchedAt: true },
      }),
      this.prisma.newsIngestRun.findMany({ orderBy: { id: 'desc' }, take: 20 }),
    ]);
    return {
      counts: counts.map((c) => ({
        kind: c.kind,
        items: c._count._all,
        last: c._max.fetchedAt?.toISOString() ?? null,
      })),
      runs: runs.map((r) => ({
        id: r.id,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        items: r.items,
        sourcesOk: r.sourcesOk,
        errors: Array.isArray(r.errors)
          ? (r.errors as { source?: unknown; error?: unknown }[]).map((e) => ({
              source: String(e.source ?? ''),
              error: String(e.error ?? ''),
            }))
          : [],
      })),
    };
  }

  /** Relance tout de suite une collecte (le worker l'exécute). */
  @Post('feeds/run')
  @HttpCode(202)
  async runFeed(@Body() body: AdminFeedRunRequestDto, @Req() req: AdminRequest) {
    await this.queue.send(FEED_JOBS[body.job], {});
    await this.audit(req.admin!.userId, 'feed_run', 'feed', req.admin!.userId, body.job);
  }

  /* ---------------- Annonces ---------------- */

  @Get('announcements')
  async announcements(): Promise<{ data: AnnouncementView[] }> {
    const rows = await this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: rows.map(toAnnouncement) };
  }

  @Post('announcements')
  async createAnnouncement(
    @Body() body: AnnouncementInputDto,
    @Req() req: AdminRequest,
  ): Promise<AnnouncementView> {
    const row = await this.prisma.announcement.create({
      data: { ...announcementData(body), createdBy: req.admin!.userId },
    });
    await this.audit(
      req.admin!.userId,
      'announcement_create',
      'announcement',
      row.id,
      body.message,
    );
    return toAnnouncement(row);
  }

  @Put('announcements/:id')
  async updateAnnouncement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AnnouncementInputDto,
    @Req() req: AdminRequest,
  ): Promise<AnnouncementView> {
    const { count } = await this.prisma.announcement.updateMany({
      where: { id },
      data: announcementData(body),
    });
    if (!count) throw notFound();
    await this.audit(req.admin!.userId, 'announcement_update', 'announcement', id, body.message);
    return toAnnouncement(await this.prisma.announcement.findUniqueOrThrow({ where: { id } }));
  }

  @Delete('announcements/:id')
  @HttpCode(204)
  async deleteAnnouncement(@Param('id', ParseUUIDPipe) id: string, @Req() req: AdminRequest) {
    const { count } = await this.prisma.announcement.deleteMany({ where: { id } });
    if (!count) throw notFound();
    await this.audit(req.admin!.userId, 'announcement_delete', 'announcement', id);
  }

  /* ---------------- Administrateurs ---------------- */

  @Get('admins')
  async admins(): Promise<{ data: AdminAccountView[] }> {
    const rows = await this.prisma.user.findMany({
      where: { isAdmin: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        handle: true,
        displayName: true,
        email: true,
        adminRole: true,
        adminTotpSecret: true,
        adminSessions: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });
    return {
      data: rows.map((a) => ({
        id: a.id,
        handle: a.handle,
        displayName: a.displayName,
        email: a.email,
        role: a.adminRole === 'moderator' ? 'moderator' : 'super',
        twoFactor: a.adminTotpSecret !== null,
        lastSignInAt: a.adminSessions[0]?.createdAt.toISOString() ?? null,
      })),
    };
  }

  /**
   * Super-admin : crée un compte d'administration (mot de passe et secret du double facteur
   * montrés une seule fois). Une adresse déjà utilisée par un membre est refusée : un compte
   * d'administration reste un compte de service, séparé des comptes devs.
   */
  @Post('admins')
  async invite(
    @Body() body: AdminInviteRequestDto,
    @Req() req: AdminRequest,
  ): Promise<AdminInviteResponse> {
    assertSuper(req);
    if (await this.prisma.user.findFirst({ where: { email: body.email } }))
      throw new ConflictException({ code: 'auth.email_taken', title: 'Email already used' });
    const password = randomBytes(18).toString('base64url');
    const secret = newTotpSecret();
    const base =
      body.name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24) || 'admin';
    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        emailVerified: true,
        displayName: body.name,
        handle: `${base}-${randomBytes(3).toString('hex')}`,
        privacy: { unlisted: true },
        isAdmin: true,
        adminRole: body.role,
        passwordHash: await this.hasher.hash(password),
        adminTotpSecret: Buffer.from(this.cipher.encrypt(secret)),
      },
    });
    await this.audit(
      req.admin!.userId,
      'admin_invite',
      'user',
      user.id,
      `${body.email} · ${body.role}`,
    );
    return { email: body.email, password, secret, otpauthUrl: otpauthUrl(secret, body.email) };
  }

  /** Super-admin : change le rôle d'un administrateur, ou retire l'accès (role: null). */
  @Patch('admins/:id')
  @HttpCode(204)
  async setRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminRoleRequestDto,
    @Req() req: AdminRequest,
  ) {
    assertSuper(req);
    if (id === req.admin!.userId)
      throw new ConflictException({ code: 'admin.self', title: 'Cannot change your own role' });
    const target = await this.prisma.user.findFirst({
      where: { id, isAdmin: true, deletedAt: null },
    });
    if (!target) throw notFound();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data:
          body.role === null
            ? { isAdmin: false, adminRole: null, adminTotpSecret: null }
            : { adminRole: body.role },
      }),
      ...(body.role === null
        ? [this.prisma.adminSession.deleteMany({ where: { userId: id } })]
        : []),
      this.audit(
        req.admin!.userId,
        body.role === null ? 'admin_revoke' : 'admin_role',
        'user',
        id,
        `${target.email ?? target.handle}${body.role ? ` · ${body.role}` : ''}`,
      ),
    ]);
  }
}

function announcementData(b: AnnouncementInput) {
  return {
    message: b.message,
    level: b.level,
    linkUrl: b.linkUrl,
    linkLabel: b.linkUrl ? b.linkLabel : null,
    startsAt: b.startsAt ? new Date(b.startsAt) : new Date(),
    endsAt: b.endsAt ? new Date(b.endsAt) : null,
    active: b.active,
  };
}

export function toAnnouncement(r: {
  id: string;
  message: string;
  level: string;
  linkUrl: string | null;
  linkLabel: string | null;
  startsAt: Date;
  endsAt: Date | null;
  active: boolean;
  createdAt: Date;
}): AnnouncementView {
  return {
    id: r.id,
    message: r.message,
    level: r.level as AnnouncementView['level'],
    linkUrl: r.linkUrl,
    linkLabel: r.linkLabel,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt?.toISOString() ?? null,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}
