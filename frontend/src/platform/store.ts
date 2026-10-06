import { create } from 'zustand'
import { storageGet, storageSet, uuid } from '@/lib/utils'
import type { BuildTrack, Comment, Job, Post } from './types'

/**
 * État personnel sur les services de l'écosystème, gardé sur l'appareil (fonctionne hors ligne).
 * Il sera synchronisé avec l'API quand le serveur exposera ces services.
 */
export interface Application {
  jobId: string
  at: string
  message: string
  status: 'envoyee' | 'vue' | 'entretien'
}

export interface CertResult {
  score: number
  passed: boolean
  at: string
}

interface Persisted {
  votes: Record<string, 1 | -1>
  saved: string[]
  joined: string[]
  myPosts: Post[]
  myComments: Comment[]
  savedJobs: string[]
  applications: Application[]
  certResults: Record<string, CertResult>
  savedCerts: string[]
  installedSkills: string[]
  starredSkills: string[]
  likedVideos: string[]
  subscriptions: string[]
  watchLater: string[]
  lessonsDone: string[]
  enrolled: string[]
  guideTrack: BuildTrack | null
  guideChecks: Record<string, string[]>
  publishedJobs: Job[]
}

interface Actions {
  vote: (id: string, dir: 1 | -1) => void
  toggle: (key: 'saved' | 'joined' | 'savedJobs' | 'savedCerts' | 'installedSkills' | 'starredSkills' | 'likedVideos' | 'subscriptions' | 'watchLater' | 'enrolled', id: string) => void
  addPost: (p: Omit<Post, 'id' | 'score' | 'comments' | 'createdAt'>) => Post
  addComment: (postId: string, parentId: string | null, author: string, body: string) => void
  apply: (jobId: string, message: string) => void
  recordCert: (certId: string, score: number, passScore: number) => void
  completeLesson: (key: string) => void
  setGuideTrack: (t: BuildTrack) => void
  toggleGuideCheck: (stepId: string, item: string) => void
  resetGuide: () => void
  publishJob: (j: Omit<Job, 'id' | 'applicants' | 'postedAt'>) => Job
}

const KEY = 'dh-platform'

const DEFAULTS: Persisted = {
  votes: {},
  saved: [],
  joined: ['ia', 'web', 'showcase', 'carriere'],
  myPosts: [],
  myComments: [],
  savedJobs: [],
  applications: [],
  certResults: {},
  savedCerts: [],
  installedSkills: [],
  starredSkills: [],
  likedVideos: [],
  subscriptions: ['moussa-diop', 'grace-uwase', 'kwame-dev', 'je-hounkpatin', 'nadia-benali', 'esi-owusu'],
  watchLater: [],
  lessonsDone: [],
  enrolled: [],
  guideTrack: null,
  guideChecks: {},
  publishedJobs: [],
}

function load(): Persisted {
  try {
    const raw = storageGet(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export const usePlatform = create<Persisted & Actions>((set) => ({
  ...load(),
  vote: (id, dir) =>
    set((s) => {
      const votes = { ...s.votes }
      if (votes[id] === dir) delete votes[id]
      else votes[id] = dir
      return { votes }
    }),
  toggle: (key, id) =>
    set((s) => {
      const list = s[key]
      return { [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } as Partial<Persisted>
    }),
  addPost: (p) => {
    const post: Post = { ...p, id: `mine-${uuid()}`, score: 1, comments: 0, createdAt: new Date().toISOString() }
    set((s) => ({ myPosts: [post, ...s.myPosts], votes: { ...s.votes, [post.id]: 1 } }))
    return post
  },
  addComment: (postId, parentId, author, body) =>
    set((s) => ({ myComments: [...s.myComments, { id: `mc-${uuid()}`, postId, parentId, author, body, score: 1, createdAt: new Date().toISOString() }] })),
  apply: (jobId, message) =>
    set((s) => ({ applications: [...s.applications.filter((a) => a.jobId !== jobId), { jobId, message, at: new Date().toISOString(), status: 'envoyee' }] })),
  recordCert: (certId, score, passScore) =>
    set((s) => {
      const prev = s.certResults[certId]
      const next = { score, passed: score >= passScore, at: new Date().toISOString() }
      // On garde le meilleur résultat obtenu
      return { certResults: { ...s.certResults, [certId]: prev && prev.score > score ? prev : next } }
    }),
  completeLesson: (key) => set((s) => (s.lessonsDone.includes(key) ? s : { lessonsDone: [...s.lessonsDone, key] })),
  setGuideTrack: (guideTrack) => set({ guideTrack }),
  toggleGuideCheck: (stepId, item) =>
    set((s) => {
      const cur = s.guideChecks[stepId] ?? []
      return { guideChecks: { ...s.guideChecks, [stepId]: cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item] } }
    }),
  resetGuide: () => set({ guideChecks: {}, guideTrack: null }),
  publishJob: (j) => {
    const job: Job = { ...j, id: `mine-${uuid()}`, applicants: 0, postedAt: new Date().toISOString() }
    set((s) => ({ publishedJobs: [job, ...s.publishedJobs] }))
    return job
  },
}))

// Sauvegarde sur l'appareil à chaque changement (les fonctions ne sont pas sérialisées).
usePlatform.subscribe((s) => {
  const data: Persisted = {
    votes: s.votes,
    saved: s.saved,
    joined: s.joined,
    myPosts: s.myPosts,
    myComments: s.myComments,
    savedJobs: s.savedJobs,
    applications: s.applications,
    certResults: s.certResults,
    savedCerts: s.savedCerts,
    installedSkills: s.installedSkills,
    starredSkills: s.starredSkills,
    likedVideos: s.likedVideos,
    subscriptions: s.subscriptions,
    watchLater: s.watchLater,
    lessonsDone: s.lessonsDone,
    enrolled: s.enrolled,
    guideTrack: s.guideTrack,
    guideChecks: s.guideChecks,
    publishedJobs: s.publishedJobs,
  }
  try {
    storageSet(KEY, JSON.stringify(data))
  } catch {
    /* stockage plein ou indisponible : l'état reste en mémoire */
  }
})

