/**
 * Moteur du serveur local.
 * Applique les règles du cahier des charges (Proof XP, garde-fous, matching, statuts)
 * sur un état en mémoire, persisté dans IndexedDB. Le back-end réel doit se comporter pareil :
 * ce fichier sert aussi de spécification exécutable pour le rôle 2.
 */
import { GUARDS, XP, githubSignal, platformSignal, scoreCandidates, skillLevel, skillScore, type MatchCandidate } from '@/lib/rules'
import { localHint, maskSecrets } from '@/lib/detect'
import { median, minutesBetween, uuid } from '@/lib/utils'
import {
  DomainError,
  type ActivityItem,
  type Answer,
  type AppNotification,
  type DevCard,
  type FeedbackRequest,
  type ID,
  type JoinRequest,
  type LeaderboardRow,
  type MatchEvent,
  type NewQuestionInput,
  type NewRoomInput,
  type NewTaskInput,
  type PairSession,
  type Passport,
  type Question,
  type QuestionListItem,
  type Report,
  type Room,
  type RoomListItem,
  type RoomMember,
  type RoomMessage,
  type SkillView,
  type Tag,
  type Task,
  type TaskStatus,
  type User,
  type UserSkill,
  type UserSummary,
  type XPEvent,
  type XPKind,
} from '../types'

export interface Vote {
  answerId: ID
  voterId: ID
  createdAt: string
}

export interface State {
  version: number
  users: User[]
  skills: UserSkill[]
  tags: Tag[]
  questions: Question[]
  answers: Answer[]
  votes: Vote[]
  matches: MatchEvent[]
  pairs: PairSession[]
  rooms: Room[]
  members: RoomMember[]
  requests: JoinRequest[]
  tasks: Task[]
  messages: RoomMessage[]
  feedback: FeedbackRequest[]
  xp: XPEvent[]
  notifications: AppNotification[]
  reports: Report[]
  /** Clés d'idempotence : rejouer une action renvoie le résultat déjà enregistré (CDC §6.5) */
  idempotency: Record<string, unknown>
  lastBackupAt: string
}

export const STATE_VERSION = 6

export function emptyState(): State {
  return {
    version: STATE_VERSION,
    users: [],
    skills: [],
    tags: [],
    questions: [],
    answers: [],
    votes: [],
    matches: [],
    pairs: [],
    rooms: [],
    members: [],
    requests: [],
    tasks: [],
    messages: [],
    feedback: [],
    xp: [],
    notifications: [],
    reports: [],
    idempotency: {},
    lastBackupAt: new Date().toISOString(),
  }
}

const iso = (t: number) => new Date(t).toISOString()

export class Engine {
  s: State
  constructor(state: State) {
    this.s = state
  }

  /* ---------------- Lecture utilitaire ---------------- */

  user(id: ID) {
    const u = this.s.users.find((x) => x.id === id)
    if (!u) throw new DomainError('not-found')
    return u
  }

  userByHandle(handle: string) {
    return this.s.users.find((u) => u.handle.toLowerCase() === handle.toLowerCase() && !u.deletedAt)
  }

  tag(id: ID) {
    return this.s.tags.find((t) => t.id === id)
  }

  tagBySlug(slug: string) {
    return this.s.tags.find((t) => t.slug === slug)
  }

  tagsOf(ids: ID[]) {
    return ids.map((id) => this.tag(id)).filter(Boolean) as Tag[]
  }

  totalXp(userId: ID) {
    return this.s.xp.filter((e) => e.userId === userId && !e.revertedAt).reduce((s, e) => s + e.points, 0)
  }

  summary(u: User): UserSummary {
    return {
      id: u.id,
      handle: u.handle,
      displayName: u.deletedAt ? 'Compte supprimé' : u.displayName,
      avatarUrl: u.deletedAt ? null : u.avatarUrl,
      country: u.country,
      city: u.city,
      isDemo: u.isDemo,
      isFounder: u.isFounder,
      totalXp: this.totalXp(u.id),
    }
  }

  summaryById(id: ID) {
    return this.summary(this.user(id))
  }

  /* ---------------- Proof XP (CDC §6.3) ---------------- */

  private xpToday(userId: ID, now: number) {
    const day = iso(now).slice(0, 10)
    return this.s.xp
      .filter((e) => e.userId === userId && !e.revertedAt && e.kind !== 'fast-bonus' && e.createdAt.slice(0, 10) === day)
      .reduce((s, e) => s + e.points, 0)
  }

  /** Attribue des XP en respectant le plafond quotidien (hors bonus de vitesse). Renvoie les points réellement attribués. */
  award(userId: ID, kind: Exclude<XPKind, 'revert'>, tagIds: ID[], source: Pick<XPEvent, 'sourceType' | 'sourceId' | 'sourceLabel'>, now: number) {
    let points = XP[kind]
    if (kind !== 'fast-bonus') {
      const room = GUARDS.dailyCap - this.xpToday(userId, now)
      points = Math.max(0, Math.min(points, room))
    }
    if (points <= 0) return 0
    // Les points sont attribués aux étiquettes de la source, répartis sur la première étiquette principale
    // et dupliqués pour le score par étiquette (P), comme le prévoit le CDC (« attribués aux étiquettes »).
    const primaryTag = tagIds[0] ?? null
    this.s.xp.push({
      id: uuid(),
      userId,
      kind,
      points,
      tagId: primaryTag,
      tagIds,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourceLabel: source.sourceLabel,
      revertedAt: null,
      createdAt: iso(now),
    })
    for (const tagId of tagIds) this.bumpSkill(userId, tagId, points)
    return points
  }

  private bumpSkill(userId: ID, tagId: ID, points: number) {
    let sk = this.s.skills.find((x) => x.userId === userId && x.tagId === tagId)
    if (!sk) {
      sk = { userId, tagId, githubSignal: 0, githubRepos: 0, xpTag: 0, score: 0 }
      this.s.skills.push(sk)
    }
    sk.xpTag += points
    sk.score = skillScore(sk.githubSignal, platformSignal(sk.xpTag))
  }

  setGithubSkill(userId: ID, tagId: ID, repos: number) {
    let sk = this.s.skills.find((x) => x.userId === userId && x.tagId === tagId)
    if (!sk) {
      sk = { userId, tagId, githubSignal: 0, githubRepos: 0, xpTag: 0, score: 0 }
      this.s.skills.push(sk)
    }
    sk.githubRepos = repos
    sk.githubSignal = githubSignal(repos)
    sk.score = skillScore(sk.githubSignal, platformSignal(sk.xpTag))
  }

  skillViews(userId: ID): SkillView[] {
    return this.s.skills
      .filter((s) => s.userId === userId && s.score > 0)
      .map((s) => ({ ...s, tag: this.tag(s.tagId)!, level: skillLevel(s.score) }))
      .filter((s) => s.tag)
      .sort((a, b) => b.score - a.score)
  }

  notify(userId: ID, type: AppNotification['type'], payload: AppNotification['payload'], now: number) {
    this.s.notifications.push({ id: uuid(), userId, type, payload, readAt: null, createdAt: iso(now) })
  }

  /* ---------------- SOS Dev ---------------- */

  createQuestion(authorId: ID, input: NewQuestionInput, clientId: ID, now: number): Question {
    const done = this.s.questions.find((q) => q.clientId === clientId)
    if (done) return done
    const author = this.user(authorId)
    if (input.title.trim().length < 8) throw new DomainError('question.title-too-short')
    if (!input.tagIds.length) throw new DomainError('question.tags-required')
    const masked = maskSecrets(input.codeSnippet)
    const q: Question = {
      id: uuid(),
      authorId,
      title: input.title.trim(),
      body: maskSecrets(input.body).text,
      tried: input.tried,
      expected: input.expected,
      environment: input.environment,
      codeSnippet: masked.text,
      codeLang: input.codeLang || 'text',
      reproUrl: input.reproUrl,
      urgency: input.urgency,
      lang: author.languages[0] ?? 'fr',
      tagIds: input.tagIds.slice(0, 5),
      status: 'open',
      aiHint: null,
      aiStatus: 'pending',
      aiHintSource: null,
      acceptedAnswerId: null,
      roomId: input.roomId ?? null,
      clientId,
      createdAt: iso(now),
      resolvedAt: null,
    }
    this.s.questions.push(q)
    this.runMatching(q, now)
    return q
  }

  /** Piste : générée côté serveur. En local, on applique les règles d'erreurs connues (et on le dit). */
  computeHint(questionId: ID) {
    const q = this.s.questions.find((x) => x.id === questionId)
    if (!q || q.aiStatus === 'ready') return q
    const hint = localHint(`${q.title}\n${q.body}\n${q.codeSnippet}`)
    q.aiHint = hint
    q.aiHintSource = hint ? 'rules' : null
    q.aiStatus = hint ? 'ready' : 'failed'
    return q
  }

  runMatching(q: Question, now: number, exclude: ID[] = []) {
    const author = this.user(q.authorId)
    const tagLabels = Object.fromEntries(this.s.tags.map((t) => [t.id, t.label]))
    const platformAccepted = this.s.answers.filter((a) => a.isAccepted).length
    const qTags = new Set(q.tagIds)
    const dayAgo = now - 864e5
    const candidates: MatchCandidate[] = this.s.users
      .filter((u) => !exclude.includes(u.id))
      .map((u) => {
        const accepted = this.s.answers.filter((a) => a.authorId === u.id && a.isAccepted)
        let n = 0
        let solvedSimilar = 0
        for (const a of accepted) {
          const aq = this.s.questions.find((x) => x.id === a.questionId)
          if (!aq) continue
          const common = aq.tagIds.filter((t) => qTags.has(t)).length
          n += common / Math.max(1, q.tagIds.length)
          if (common) solvedSimilar++
        }
        const recent = this.s.matches.filter((m) => m.helperId === u.id && new Date(m.notifiedAt).getTime() > dayAgo)
        return {
          user: u,
          skills: this.s.skills.filter((s) => s.userId === u.id),
          experienceN: n,
          solvedSimilar,
          totalXp: this.totalXp(u.id),
          solicitations24h: recent.length,
          lastSolicitedAt: Math.max(0, ...recent.map((m) => new Date(m.notifiedAt).getTime())),
        }
      })
    const ranked = scoreCandidates(
      { authorId: q.authorId, tagIds: q.tagIds, tagLabels, lang: q.lang, authorUtcOffset: author.utcOffset, platformAccepted, now },
      candidates,
    ).slice(0, 3)
    const already = this.s.matches.filter((m) => m.questionId === q.id).length
    ranked.forEach((r, i) => {
      this.s.matches.push({
        id: uuid(),
        questionId: q.id,
        helperId: r.candidate.user.id,
        rank: already + i + 1,
        score: r.score,
        reasons: r.reasons,
        notifiedAt: iso(now),
        answeredAt: null,
        claimedAt: null,
      })
      this.notify(r.candidate.user.id, 'match', { questionId: q.id, title: q.title, author: author.displayName }, now)
    })
    return ranked
  }

  /** Escalade à 15 minutes : 3 devs de plus si personne n'a répondu ni pris en charge. */
  escalate(questionId: ID, now: number) {
    const q = this.s.questions.find((x) => x.id === questionId)
    if (!q || q.status !== 'open') return
    if (this.s.answers.some((a) => a.questionId === q.id)) return
    const ms = this.s.matches.filter((m) => m.questionId === q.id)
    const claimed = ms.some((m) => m.claimedAt && now - new Date(m.claimedAt).getTime() < GUARDS.claimExpiryMinutes * 60000)
    if (claimed || ms.length >= 6) return
    const last = Math.max(...ms.map((m) => new Date(m.notifiedAt).getTime()))
    if (now - last < GUARDS.escalationMinutes * 60000) return
    this.runMatching(q, now, ms.map((m) => m.helperId))
  }

  claim(questionId: ID, helperId: ID, now: number) {
    const q = this.s.questions.find((x) => x.id === questionId)
    if (!q) throw new DomainError('not-found')
    if (q.authorId === helperId) throw new DomainError('claim.self')
    let m = this.s.matches.find((x) => x.questionId === questionId && x.helperId === helperId)
    if (!m) {
      m = { id: uuid(), questionId, helperId, rank: 99, score: 0, reasons: [], notifiedAt: iso(now), answeredAt: null, claimedAt: null }
      this.s.matches.push(m)
    }
    m.claimedAt = iso(now)
    this.notify(q.authorId, 'claim', { questionId, helper: this.user(helperId).displayName }, now)
    return m
  }

  answer(questionId: ID, authorId: ID, body: string, clientId: ID, now: number): Answer {
    const done = this.s.answers.find((a) => a.clientId === clientId)
    if (done) return done
    const q = this.s.questions.find((x) => x.id === questionId)
    if (!q) throw new DomainError('not-found')
    if (body.trim().length < 10) throw new DomainError('answer.too-short')
    const a: Answer = {
      id: uuid(),
      questionId,
      authorId,
      body: maskSecrets(body).text,
      isAccepted: false,
      helpfulCount: 0,
      clientId,
      createdAt: iso(now),
    }
    this.s.answers.push(a)
    const m = this.s.matches.find((x) => x.questionId === questionId && x.helperId === authorId)
    if (m && !m.answeredAt) m.answeredAt = iso(now)
    if (authorId !== q.authorId) this.notify(q.authorId, 'answer', { questionId, title: q.title, author: this.user(authorId).displayName }, now)
    return a
  }

  vote(answerId: ID, voterId: ID, now: number) {
    const a = this.s.answers.find((x) => x.id === answerId)
    if (!a) throw new DomainError('not-found')
    if (a.authorId === voterId) throw new DomainError('vote.self')
    const voter = this.user(voterId)
    if (now - new Date(voter.createdAt).getTime() < GUARDS.minAccountAgeHoursToVote * 3600000) throw new DomainError('vote.too-new')
    if (this.s.votes.some((v) => v.answerId === answerId && v.voterId === voterId)) throw new DomainError('vote.already')
    this.s.votes.push({ answerId, voterId, createdAt: iso(now) })
    a.helpfulCount++
    if (a.helpfulCount <= GUARDS.maxHelpfulVotesPerAnswer) {
      const q = this.s.questions.find((x) => x.id === a.questionId)!
      this.award(a.authorId, 'answer-helpful', q.tagIds, { sourceType: 'answer', sourceId: a.id, sourceLabel: q.title }, now)
    }
    return a
  }

  accept(answerId: ID, actorId: ID, now: number) {
    const a = this.s.answers.find((x) => x.id === answerId)
    if (!a) throw new DomainError('not-found')
    const q = this.s.questions.find((x) => x.id === a.questionId)!
    if (q.authorId !== actorId) throw new DomainError('accept.not-author')
    if (q.status === 'resolved') throw new DomainError('accept.already')
    if (a.authorId === actorId) throw new DomainError('accept.self')
    const weekAgo = now - 7 * 864e5
    const pairCount = this.s.answers.filter((x) => {
      if (!x.isAccepted || x.authorId !== a.authorId) return false
      const xq = this.s.questions.find((y) => y.id === x.questionId)
      return xq?.authorId === actorId && xq.resolvedAt && new Date(xq.resolvedAt).getTime() > weekAgo
    }).length
    a.isAccepted = true
    q.status = 'resolved'
    q.acceptedAnswerId = a.id
    q.resolvedAt = iso(now)
    let gained = 0
    if (pairCount < GUARDS.maxAcceptsPerPairPerWeek) {
      const src = { sourceType: 'answer' as const, sourceId: a.id, sourceLabel: q.title }
      gained += this.award(a.authorId, 'answer-accepted', q.tagIds, src, now)
      if (minutesBetween(q.createdAt, a.createdAt) <= GUARDS.fastBonusMinutes) gained += this.award(a.authorId, 'fast-bonus', q.tagIds, src, now)
    }
    this.award(actorId, 'question-resolved', [], { sourceType: 'question', sourceId: q.id, sourceLabel: q.title }, now)
    this.notify(a.authorId, 'accepted', { questionId: q.id, title: q.title, points: gained }, now)
    return { answer: a, question: q, gained, capped: pairCount >= GUARDS.maxAcceptsPerPairPerWeek }
  }

  proposePair(questionId: ID, hostId: ID, startsAt: string, videoLink: string) {
    const q = this.s.questions.find((x) => x.id === questionId)
    if (!q) throw new DomainError('not-found')
    if (!/^https:\/\/(meet\.google\.com|meet\.jit\.si|zoom\.us|teams\.microsoft\.com|whereby\.com)\//.test(videoLink))
      throw new DomainError('pair.bad-link')
    const p: PairSession = { id: uuid(), questionId, hostId, guestId: q.authorId, startsAt, videoLink, status: 'proposed' }
    this.s.pairs.push(p)
    this.notify(q.authorId, 'pair', { questionId, host: this.user(hostId).displayName }, Date.now())
    return p
  }

  respondPair(pairId: ID, actorId: ID, accept: boolean) {
    const p = this.s.pairs.find((x) => x.id === pairId)
    if (!p) throw new DomainError('not-found')
    if (p.guestId !== actorId) throw new DomainError('forbidden')
    p.status = accept ? 'accepted' : 'declined'
    return p
  }

  questionItem(q: Question): QuestionListItem {
    const claim = this.s.matches
      .filter((m) => m.questionId === q.id && m.claimedAt && Date.now() - new Date(m.claimedAt).getTime() < GUARDS.claimExpiryMinutes * 60000)
      .sort((a, b) => (b.claimedAt ?? '').localeCompare(a.claimedAt ?? ''))[0]
    return {
      ...q,
      author: this.summaryById(q.authorId),
      answerCount: this.s.answers.filter((a) => a.questionId === q.id && !a.removedAt).length,
      tags: this.tagsOf(q.tagIds),
      claimedBy: claim ? this.summaryById(claim.helperId) : null,
    }
  }

  /* ---------------- Salles ---------------- */

  createRoom(ownerId: ID, input: NewRoomInput, now: number, repoVerified: boolean): Room {
    if (input.name.trim().length < 3) throw new DomainError('room.name-too-short')
    if (!/^[\w.-]+\/[\w.-]+$/.test(input.repoFullName)) throw new DomainError('room.bad-repo')
    const code = input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24)
    const inviteCode = this.s.rooms.some((r) => r.inviteCode === code) ? `${code}-${uuid().slice(0, 4)}` : code
    const r: Room = {
      id: uuid(),
      ownerId,
      name: input.name.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      state: input.state,
      repoFullName: input.repoFullName,
      repoVerified,
      demoUrl: input.demoUrl,
      coverUrl: input.coverUrl ?? null,
      inviteCode,
      visibility: 'public',
      tagIds: input.tagIds,
      wantedRoles: input.wantedRoles,
      createdAt: iso(now),
      lastActivityAt: iso(now),
    }
    this.s.rooms.push(r)
    this.s.members.push({ roomId: r.id, userId: ownerId, role: 'owner', joinedAt: iso(now) })
    if (r.demoUrl) this.award(ownerId, 'project-demo', r.tagIds, { sourceType: 'room', sourceId: r.id, sourceLabel: r.name }, now)
    return r
  }

  room(id: ID) {
    const r = this.s.rooms.find((x) => x.id === id)
    if (!r) throw new DomainError('not-found')
    return r
  }

  isMember(roomId: ID, userId: ID) {
    return this.s.members.some((m) => m.roomId === roomId && m.userId === userId)
  }

  requestJoin(roomId: ID, userId: ID, message: string, now: number) {
    const r = this.room(roomId)
    if (this.isMember(roomId, userId)) throw new DomainError('room.already-member')
    const existing = this.s.requests.find((x) => x.roomId === roomId && x.userId === userId && x.status === 'pending')
    if (existing) return existing
    const jr: JoinRequest = { id: uuid(), roomId, userId, message: message.trim(), status: 'pending', createdAt: iso(now) }
    this.s.requests.push(jr)
    this.notify(r.ownerId, 'join-request', { roomId, room: r.name, user: this.user(userId).displayName }, now)
    return jr
  }

  respondJoin(requestId: ID, actorId: ID, accept: boolean, now: number) {
    const jr = this.s.requests.find((x) => x.id === requestId)
    if (!jr) throw new DomainError('not-found')
    const r = this.room(jr.roomId)
    if (r.ownerId !== actorId) throw new DomainError('forbidden')
    jr.status = accept ? 'accepted' : 'declined'
    if (accept) {
      this.s.members.push({ roomId: r.id, userId: jr.userId, role: 'member', joinedAt: iso(now) })
      r.lastActivityAt = iso(now)
    }
    this.notify(jr.userId, 'join-accepted', { roomId: r.id, room: r.name, accepted: accept ? 1 : 0, code: r.inviteCode }, now)
    return jr
  }

  createTask(roomId: ID, actorId: ID, input: NewTaskInput, now: number) {
    const r = this.room(roomId)
    if (!this.isMember(roomId, actorId)) throw new DomainError('forbidden')
    if (input.title.trim().length < 4) throw new DomainError('task.title-too-short')
    const t: Task = {
      id: uuid(),
      roomId,
      title: input.title.trim(),
      description: input.description.trim(),
      level: input.level,
      status: 'open',
      assigneeId: null,
      prUrl: null,
      prVerified: null,
      githubIssueId: null,
      createdAt: iso(now),
      updatedAt: iso(now),
    }
    this.s.tasks.push(t)
    r.lastActivityAt = iso(now)
    return t
  }

  task(id: ID) {
    const t = this.s.tasks.find((x) => x.id === id)
    if (!t) throw new DomainError('not-found')
    return t
  }

  takeTask(taskId: ID, actorId: ID, now: number) {
    const t = this.task(taskId)
    if (!this.isMember(t.roomId, actorId)) throw new DomainError('task.members-only')
    if (t.status !== 'open') throw new DomainError('task.not-open')
    t.status = 'taken'
    t.assigneeId = actorId
    t.updatedAt = iso(now)
    this.room(t.roomId).lastActivityAt = iso(now)
    return t
  }

  moveTask(taskId: ID, actorId: ID, status: TaskStatus, now: number) {
    const t = this.task(taskId)
    const r = this.room(t.roomId)
    if (status === 'done') throw new DomainError('task.use-complete')
    const allowed = actorId === r.ownerId || actorId === t.assigneeId
    if (!allowed) throw new DomainError('forbidden')
    t.status = status
    if (status === 'open') t.assigneeId = null
    t.updatedAt = iso(now)
    return t
  }

  /** R8 + R9 : seul le créateur termine une tâche, avec un lien de PR ; +15 XP au contributeur. */
  completeTask(taskId: ID, actorId: ID, prUrl: string, prVerified: boolean | null, now: number) {
    const t = this.task(taskId)
    const r = this.room(t.roomId)
    if (r.ownerId !== actorId) throw new DomainError('task.owner-only')
    if (!t.assigneeId) throw new DomainError('task.no-assignee')
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/.test(prUrl)) throw new DomainError('task.bad-pr')
    if (t.status === 'done') return { task: t, gained: 0 }
    t.status = 'done'
    t.prUrl = prUrl
    t.prVerified = prVerified
    t.updatedAt = iso(now)
    r.lastActivityAt = iso(now)
    let gained = 0
    if (t.assigneeId !== r.ownerId) {
      gained = this.award(t.assigneeId, 'contribution-accepted', r.tagIds, { sourceType: 'task', sourceId: t.id, sourceLabel: `${r.name} · ${t.title}` }, now)
      this.notify(t.assigneeId, 'task-done', { roomId: r.id, room: r.name, task: t.title, points: gained, code: r.inviteCode }, now)
    }
    return { task: t, gained }
  }

  postMessage(roomId: ID, authorId: ID, body: string, kind: RoomMessage['kind'], clientId: ID, now: number) {
    const done = this.s.messages.find((m) => m.clientId === clientId)
    if (done) return done
    if (!this.isMember(roomId, authorId)) throw new DomainError('room.members-only')
    const m: RoomMessage = { id: uuid(), roomId, authorId, body: maskSecrets(body.trim()).text, kind, clientId, createdAt: iso(now) }
    this.s.messages.push(m)
    this.room(roomId).lastActivityAt = iso(now)
    return m
  }

  requestFeedback(roomId: ID, actorId: ID, kind: FeedbackRequest['kind'], now: number) {
    const r = this.room(roomId)
    if (r.ownerId !== actorId) throw new DomainError('task.owner-only')
    const fr: FeedbackRequest = { id: uuid(), roomId, kind, status: 'open', createdAt: iso(now) }
    this.s.feedback.push(fr)
    return fr
  }

  roomItem(r: Room): RoomListItem {
    const members = this.s.members.filter((m) => m.roomId === r.id)
    return {
      ...r,
      owner: this.summaryById(r.ownerId),
      tags: this.tagsOf(r.tagIds),
      memberCount: members.length,
      openTasks: this.s.tasks.filter((t) => t.roomId === r.id && t.status === 'open').length,
      members: members.slice(0, 5).map((m) => this.summaryById(m.userId)),
    }
  }

  /* ---------------- Passport, découverte, classement ---------------- */

  passport(handle: string): Passport {
    const u = this.userByHandle(handle)
    if (!u) throw new DomainError('not-found')
    const myAnswers = this.s.answers.filter((a) => a.authorId === u.id)
    const accepted = myAnswers.filter((a) => a.isAccepted)
    const responseTimes = myAnswers
      .map((a) => {
        const q = this.s.questions.find((x) => x.id === a.questionId)
        return q ? minutesBetween(q.createdAt, a.createdAt) : null
      })
      .filter((x): x is number => x !== null && x >= 0)
    const proofs = this.s.xp
      .filter((e) => e.userId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((e) => ({ ...e, sourceHref: this.proofHref(e) }))
    const days = new Map<string, number>()
    for (const e of proofs) {
      if (e.revertedAt || e.kind === 'question-resolved' || e.kind === 'fast-bonus') continue
      const d = e.createdAt.slice(0, 10)
      days.set(d, (days.get(d) ?? 0) + 1)
    }
    const heatmap: Passport['heatmap'] = []
    const end = new Date()
    for (let i = 26 * 7 - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 864e5).toISOString().slice(0, 10)
      heatmap.push({ date: d, count: days.get(d) ?? 0 })
    }
    const memberRooms = this.s.members.filter((m) => m.userId === u.id).map((m) => this.room(m.roomId))
    const ranking = this.s.users
      .filter((x) => x.country === u.country && !x.deletedAt)
      .map((x) => ({ id: x.id, xp: this.totalXp(x.id) }))
      .sort((a, b) => b.xp - a.xp)
    const idx = ranking.findIndex((x) => x.id === u.id)
    return {
      user: u,
      totalXp: this.totalXp(u.id),
      skills: this.skillViews(u.id),
      stats: {
        questionsResolved: this.s.questions.filter((q) => q.authorId === u.id && q.status === 'resolved').length,
        answersAccepted: accepted.length,
        medianResponseMinutes: median(responseTimes),
        contributions: this.s.tasks.filter((t) => t.assigneeId === u.id && t.status === 'done').length,
        reviews: proofs.filter((e) => e.kind === 'code-review' && !e.revertedAt).length,
        devsUnblocked: new Set(accepted.map((a) => this.s.questions.find((q) => q.id === a.questionId)?.authorId)).size,
      },
      rooms: memberRooms.map((r) => this.roomItem(r)),
      proofs,
      heatmap,
      countryRank: idx >= 0 ? idx + 1 : null,
    }
  }

  proofHref(e: XPEvent): string | undefined {
    if (e.sourceType === 'question') return `/sos/${e.sourceId}`
    if (e.sourceType === 'answer') {
      const a = this.s.answers.find((x) => x.id === e.sourceId)
      return a ? `/sos/${a.questionId}` : undefined
    }
    if (e.sourceType === 'task') {
      const t = this.s.tasks.find((x) => x.id === e.sourceId)
      const r = t && this.s.rooms.find((x) => x.id === t.roomId)
      return r ? `/p/${r.inviteCode}?tab=tasks` : undefined
    }
    if (e.sourceType === 'room') {
      const r = this.s.rooms.find((x) => x.id === e.sourceId)
      return r ? `/p/${r.inviteCode}` : undefined
    }
    return undefined
  }

  devCard(u: User): DevCard {
    return {
      ...this.summary(u),
      topSkills: this.skillViews(u.id).slice(0, 4),
      availability: u.availability,
      languages: u.languages,
      utcOffset: u.utcOffset,
      lookingFor: u.lookingFor,
    }
  }

  leaderboard(): LeaderboardRow[] {
    const byCountry = new Map<string, User[]>()
    for (const u of this.s.users) {
      if (u.deletedAt || u.isAdmin) continue
      byCountry.set(u.country, [...(byCountry.get(u.country) ?? []), u])
    }
    return [...byCountry.entries()]
      .map(([country, users]) => {
        const scored = users.map((u) => ({ u, xp: this.totalXp(u.id) })).sort((a, b) => b.xp - a.xp)
        return {
          country,
          devs: users.length,
          xp: scored.reduce((s, x) => s + x.xp, 0),
          resolved: this.s.answers.filter((a) => a.isAccepted && users.some((u) => u.id === a.authorId)).length,
          topDev: scored[0] ? this.summary(scored[0].u) : null,
        }
      })
      .sort((a, b) => b.xp - a.xp)
  }

  activity(limit = 20): ActivityItem[] {
    const items: ActivityItem[] = []
    for (const q of this.s.questions) {
      if (q.removedAt) continue
      items.push({ id: `ask-${q.id}`, kind: 'asked', actor: this.summaryById(q.authorId), targetLabel: q.title, targetHref: `/sos/${q.id}`, createdAt: q.createdAt })
      if (q.status === 'resolved' && q.acceptedAnswerId && q.resolvedAt) {
        const a = this.s.answers.find((x) => x.id === q.acceptedAnswerId)
        if (a)
          items.push({
            id: `res-${q.id}`,
            kind: 'resolved',
            actor: this.summaryById(a.authorId),
            targetLabel: q.title,
            targetHref: `/sos/${q.id}`,
            detail: String(minutesBetween(q.createdAt, a.createdAt)),
            createdAt: q.resolvedAt,
          })
      }
    }
    for (const t of this.s.tasks) {
      if (t.status !== 'done' || !t.assigneeId) continue
      const r = this.room(t.roomId)
      items.push({ id: `task-${t.id}`, kind: 'task-done', actor: this.summaryById(t.assigneeId), targetLabel: `${r.name} · ${t.title}`, targetHref: `/p/${r.inviteCode}`, createdAt: t.updatedAt })
    }
    for (const r of this.s.rooms) {
      items.push({ id: `room-${r.id}`, kind: 'room-created', actor: this.summaryById(r.ownerId), targetLabel: r.name, targetHref: `/p/${r.inviteCode}`, createdAt: r.createdAt })
    }
    for (const m of this.s.members) {
      if (m.role !== 'member') continue
      const r = this.room(m.roomId)
      items.push({ id: `join-${m.roomId}-${m.userId}`, kind: 'joined', actor: this.summaryById(m.userId), targetLabel: r.name, targetHref: `/p/${r.inviteCode}`, createdAt: m.joinedAt })
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
  }

  /* ---------------- Modération ---------------- */

  report(reporterId: ID, targetType: Report['targetType'], targetId: ID, targetLabel: string, reason: string, now: number) {
    const r: Report = { id: uuid(), reporterId, targetType, targetId, targetLabel, reason, status: 'open', handledBy: null, createdAt: iso(now) }
    this.s.reports.push(r)
    return r
  }

  handleReport(reportId: ID, adminId: ID, remove: boolean, now: number) {
    const admin = this.user(adminId)
    if (!admin.isAdmin) throw new DomainError('forbidden')
    const r = this.s.reports.find((x) => x.id === reportId)
    if (!r) throw new DomainError('not-found')
    r.status = remove ? 'removed' : 'dismissed'
    r.handledBy = adminId
    if (remove) {
      const at = iso(now)
      if (r.targetType === 'question') {
        const q = this.s.questions.find((x) => x.id === r.targetId)
        if (q) q.removedAt = at
      }
      if (r.targetType === 'answer') {
        const a = this.s.answers.find((x) => x.id === r.targetId)
        if (a) {
          a.removedAt = at
          // Abus confirmé : événement d'annulation, jamais de suppression (journal append-only).
          for (const e of this.s.xp.filter((x) => x.sourceId === a.id && !x.revertedAt)) {
            e.revertedAt = at
            this.s.xp.push({ ...e, id: uuid(), kind: 'revert', points: 0, sourceType: 'xp_event', sourceId: e.id, revertedAt: null, createdAt: at })
            for (const tagId of this.s.questions.find((q) => q.id === a.questionId)?.tagIds ?? []) {
              const sk = this.s.skills.find((s) => s.userId === e.userId && s.tagId === tagId)
              if (sk) {
                sk.xpTag = Math.max(0, sk.xpTag - e.points)
                sk.score = skillScore(sk.githubSignal, platformSignal(sk.xpTag))
              }
            }
          }
        }
      }
      if (r.targetType === 'message') this.s.messages = this.s.messages.filter((m) => m.id !== r.targetId)
    }
    return r
  }

  /* ---------------- Compte ---------------- */

  deleteAccount(userId: ID, now: number) {
    const u = this.user(userId)
    u.deletedAt = iso(now)
    u.displayName = 'Compte supprimé'
    u.avatarUrl = null
    u.bio = ''
    u.city = ''
    u.handle = `supprime-${u.id.slice(0, 6)}`
    // Contributions conservées mais anonymisées (A3).
  }
}
