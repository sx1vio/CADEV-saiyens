import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GithubActivityView } from '@devhub/contracts';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { GithubTokenReader, resolvePrivacy } from '../../identity';
import {
  type RawCommit,
  type RawEvent,
  type RawRepo,
  type RawUser,
  buildActivity,
} from '../domain/github-activity';

/** fetch injectable : les tests remplacent GitHub par des réponses enregistrées. */
export const GITHUB_FETCH = Symbol('GITHUB_FETCH');

const API = 'https://api.github.com';
const TTL_MS = 60 * 60 * 1000; // une heure : le Passport reste à jour sans épuiser le quota
const STALE_MS = 7 * 24 * 60 * 60 * 1000; // GitHub indisponible : on sert l'ancienne version

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`GitHub ${status}`);
  }
}

export type ActivityResult =
  { ok: true; view: GithubActivityView } | { ok: false; reason: 'not_found' | 'unavailable' };

/**
 * Activité GitHub publique d'un membre : profil, dépôts mis en avant, commits récents,
 * événements des 90 derniers jours. Données publiques uniquement ; mise en cache une heure.
 */
@Injectable()
export class GithubActivityReader {
  private readonly logger = new Logger(GithubActivityReader.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: GithubTokenReader,
    @Inject(ENV) private readonly env: Env,
    @Inject(GITHUB_FETCH) private readonly fetchImpl: typeof fetch,
  ) {}

  async forHandle(handle: string, now = new Date()): Promise<ActivityResult> {
    const user = await this.prisma.user.findFirst({
      where: { handle, deletedAt: null, suspendedAt: null },
      select: { id: true, githubId: true, privacy: true },
    });
    if (!user?.githubId || resolvePrivacy(user.privacy).hideStats)
      return { ok: false, reason: 'not_found' };

    const key = `gh-activity:${user.githubId}`;
    const cached = await this.prisma.githubCache.findUnique({ where: { key } });
    if (cached && cached.expiresAt > now)
      return { ok: true, view: cached.body as unknown as GithubActivityView };

    try {
      // Jeton du membre s'il en a un (quota de 5 000 requêtes par heure) ; il ne sert qu'à
      // lire des données publiques. Sans jeton : API publique (60 requêtes par heure).
      const token = this.env.AUTH_FAKE_PROVIDER ? null : await this.tokens.tokenFor(user.id);
      const view = await this.fetchActivity(user.githubId.toString(), token, now);
      const data = {
        body: view as object,
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + TTL_MS),
      };
      await this.prisma.githubCache.upsert({
        where: { key },
        create: { key, ...data },
        update: data,
      });
      return { ok: true, view };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return { ok: false, reason: 'not_found' };
      this.logger.warn({ err }, 'Activité GitHub indisponible');
      if (cached && now.getTime() - cached.fetchedAt.getTime() < STALE_MS)
        return { ok: true, view: cached.body as unknown as GithubActivityView };
      return { ok: false, reason: 'unavailable' };
    }
  }

  private async fetchActivity(githubId: string, token: string | null, now: Date) {
    let auth = token;
    const get = async <T>(path: string): Promise<T> => {
      const res = await this.fetchImpl(API + path, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'devhub-africa',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        },
        signal: AbortSignal.timeout(10_000),
      });
      // Jeton révoqué : on continue sans, ces données sont publiques.
      if (res.status === 401 && auth) {
        auth = null;
        return get<T>(path);
      }
      if (!res.ok) throw new HttpError(res.status);
      return (await res.json()) as T;
    };

    const user = await get<RawUser>(`/user/${encodeURIComponent(githubId)}`);
    const login = encodeURIComponent(user.login);
    const [repos, events] = await Promise.all([
      get<RawRepo[]>(`/users/${login}/repos?type=owner&sort=pushed&per_page=100`),
      get<RawEvent[]>(`/users/${login}/events/public?per_page=100`),
    ]);
    // Commits récents de l'auteur sur ses trois dépôts poussés le plus récemment.
    const recent = repos
      .filter((r) => !r.fork && !r.private && r.pushed_at)
      .sort((a, b) => (b.pushed_at ?? '').localeCompare(a.pushed_at ?? ''))
      .slice(0, 3);
    const commits = await Promise.all(
      recent.map(async (r) => ({
        repo: r.full_name,
        commits: await get<RawCommit[]>(
          `/repos/${r.full_name}/commits?author=${login}&per_page=5`,
        ).catch(() => [] as RawCommit[]),
      })),
    );
    return buildActivity({ user, repos, events, commits, now });
  }
}
