/**
 * Implémentation « http » du contrat DevHubApi : la vraie API (CDC §8).
 * Activée dès que VITE_API_URL est défini. Les écritures portent un en-tête Idempotency-Key (CDC §6.5).
 */
import type { DevHubApi } from './api'
import { DomainError, type User } from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

async function call<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new DomainError('network.offline')
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new DomainError(err.code ?? `http.${res.status}`, err.params)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const q = (o: Record<string, string | number | boolean | undefined | string[]>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '') p.set(k, Array.isArray(v) ? v.join(',') : String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const httpApi: DevHubApi = {
  mode: 'http',
  getSession: () => call<User>('GET', '/me').catch(() => null),
  importGitHub: async () => {
    // En production, la connexion passe par OAuth : redirection vers /auth/github.
    window.location.href = `${BASE}/auth/github`
    return new Promise(() => {})
  },
  signUpWithGitHub: () => call('GET', '/me'),
  loginDemo: (handle) => call('POST', '/auth/demo', { handle }),
  listDemoAccounts: () => call('GET', '/auth/demo'),
  logout: () => call('POST', '/auth/logout'),
  updateMe: (input) => call('PATCH', '/me', input),
  deleteMe: () => call('DELETE', '/me'),
  setMySkills: (slugs) => call('PUT', '/me/skills', { slugs }),
  listTags: () => call('GET', '/tags'),
  getHome: () => call('GET', '/home'),
  getLanding: () => call('GET', '/public/landing'),
  listQuestions: (tab, opts = {}) => call('GET', `/questions${q({ tab, ...opts })}`),
  getQuestion: (id) => call('GET', `/questions/${id}`),
  similarQuestions: (text, tagIds) => call('GET', `/questions/similar${q({ text, tags: tagIds })}`),
  createQuestion: (input, clientId) => call('POST', '/questions', { ...input, clientId }, clientId),
  answer: (questionId, body, clientId) => call('POST', `/questions/${questionId}/answers`, { body, clientId }, clientId),
  vote: (answerId) => call('POST', `/answers/${answerId}/vote`),
  accept: (answerId) => call('POST', `/answers/${answerId}/accept`),
  claim: (questionId) => call('POST', `/questions/${questionId}/claim`),
  proposePair: (questionId, startsAt, videoLink) => call('POST', `/questions/${questionId}/pair`, { startsAt, videoLink }),
  respondPair: (pairId, accept) => call('POST', `/pair/${pairId}/respond`, { accept }),
  translate: (text, to) => call<{ text: string }>('POST', '/translate', { text, to }).then((r) => r.text),
  listRooms: (opts = {}) => call('GET', `/rooms${q(opts)}`),
  getRoom: (code) => call('GET', `/rooms/${code}`),
  verifyRepo: (fullName) => call('GET', `/github/repos/${fullName}`),
  createRoom: (input) => call('POST', '/rooms', input),
  requestJoin: (roomId, message) => call('POST', `/rooms/${roomId}/join`, { message }),
  respondJoin: (requestId, accept) => call('POST', `/join-requests/${requestId}`, { accept }),
  createTask: (roomId, input) => call('POST', `/rooms/${roomId}/tasks`, input),
  takeTask: (taskId) => call('POST', `/tasks/${taskId}/take`),
  moveTask: (taskId, status) => call('POST', `/tasks/${taskId}/status`, { status }),
  completeTask: (taskId, prUrl) => call('POST', `/tasks/${taskId}/complete`, { prUrl }),
  postMessage: (roomId, body, kind, clientId) => call('POST', `/rooms/${roomId}/messages`, { body, kind, clientId }, clientId),
  requestFeedback: (roomId, kind) => call('POST', `/rooms/${roomId}/feedback`, { kind }),
  discoverDevs: (f) => call('GET', `/discover/devs${q({ ...f, tags: f.tags })}`),
  leaderboard: () => call('GET', '/leaderboard'),
  getPassport: (handle) => call('GET', `/u/${handle}`),
  listNotifications: () => call('GET', '/notifications'),
  markNotificationsRead: () => call('POST', '/notifications/read'),
  report: (targetType, targetId, targetLabel, reason) => call('POST', '/reports', { targetType, targetId, targetLabel, reason }),
  listReports: () => call('GET', '/admin/reports'),
  handleReport: (id, remove) => call(remove ? 'DELETE' : 'POST', `/admin/reports/${id}`),
  getStatus: () => call('GET', '/status'),
  getImpact: () => call('GET', '/impact'),
}
