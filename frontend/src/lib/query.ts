/**
 * Mini-couche de données « stale-while-revalidate ».
 * - Un contenu déjà vu s'affiche immédiatement (règle de navigation n°2), puis se rafraîchit.
 * - `prefetch` permet de charger une page au survol d'un lien.
 * - `invalidate(prefix)` rafraîchit tout ce qui commence par une clé.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

type Entry = { data?: unknown; error?: unknown; promise?: Promise<unknown>; at: number; fetcher?: () => Promise<unknown> }

const cache = new Map<string, Entry>()
const listeners = new Map<string, Set<() => void>>()
const STALE_MS = 15_000

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l())
}

function run(key: string, fetcher: () => Promise<unknown>) {
  const e = cache.get(key) ?? { at: 0 }
  if (e.promise) return e.promise
  e.fetcher = fetcher
  const p = fetcher()
    .then((data) => {
      cache.set(key, { data, at: Date.now(), fetcher })
      return data
    })
    .catch((error) => {
      cache.set(key, { ...cache.get(key), error, promise: undefined, at: Date.now(), fetcher })
      throw error
    })
    .finally(() => emit(key))
  cache.set(key, { ...e, promise: p })
  emit(key)
  return p
}

export function prefetch(key: string, fetcher: () => Promise<unknown>) {
  const e = cache.get(key)
  if (e && (e.promise || Date.now() - e.at < STALE_MS)) return
  run(key, fetcher).catch(() => {})
}

export function invalidate(prefix = '') {
  for (const [key, e] of cache) {
    if (!key.startsWith(prefix)) continue
    e.at = 0
    if (listeners.get(key)?.size && e.fetcher) run(key, e.fetcher).catch(() => {})
  }
}

export function setQueryData<T>(key: string, updater: (old: T | undefined) => T) {
  const e = cache.get(key) ?? { at: Date.now() }
  cache.set(key, { ...e, data: updater(e.data as T | undefined) })
  emit(key)
}

export interface QueryResult<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<unknown>
}

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>): QueryResult<T> {
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => {}
      const set = listeners.get(key) ?? new Set()
      set.add(cb)
      listeners.set(key, set)
      return () => set.delete(cb)
    },
    [key],
  )
  const entry = useSyncExternalStore(subscribe, () => (key ? cache.get(key) : undefined))

  useEffect(() => {
    if (!key) return
    const e = cache.get(key)
    if (!e || (!e.promise && Date.now() - e.at > STALE_MS) || e.at === 0) run(key, () => fetcherRef.current()).catch(() => {})
  }, [key])

  // Rafraîchit à la demande d'un événement serveur (piste prête, synchronisation terminée…).
  useEffect(() => {
    if (!key) return
    const onEvent = () => run(key, () => fetcherRef.current()).catch(() => {})
    window.addEventListener('devhub:refresh', onEvent)
    return () => window.removeEventListener('devhub:refresh', onEvent)
  }, [key])

  return {
    data: entry?.data as T | undefined,
    error: entry?.data === undefined ? entry?.error : undefined,
    loading: entry?.data === undefined && !entry?.error,
    refreshing: !!entry?.promise && entry?.data !== undefined,
    refresh: () => (key ? run(key, () => fetcherRef.current()) : Promise.resolve()),
  }
}

export function refreshAll() {
  window.dispatchEvent(new Event('devhub:refresh'))
}
