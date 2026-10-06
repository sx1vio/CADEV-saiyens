/**
 * Hors ligne d'abord (CDC §6.5, O1-O3, O5, O8, O9).
 * - État réseau réel (navigator.onLine) + simulateur (O5 : hors ligne ou 2G), aussi pilotable par ?net=offline|2g
 * - File d'attente IndexedDB : chaque action a un UUID (client_id), elle est rejouée dans l'ordre,
 *   avec reprise progressive en cas d'échec, sans doublon (le serveur est idempotent sur client_id).
 */
import { openDB, type IDBPDatabase } from 'idb'
import { create } from 'zustand'
import { maskSecrets } from '@/lib/detect'
import { refreshAll, invalidate } from '@/lib/query'
import { sleep, storageGet, storageSet } from '@/lib/utils'
import { api } from '@/services'
import type { NewQuestionInput, RoomMessage } from '@/services'

export type SimMode = 'off' | 'offline' | '2g'

export type QueuedAction =
  | { type: 'question'; payload: NewQuestionInput }
  | { type: 'answer'; payload: { questionId: string; body: string; questionTitle: string } }
  | { type: 'message'; payload: { roomId: string; body: string; kind: RoomMessage['kind']; roomName: string } }
  | { type: 'take-task'; payload: { taskId: string; taskTitle: string } }

export type QueueItem = QueuedAction & {
  id: string // = client_id = Idempotency-Key
  createdAt: string
  attempts: number
  status: 'pending' | 'syncing' | 'error'
  error?: string
  userId: string
}

interface NetworkState {
  browserOnline: boolean
  sim: SimMode
  queue: QueueItem[]
  syncing: boolean
  lastSync: { at: string; sent: number; failed: number } | null
  online: () => boolean
  setSim: (m: SimMode) => void
}

let dbp: Promise<IDBPDatabase> | null = null
const qdb = () => (dbp ??= openDB('devhub-queue', 1, { upgrade: (d) => d.createObjectStore('actions', { keyPath: 'id' }) }))

function initialSim(): SimMode {
  const p = new URLSearchParams(location.search).get('net')
  if (p === 'offline' || p === '2g') return p
  const s = storageGet('dh-net-sim')
  return s === 'offline' || s === '2g' ? s : 'off'
}

export const useNetwork = create<NetworkState>((set, get) => ({
  browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  sim: initialSim(),
  queue: [],
  syncing: false,
  lastSync: null,
  online: () => get().browserOnline && get().sim !== 'offline',
  setSim: (sim) => {
    set({ sim })
    storageSet('dh-net-sim', sim === 'off' ? null : sim)
    if (sim !== 'offline') void flush()
  },
}))

export const isOnline = () => useNetwork.getState().online()

/** Délai artificiel en mode 2G simulé (O5). */
export async function networkDelay() {
  if (useNetwork.getState().sim === '2g') await sleep(900 + Math.random() * 700)
}

async function loadQueue() {
  try {
    const items = (await (await qdb()).getAll('actions')) as QueueItem[]
    useNetwork.setState({ queue: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) })
  } catch {
    /* IndexedDB indisponible */
  }
}

async function save(item: QueueItem) {
  try {
    await (await qdb()).put('actions', item)
  } catch {
    /* ignore */
  }
}

async function remove(id: string) {
  try {
    await (await qdb()).delete('actions', id)
  } catch {
    /* ignore */
  }
}

/** O9 : les secrets sont masqués avant d'être écrits sur l'appareil. */
function sanitize(a: QueuedAction): QueuedAction {
  if (a.type === 'question') return { ...a, payload: { ...a.payload, codeSnippet: maskSecrets(a.payload.codeSnippet).text, body: maskSecrets(a.payload.body).text } }
  if (a.type === 'answer') return { ...a, payload: { ...a.payload, body: maskSecrets(a.payload.body).text } }
  if (a.type === 'message') return { ...a, payload: { ...a.payload, body: maskSecrets(a.payload.body).text } }
  return a
}

async function execute(item: QueueItem) {
  await networkDelay()
  switch (item.type) {
    case 'question':
      return api.createQuestion(item.payload, item.id)
    case 'answer':
      return api.answer(item.payload.questionId, item.payload.body, item.id)
    case 'message':
      return api.postMessage(item.payload.roomId, item.payload.body, item.payload.kind, item.id)
    case 'take-task':
      return api.takeTask(item.payload.taskId)
  }
}

/** Met une action en file. En ligne, elle part tout de suite ; hors ligne, elle attend le réseau. */
export async function enqueue(action: QueuedAction, userId: string, clientId: string) {
  const item: QueueItem = { ...sanitize(action), id: clientId, createdAt: new Date().toISOString(), attempts: 0, status: 'pending', userId }
  await save(item)
  useNetwork.setState((s) => ({ queue: [...s.queue, item] }))
  if (isOnline()) return flushOne(item)
  return { queued: true as const, item }
}

async function flushOne(item: QueueItem) {
  useNetwork.setState((s) => ({ queue: s.queue.map((q) => (q.id === item.id ? { ...q, status: 'syncing' } : q)) }))
  try {
    const result = await execute(item)
    await remove(item.id)
    useNetwork.setState((s) => ({ queue: s.queue.filter((q) => q.id !== item.id) }))
    invalidate('')
    return { queued: false as const, result }
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown'
    const offline = code === 'network.offline' || !isOnline()
    const next: QueueItem = { ...item, attempts: item.attempts + 1, status: offline ? 'pending' : 'error', error: offline ? undefined : code }
    await save(next)
    useNetwork.setState((s) => ({ queue: s.queue.map((q) => (q.id === item.id ? next : q)) }))
    if (offline) return { queued: true as const, item: next }
    throw err
  }
}

let flushing = false
/** Rejoue la file dans l'ordre ; s'arrête à la première coupure ; reprise progressive (1 s, 2 s, 4 s…). */
export async function flush() {
  if (flushing || !isOnline()) return
  const pending = useNetwork.getState().queue.filter((q) => q.status !== 'syncing')
  if (!pending.length) return
  flushing = true
  useNetwork.setState({ syncing: true })
  let sent = 0
  let failed = 0
  for (const item of pending) {
    if (!isOnline()) break
    try {
      const r = await flushOne(item)
      if (r.queued) break
      sent++
    } catch {
      failed++
    }
  }
  flushing = false
  useNetwork.setState({ syncing: false, lastSync: { at: new Date().toISOString(), sent, failed } })
  window.dispatchEvent(new CustomEvent('devhub:synced', { detail: { sent, failed } }))
  refreshAll()
  const left = useNetwork.getState().queue.filter((q) => q.status === 'pending')
  if (left.length && isOnline()) {
    const attempts = Math.min(5, Math.max(...left.map((q) => q.attempts)))
    setTimeout(() => void flush(), 1000 * 2 ** attempts)
  }
}

export async function cancelQueued(id: string) {
  await remove(id)
  useNetwork.setState((s) => ({ queue: s.queue.filter((q) => q.id !== id) }))
}

export async function retryQueued(id: string) {
  const item = useNetwork.getState().queue.find((q) => q.id === id)
  if (!item) return
  const next = { ...item, status: 'pending' as const, error: undefined }
  await save(next)
  useNetwork.setState((s) => ({ queue: s.queue.map((q) => (q.id === id ? next : q)) }))
  void flush()
}

/** Écritures qui exigent le réseau (non mises en file) : on prévient clairement l'utilisateur. */
export function requireNetwork() {
  if (!isOnline()) {
    const e = new Error('network.offline') as Error & { code: string }
    e.code = 'network.offline'
    throw e
  }
}

export function startNetwork() {
  void loadQueue().then(() => flush())
  window.addEventListener('online', () => {
    useNetwork.setState({ browserOnline: true })
    void flush()
  })
  window.addEventListener('offline', () => useNetwork.setState({ browserOnline: false }))
  window.addEventListener('devhub:server-event', () => refreshAll())
}
