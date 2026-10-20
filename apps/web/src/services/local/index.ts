/**
 * Implémentation « local » du contrat DevHubApi.
 * L'état vit en mémoire et est sauvegardé dans IndexedDB après chaque écriture.
 * L'import GitHub utilise la vraie API publique de GitHub (sans jeton : 60 requêtes/heure).
 */
import { openDB, type IDBPDatabase } from 'idb';
import { COUNTRIES, browserTimezone, browserUtcOffset } from '@/lib/geo';
import { STATIC_XP_RULES, isQualifiedRepo } from '@/lib/rules';
import { storageGet, storageSet, uuid } from '@/lib/utils';
import type { DevHubApi, GitHubImport, QuestionTab } from '../api';
import { DomainError, type ID, type MatchReason, type QuestionListItem, type User } from '../types';
import { Engine, STATE_VERSION, type State } from './engine';
import { buildSeed } from './seed';

const DB_NAME = 'devhub-local';
const SESSION_KEY = 'dh-session';

let dbp: Promise<IDBPDatabase> | null = null;
const db = () => (dbp ??= openDB(DB_NAME, 1, { upgrade: (d) => d.createObjectStore('state') }));

let enginePromise: Promise<Engine> | null = null;

async function load(): Promise<Engine> {
  let state: State | undefined;
  try {
    state = (await (await db()).get('state', 'main')) as State | undefined;
  } catch {
    state = undefined;
  }
  if (!state || state.version !== STATE_VERSION) {
    state = buildSeed();
    await persist(state);
  }
  return new Engine(state);
}

async function persist(state: State) {
  try {
    await (await db()).put('state', state, 'main');
  } catch {
    /* IndexedDB indisponible (navigation privée stricte) : l'état reste en mémoire */
  }
}

const engine = () => (enginePromise ??= load());

/** Exécute une lecture. */
async function read<T>(fn: (e: Engine) => T): Promise<T> {
  const e = await engine();
  return structuredClone(fn(e));
}

/** Exécute une écriture puis sauvegarde l'état. */
async function write<T>(
  fn: (e: Engine, me: User) => T,
  opts: { anonymous?: boolean } = {},
): Promise<T> {
  const e = await engine();
  const me = currentUser(e);
  if (!me && !opts.anonymous) throw new DomainError('auth.required');
  const out = fn(e, me as User);
  await persist(e.s);
  return structuredClone(out);
}

function currentUser(e: Engine): User | null {
  const id = storageGet(SESSION_KEY);
  if (!id) return null;
  const u = e.s.users.find((x) => x.id === id && !x.deletedAt);
  return u ?? null;
}

/* ---------------- GitHub ---------------- */

const LANG_TO_TAG: Record<string, string> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  PHP: 'php',
  Java: 'java',
  Kotlin: 'kotlin',
  Dart: 'dart',
  Swift: 'swift',
  Go: 'go',
  Rust: 'rust',
  CSS: 'css',
  SCSS: 'css',
  Vue: 'vue',
  Shell: 'linux',
  Dockerfile: 'docker',
  Blade: 'laravel',
  'Jupyter Notebook': 'ml',
  HCL: 'aws',
};

function detectCountry(location: string | null) {
  if (!location) return null;
  const l = location.toLowerCase();
  const cities: Record<string, string> = {
    abidjan: 'CI',
    dakar: 'SN',
    cotonou: 'BJ',
    'porto-novo': 'BJ',
    lomé: 'TG',
    lome: 'TG',
    lagos: 'NG',
    abuja: 'NG',
    accra: 'GH',
    kumasi: 'GH',
    nairobi: 'KE',
    kigali: 'RW',
    douala: 'CM',
    yaoundé: 'CM',
    yaounde: 'CM',
    bamako: 'ML',
    ouagadougou: 'BF',
    kinshasa: 'CD',
    casablanca: 'MA',
    rabat: 'MA',
    tunis: 'TN',
    alger: 'DZ',
    algiers: 'DZ',
    cairo: 'EG',
    'le caire': 'EG',
    johannesburg: 'ZA',
    'cape town': 'ZA',
    conakry: 'GN',
    niamey: 'NE',
    libreville: 'GA',
    kampala: 'UG',
    'dar es salaam': 'TZ',
    'addis ababa': 'ET',
    antananarivo: 'MG',
    brazzaville: 'CG',
    paris: 'FR',
  };
  for (const [city, code] of Object.entries(cities))
    if (l.includes(city)) return { code, city: location.split(',')[0].trim() };
  for (const c of COUNTRIES)
    if (l.includes(c.fr.toLowerCase()) || l.includes(c.en.toLowerCase()))
      return { code: c.code, city: '' };
  return null;
}

async function fetchGitHub(handle: string): Promise<GitHubImport> {
  const clean = handle
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .split('/')[0];
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(clean))
    throw new DomainError('github.bad-handle');
  const headers = { Accept: 'application/vnd.github+json' };
  const ures = await fetch(`https://api.github.com/users/${clean}`, { headers }).catch(() => null);
  if (!ures) throw new DomainError('github.network');
  if (ures.status === 404) throw new DomainError('github.not-found');
  if (ures.status === 403 || ures.status === 429) throw new DomainError('github.rate-limit');
  if (!ures.ok) throw new DomainError('github.network');
  const u = await ures.json();
  const rres = await fetch(
    `https://api.github.com/users/${clean}/repos?per_page=100&sort=pushed&type=owner`,
    { headers },
  ).catch(() => null);
  const repos: {
    fork: boolean;
    size: number;
    pushed_at: string | null;
    language: string | null;
    topics?: string[];
  }[] = rres?.ok ? await rres.json() : [];
  const skills: Record<string, number> = {};
  for (const r of repos) {
    if (!isQualifiedRepo(r)) continue;
    const slugs = new Set<string>();
    if (r.language && LANG_TO_TAG[r.language]) slugs.add(LANG_TO_TAG[r.language]);
    for (const t of r.topics ?? [])
      slugs.add(t === 'nodejs' || t === 'node' ? 'nodejs' : t === 'reactjs' ? 'react' : t);
    for (const s of slugs) skills[s] = (skills[s] ?? 0) + 1;
  }
  return {
    handle: u.login,
    displayName: u.name || u.login,
    avatarUrl: u.avatar_url ?? null,
    bio: u.bio ?? '',
    githubId: u.id,
    githubCreatedAt: u.created_at,
    location: u.location ?? null,
    skills,
    publicRepos: u.public_repos ?? 0,
  };
}

/* ---------------- Implémentation ---------------- */

export const localApi: DevHubApi = {
  mode: 'local',

  async getSession() {
    return read((e) => currentUser(e));
  },

  importGitHub: fetchGitHub,

  async signUpWithGitHub(gh) {
    return write(
      (e) => {
        let u = e.s.users.find((x) => x.githubId === gh.githubId && !x.deletedAt);
        if (!u) {
          const loc = detectCountry(gh.location);
          const tz = browserTimezone();
          const now = new Date().toISOString();
          u = {
            id: uuid(),
            githubId: gh.githubId,
            handle: e.userByHandle(gh.handle) ? `${gh.handle}-${uuid().slice(0, 4)}` : gh.handle,
            displayName: gh.displayName,
            avatarUrl: gh.avatarUrl,
            country: loc?.code ?? COUNTRIES.find((c) => c.tz === tz)?.code ?? 'CI',
            city: loc?.city ?? '',
            timezone: tz,
            utcOffset: browserUtcOffset(),
            languages: [navigator.language?.startsWith('en') ? 'en' : 'fr'],
            availability: { status: 'today', slots: [], forMission: false },
            lookingFor: [],
            canHelpWith: [],
            wantsToLearn: [],
            bio: gh.bio,
            lastSeenAt: now,
            createdAt: now,
            githubCreatedAt: gh.githubCreatedAt,
            isAdmin: false,
            isDemo: false,
            isFounder: Date.now() < new Date('2026-10-22T23:59:59Z').getTime(),
            emailVerified: false,
          };
          e.s.users.push(u);
          for (const [slug, n] of Object.entries(gh.skills)) {
            const t = e.tagBySlug(slug);
            if (t) e.setGithubSkill(u.id, t.id, n);
          }
        }
        storageSet(SESSION_KEY, u.id);
        return u;
      },
      { anonymous: true },
    );
  },

  async loginDemo(handle = 'awa-kone') {
    return write(
      (e) => {
        const u = e.userByHandle(handle);
        if (!u || !u.isDemo) throw new DomainError('not-found');
        storageSet(SESSION_KEY, u.id);
        return u;
      },
      { anonymous: true },
    );
  },

  async listDemoAccounts() {
    return read((e) => e.s.users.filter((u) => u.isDemo && !u.deletedAt).map((u) => e.summary(u)));
  },

  async logout() {
    storageSet(SESSION_KEY, null);
  },

  async updateMe(input) {
    return write((e, me) => {
      const u = e.user(me.id);
      Object.assign(
        u,
        Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
      );
      if (input.timezone)
        u.utcOffset = COUNTRIES.find((c) => c.tz === input.timezone)?.utc ?? u.utcOffset;
      return u;
    });
  },

  async deleteMe() {
    await write((e, me) => e.deleteAccount(me.id, Date.now()));
    storageSet(SESSION_KEY, null);
  },

  async setMySkills(slugs) {
    await write((e, me) => {
      for (const slug of slugs) {
        const t = e.tagBySlug(slug);
        if (!t) continue;
        const has = e.s.skills.find((s) => s.userId === me.id && s.tagId === t.id);
        if (!has)
          e.s.skills.push({
            userId: me.id,
            tagId: t.id,
            githubSignal: 0,
            githubRepos: 0,
            xpTag: 0,
            score: 0,
          });
      }
      // L'utilisateur choisit ses étiquettes, mais ne déclare jamais de score : seuls GitHub et les preuves le font.
      const keep = new Set(slugs.map((s) => e.tagBySlug(s)?.id));
      e.s.skills = e.s.skills.filter((s) => s.userId !== me.id || keep.has(s.tagId) || s.score > 0);
    });
  },

  async listTags() {
    return read((e) => [...e.s.tags].sort((a, b) => a.label.localeCompare(b.label)));
  },

  async getHome() {
    return read((e) => {
      const me = currentUser(e);
      if (!me) throw new DomainError('auth.required');
      const myTags = new Set(
        e.s.skills
          .filter((s) => s.userId === me.id)
          .map((s) => s.tagId)
          .concat(me.canHelpWith),
      );
      const live = e.s.questions.filter((q) => !q.removedAt);
      const open = live.filter((q) => q.status === 'open' && q.authorId !== me.id);
      const openInMyStacks = open
        .filter((q) => q.tagIds.some((t) => myTags.has(t)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const unanswered = open
        .filter((q) => !e.s.answers.some((a) => a.questionId === q.id))
        .sort(
          (a, b) =>
            (b.urgency === 'high' ? 1 : 0) - (a.urgency === 'high' ? 1 : 0) ||
            a.createdAt.localeCompare(b.createdAt),
        );
      const memberOf = new Set(e.s.members.filter((m) => m.userId === me.id).map((m) => m.roomId));
      const recommendedRooms = e.s.rooms
        .filter((r) => !memberOf.has(r.id))
        .map((r) => ({
          r,
          score: r.tagIds.filter((t) => myTags.has(t)).length + (r.state === 'idea' ? 0 : 0.5),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((x) => e.roomItem(x.r));
      const myTasks = e.s.tasks
        .filter((t) => t.assigneeId === me.id && t.status !== 'done')
        .map((t) => {
          const r = e.room(t.roomId);
          return { ...t, room: { id: r.id, name: r.name, inviteCode: r.inviteCode } };
        });
      const devsToMeet = e.s.users
        .filter((u) => u.id !== me.id && !u.isAdmin && !u.deletedAt)
        .map((u) => {
          const common = e.s.skills.filter(
            (s) => s.userId === u.id && myTags.has(s.tagId) && s.score >= 30,
          );
          const sameCity = u.city && u.city === me.city;
          const helps = u.canHelpWith.filter((t) => me.wantsToLearn.includes(t));
          const score = common.length + (sameCity ? 2 : 0) + helps.length * 2;
          const reason: MatchReason = helps.length
            ? {
                kind: 'can-help' as const,
                key: 'meet.reason.canTeach',
                params: { tag: e.tag(helps[0])?.label ?? '' },
              }
            : sameCity
              ? { kind: 'timezone' as const, key: 'meet.reason.sameCity', params: { city: u.city } }
              : {
                  kind: 'stack' as const,
                  key: 'meet.reason.stack',
                  params: {
                    tags: common
                      .slice(0, 2)
                      .map((s) => e.tag(s.tagId)?.label)
                      .join(' · '),
                  },
                };
          return { u, score, reason };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => ({ dev: e.devCard(x.u), reason: x.reason }));
      return {
        openInMyStacks: openInMyStacks.slice(0, 6).map((q) => e.questionItem(q)),
        unanswered: unanswered.slice(0, 5).map((q) => e.questionItem(q)),
        myQuestions: live
          .filter((q) => q.authorId === me.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 4)
          .map((q) => e.questionItem(q)),
        recommendedRooms,
        myTasks,
        devsToMeet,
        activity: e.activity(12),
      };
    });
  },

  async getLanding() {
    const impact = await localApi.getImpact();
    return read((e) => ({
      stats: impact,
      live: e.activity(8),
      featured: ['moussa-diop', 'kwame-dev', 'fatou-nd'].map((h) => e.passport(h)),
    }));
  },

  async listQuestions(tab: QuestionTab, opts = {}) {
    return read((e) => {
      const me = currentUser(e);
      const myTags = new Set(
        me
          ? e.s.skills
              .filter((s) => s.userId === me.id)
              .map((s) => s.tagId)
              .concat(me.canHelpWith)
          : [],
      );
      let list = e.s.questions.filter((q) => !q.removedAt);
      if (tab === 'for-me')
        list = list.filter(
          (q) =>
            q.status === 'open' &&
            q.authorId !== me?.id &&
            (myTags.size ? q.tagIds.some((t) => myTags.has(t)) : true),
        );
      if (tab === 'unanswered')
        list = list.filter(
          (q) => q.status === 'open' && !e.s.answers.some((a) => a.questionId === q.id),
        );
      if (tab === 'resolved') list = list.filter((q) => q.status === 'resolved');
      if (tab === 'mine') list = list.filter((q) => q.authorId === me?.id);
      if (opts.tag) {
        const t = e.tagBySlug(opts.tag);
        list = list.filter((q) => t && q.tagIds.includes(t.id));
      }
      if (opts.q) {
        const words = opts.q.toLowerCase().split(/\s+/).filter(Boolean);
        list = list.filter((q) => {
          const hay = `${q.title} ${q.body} ${q.codeSnippet}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        });
      }
      return list
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((q) => e.questionItem(q));
    });
  },

  async getQuestion(id) {
    const e = await engine();
    e.escalate(id, Date.now());
    return read((e) => {
      const q = e.s.questions.find((x) => x.id === id && !x.removedAt);
      if (!q) throw new DomainError('not-found');
      const me = currentUser(e);
      const item = e.questionItem(q);
      return {
        ...item,
        answers: e.s.answers
          .filter((a) => a.questionId === id && !a.removedAt)
          .sort(
            (a, b) =>
              Number(b.isAccepted) - Number(a.isAccepted) ||
              b.helpfulCount - a.helpfulCount ||
              a.createdAt.localeCompare(b.createdAt),
          )
          .map((a) => ({
            ...a,
            author: e.summaryById(a.authorId),
            votedByMe: !!me && e.s.votes.some((v) => v.answerId === a.id && v.voterId === me.id),
          })),
        matches: e.s.matches
          .filter((m) => m.questionId === id && m.rank < 99)
          .map((m) => ({ ...m, helper: e.summaryById(m.helperId) })),
        pairSessions: e.s.pairs.filter((p) => p.questionId === id),
        similar: similar(e, `${q.title} ${q.body}`, q.tagIds)
          .filter((x) => x.id !== id)
          .slice(0, 3),
      };
    });
  },

  async similarQuestions(text, tagIds) {
    return read((e) => similar(e, text, tagIds).slice(0, 3));
  },

  async createQuestion(input, clientId) {
    const q = await write((e, me) => e.createQuestion(me.id, input, clientId, Date.now()));
    // La piste est calculée de façon asynchrone et ne bloque jamais la publication (S2).
    setTimeout(async () => {
      const e = await engine();
      e.computeHint(q.id);
      await persist(e.s);
      window.dispatchEvent(
        new CustomEvent('devhub:server-event', { detail: { type: 'hint', questionId: q.id } }),
      );
    }, 1400);
    return q;
  },

  async answer(questionId, body, clientId) {
    return write((e, me) => e.answer(questionId, me.id, body, clientId, Date.now()));
  },
  async editQuestion(questionId, text, baseVersion) {
    return write((e, me) => e.editQuestion(questionId, me.id, text, baseVersion));
  },
  async editAnswer(answerId, body, baseVersion) {
    return write((e, me) => e.editAnswer(answerId, me.id, body, baseVersion));
  },
  async vote(answerId) {
    await write((e, me) => e.vote(answerId, me.id, Date.now()));
  },
  async accept(answerId) {
    return write((e, me) => {
      const r = e.accept(answerId, me.id, Date.now());
      return { gained: r.gained, capped: r.capped };
    });
  },
  async claim(questionId) {
    await write((e, me) => e.claim(questionId, me.id, Date.now()));
  },
  async proposePair(questionId, startsAt, videoLink) {
    return write((e, me) => e.proposePair(questionId, me.id, startsAt, videoLink));
  },
  async respondPair(pairId, accept) {
    return write((e, me) => e.respondPair(pairId, me.id, accept));
  },
  async translate() {
    throw new DomainError('translate.server-only');
  },

  async listRooms(opts = {}) {
    return read((e) => {
      const me = currentUser(e);
      let list = e.s.rooms.filter(
        (r) => r.visibility === 'public' || (me && e.isMember(r.id, me.id)),
      );
      if (opts.mine && me) list = list.filter((r) => e.isMember(r.id, me.id));
      if (opts.tag) {
        const t = e.tagBySlug(opts.tag);
        list = list.filter((r) => t && r.tagIds.includes(t.id));
      }
      if (opts.q) {
        const q = opts.q.toLowerCase();
        list = list.filter((r) =>
          `${r.name} ${r.tagline} ${r.description}`.toLowerCase().includes(q),
        );
      }
      return list
        .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
        .map((r) => e.roomItem(r));
    });
  },

  async getRoom(code) {
    return read((e) => {
      const r = e.s.rooms.find((x) => x.inviteCode === code);
      if (!r) throw new DomainError('not-found');
      const me = currentUser(e);
      const member = me
        ? e.s.members.find((m) => m.roomId === r.id && m.userId === me.id)
        : undefined;
      const pending =
        me &&
        e.s.requests.some((x) => x.roomId === r.id && x.userId === me.id && x.status === 'pending');
      return {
        ...e.roomItem(r),
        members: e.s.members.filter((m) => m.roomId === r.id).map((m) => e.summaryById(m.userId)),
        tasks: e.s.tasks
          .filter((t) => t.roomId === r.id)
          .map((t) => ({ ...t, assignee: t.assigneeId ? e.summaryById(t.assigneeId) : null })),
        messages: e.s.messages
          .filter((m) => m.roomId === r.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((m) => ({ ...m, author: e.summaryById(m.authorId) })),
        requests:
          me && r.ownerId === me.id
            ? e.s.requests
                .filter((x) => x.roomId === r.id && x.status === 'pending')
                .map((x) => ({ ...x, user: e.summaryById(x.userId) }))
            : [],
        myMembership: member ? member.role : pending ? 'pending' : 'none',
        feedbackRequests: e.s.feedback
          .filter((f) => f.roomId === r.id && f.status !== 'cancelled')
          .map((f) => e.feedbackItem(f))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    });
  },

  async verifyRepo(fullName) {
    // R1 : dépôt vérifié via l'API GitHub (réelle).
    if (!/^[\w.-]+\/[\w.-]+$/.test(fullName)) return { ok: false };
    const res = await fetch(`https://api.github.com/repos/${fullName}`, {
      headers: { Accept: 'application/vnd.github+json' },
    }).catch(() => null);
    if (!res) throw new DomainError('github.network');
    if (res.status === 403 || res.status === 429) throw new DomainError('github.rate-limit');
    if (!res.ok) return { ok: false };
    const j = await res.json();
    return {
      ok: true,
      description: j.description ?? '',
      language: j.language,
      stars: j.stargazers_count,
    };
  },

  async createRoom(input) {
    let verified = false;
    try {
      verified = (await localApi.verifyRepo(input.repoFullName)).ok;
    } catch {
      verified = false;
    }
    return write((e, me) => e.roomItem(e.createRoom(me.id, input, Date.now(), verified)));
  },
  async requestJoin(roomId, message) {
    return write((e, me) => e.requestJoin(roomId, me.id, message, Date.now()));
  },
  async respondJoin(requestId, accept) {
    return write((e, me) => e.respondJoin(requestId, me.id, accept, Date.now()));
  },
  async suggestTasks() {
    // R5 passe par le modèle côté serveur : pas d'équivalent dans le mode local.
    throw new DomainError('feature.unavailable');
  },
  async createTask(roomId, input) {
    return write((e, me) => e.createTask(roomId, me.id, input, Date.now()));
  },
  async takeTask(taskId) {
    return write((e, me) => e.takeTask(taskId, me.id, Date.now()));
  },
  async moveTask(taskId, status) {
    return write((e, me) => e.moveTask(taskId, me.id, status, Date.now()));
  },
  async completeTask(taskId, prUrl) {
    // R9 : on interroge GitHub pour savoir si la PR est fusionnée.
    let verified: boolean | null = null;
    const m = prUrl.match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)/);
    if (m) {
      const res = await fetch(`https://api.github.com/repos/${m[1]}/pulls/${m[2]}`).catch(
        () => null,
      );
      if (res?.ok) {
        const pr = await res.json();
        const e = await engine();
        const t = e.task(taskId);
        const assignee = t.assigneeId ? e.user(t.assigneeId) : null;
        verified =
          !!pr.merged &&
          (!assignee || pr.user?.login?.toLowerCase() === assignee.handle.toLowerCase());
      }
    }
    return write((e, me) => {
      const r = e.completeTask(taskId, me.id, prUrl, verified, Date.now());
      return { ...r, verified };
    });
  },
  async postMessage(roomId, body, kind, clientId) {
    return write((e, me) => e.postMessage(roomId, me.id, body, kind, clientId, Date.now()));
  },
  async requestFeedback(roomId, kind, input = {}) {
    return write((e, me) => e.requestFeedback(roomId, me.id, kind, input, Date.now()));
  },
  async listFeedbackRequests(opts = {}) {
    const e = await engine();
    const slugs = new Set(opts.tags ?? []);
    return e.s.feedback
      .filter((f) => f.status === 'open' && e.room(f.roomId).visibility === 'public')
      .map((f) => e.feedbackItem(f))
      .filter((f) => slugs.size === 0 || f.tags.some((t) => slugs.has(t.slug)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async takeFeedback(id) {
    return write((e, me) => e.takeFeedback(id, me.id, Date.now()));
  },
  async confirmFeedback(id) {
    return write((e, me) => e.confirmFeedback(id, me.id, Date.now()));
  },
  async cancelFeedback(id) {
    return write((e, me) => e.cancelFeedback(id, me.id));
  },

  async discoverDevs(f) {
    return read((e) => {
      const me = currentUser(e);
      const myOffset = me?.utcOffset ?? browserUtcOffset();
      let list = e.s.users.filter((u) => !u.deletedAt && !u.isAdmin && u.id !== me?.id);
      if (f.q) {
        const q = f.q.toLowerCase();
        list = list.filter((u) =>
          `${u.displayName} ${u.handle} ${u.bio} ${u.city}`.toLowerCase().includes(q),
        );
      }
      if (f.tags?.length)
        list = list.filter((u) =>
          f.tags!.every((t) =>
            e.s.skills.some((s) => s.userId === u.id && s.tagId === t && s.score > 0),
          ),
        );
      if (f.country) list = list.filter((u) => u.country === f.country);
      if (f.timezone === 'near') list = list.filter((u) => Math.abs(u.utcOffset - myOffset) <= 1);
      if (f.availability === 'mission') list = list.filter((u) => u.availability.forMission);
      else if (f.availability) list = list.filter((u) => u.availability.status === f.availability);
      if (f.lookingFor) list = list.filter((u) => u.lookingFor.includes(f.lookingFor!));
      return list.map((u) => e.devCard(u)).sort((a, b) => b.totalXp - a.totalXp);
    });
  },

  async leaderboard() {
    return read((e) => e.leaderboard());
  },

  async getPassport(handle) {
    return read((e) => e.passport(handle));
  },

  async listNotifications() {
    return read((e) => {
      const me = currentUser(e);
      if (!me) return [];
      return e.s.notifications
        .filter((n) => n.userId === me.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30);
    });
  },
  async markNotificationsRead() {
    await write((e, me) => {
      const now = new Date().toISOString();
      for (const n of e.s.notifications) if (n.userId === me.id && !n.readAt) n.readAt = now;
    });
  },

  async contactDev(handle, message) {
    await write((e, me) => {
      const to = e.userByHandle(handle);
      if (!to) throw new DomainError('not-found');
      if (to.id === me.id) throw new DomainError('unprocessable');
      e.notify(to.id, 'contact', { byName: me.displayName, by: me.handle, message }, Date.now());
    });
  },

  async report(targetType, targetId, targetLabel, reason) {
    await write((e, me) => e.report(me.id, targetType, targetId, targetLabel, reason, Date.now()));
  },
  async listReports() {
    return read((e) => {
      const me = currentUser(e);
      if (!me?.isAdmin) throw new DomainError('forbidden');
      return e.s.reports
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => ({ ...r, reporter: e.summaryById(r.reporterId) }));
    });
  },
  async handleReport(id, remove) {
    await write((e, me) => e.handleReport(id, me.id, remove, Date.now()));
  },
  // Serveur simulé : le journal est reconstitué à partir des signalements traités (sans pagination).
  async listAudit() {
    return read((e) => {
      const me = currentUser(e);
      if (!me?.isAdmin) throw new DomainError('forbidden');
      const entries = e.s.reports
        .filter((r) => r.status !== 'open' && r.handledBy)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => ({
          id: r.id,
          action: r.status === 'removed' ? ('hide' as const) : ('dismiss' as const),
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          admin: e.summaryById(r.handledBy as string),
          createdAt: r.createdAt,
        }));
      return { entries, next: null };
    });
  },

  async getStatus() {
    // Mesures réelles : latence de l'hébergeur de cette page et de la base locale du navigateur.
    const t0 = performance.now();
    let hostOk = false;
    try {
      const r = await fetch(`${location.origin}/favicon.svg?ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      hostOk = r.ok;
    } catch {
      hostOk = false;
    }
    const hostLatency = Math.round(performance.now() - t0);
    const t1 = performance.now();
    try {
      await (await db()).get('state', '__ping__');
    } catch {
      /* ignore */
    }
    const dbLatency = Math.round(performance.now() - t1);
    const sw =
      'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration().catch(() => undefined)
        : undefined;
    const e = await engine();
    const now = new Date().toISOString();
    return {
      source: 'local',
      region: location.hostname,
      lastBackupAt: e.s.lastBackupAt,
      services: [
        {
          id: 'vps',
          product: 'systalink',
          name: 'VPS',
          status: hostOk ? 'up' : 'down',
          latencyMs: hostOk ? hostLatency : null,
          detail: location.host,
          checkedAt: now,
        },
        {
          id: 'database',
          product: 'systalink',
          name: 'Base de données',
          status: 'pending',
          latencyMs: null,
          detail: 'GET /status',
          checkedAt: now,
        },
        {
          id: 'backup',
          product: 'systalink',
          name: 'Sauvegarde cloud',
          status: 'pending',
          latencyMs: null,
          detail: 'GET /status',
          checkedAt: now,
        },
        {
          id: 'mail',
          product: 'systalink',
          name: 'Messagerie pro',
          status: 'pending',
          latencyMs: null,
          detail: 'GET /status',
          checkedAt: now,
        },
        {
          id: 'client-db',
          product: 'client',
          name: 'IndexedDB',
          status: 'up',
          latencyMs: dbLatency,
          detail: 'devhub-local',
          checkedAt: now,
        },
        {
          id: 'service-worker',
          product: 'client',
          name: 'Service worker',
          status: sw?.active ? 'up' : 'degraded',
          latencyMs: null,
          detail: sw?.active ? 'actif' : 'non installé',
          checkedAt: now,
        },
      ],
    };
  },

  // Idée A : la vérification exige l'API réelle (lecture de l'application déployée).
  async getDeployment() {
    return null;
  },
  async setDeployment() {
    throw new DomainError('feature.unavailable');
  },
  async verifyDeployment() {
    throw new DomainError('feature.unavailable');
  },

  async getStatusHistory() {
    return null;
  },

  async getEcosystem() {
    return {
      referrals: { total: 0, last30Days: 0, bySource: [] },
      roomsOnSystalink: 0,
      showcase: [],
      computedAt: new Date().toISOString(),
    };
  },

  async getXpRules() {
    return STATIC_XP_RULES;
  },
  async getImpact() {
    return read((e) => {
      const live = e.s.users.filter((u) => !u.deletedAt && !u.isAdmin);
      const firstHuman = e.s.questions
        .map((q) => {
          const first = e.s.answers
            .filter((a) => a.questionId === q.id && a.authorId !== q.authorId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
          return first
            ? (new Date(first.createdAt).getTime() - new Date(q.createdAt).getTime()) / 60000
            : null;
        })
        .filter((x): x is number => x !== null)
        .sort((a, b) => a - b);
      const med = firstHuman.length
        ? Math.round(firstHuman[Math.floor(firstHuman.length / 2)])
        : null;
      const weeks: { week: string; resolved: number; asked: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = Date.now() - (i + 1) * 7 * 864e5;
        const end = Date.now() - i * 7 * 864e5;
        const inW = (d: string | null) =>
          !!d && new Date(d).getTime() >= start && new Date(d).getTime() < end;
        weeks.push({
          week: new Date(start).toISOString().slice(0, 10),
          asked: e.s.questions.filter((q) => inW(q.createdAt)).length,
          resolved: e.s.questions.filter((q) => inW(q.resolvedAt)).length,
        });
      }
      const crossLanguage = e.s.answers.filter((a) => {
        if (!a.isAccepted) return false;
        const q = e.s.questions.find((x) => x.id === a.questionId);
        const helper = e.s.users.find((u) => u.id === a.authorId);
        return q && helper && !helper.languages.includes(q.lang);
      }).length;
      return {
        devs: live.length,
        questionsResolved: e.s.questions.filter((q) => q.status === 'resolved').length,
        medianFirstResponseMinutes: med,
        countries: new Set(live.map((u) => u.country)).size,
        verifiedContributions: e.s.tasks.filter((t) => t.status === 'done' && t.prVerified).length,
        crossLanguage,
        weekly: weeks,
        source: 'local' as const,
      };
    });
  },
};

function similar(e: Engine, text: string, tagIds: ID[]): QuestionListItem[] {
  const words = new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9àâçéèêëîïôûùüÿñæœ_.-]+/)
      .filter((w) => w.length > 3),
  );
  return e.s.questions
    .filter((q) => !q.removedAt)
    .map((q) => {
      const qWords = `${q.title} ${q.body}`.toLowerCase();
      let score = q.tagIds.filter((t) => tagIds.includes(t)).length * 2;
      for (const w of words) if (qWords.includes(w)) score++;
      if (q.status === 'resolved') score += 1;
      return { q, score };
    })
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .map((x) => e.questionItem(x.q));
}

/** Remet le serveur local à zéro (bac à sable T2 : remis à zéro à la demande). */
export async function resetLocalServer() {
  const state = buildSeed();
  await persist(state);
  enginePromise = Promise.resolve(new Engine(state));
}
