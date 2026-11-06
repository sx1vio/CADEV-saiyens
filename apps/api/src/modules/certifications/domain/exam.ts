import { randomInt } from 'node:crypto';
import { CERT_RETRY_DELAY_MS } from '@devhub/core';
import type { Bank, BankQuestion } from '../bank';

/** Marge après la fin du chrono pour absorber la latence réseau d'un envoi automatique. */
export const SUBMIT_GRACE_MS = 30_000;
/** Examens blancs démarrés, au plus, par certification et par jour glissant. */
export const MOCKS_PER_DAY = 5;

/** Question tirée : identifiant et ordre d'affichage des choix (index d'origine). */
export interface Drawn {
  id: string;
  order: number[];
}

export type Rng = (max: number) => number;
const cryptoRng: Rng = (max) => randomInt(max);

export function shuffle<T>(list: readonly T[], rng: Rng = cryptoRng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Tirage : au moins une question par thème, le reste au hasard ; questions et choix mélangés. */
export function drawExam(bank: Bank, rng: Rng = cryptoRng): Drawn[] {
  const pool = shuffle(bank.questions, rng);
  const picked: BankQuestion[] = [];
  const seen = new Set<number>();
  for (const q of pool) {
    if (!seen.has(q.topic)) {
      seen.add(q.topic);
      picked.push(q);
    }
  }
  const rest = pool.filter((q) => !picked.includes(q));
  const all = [...picked, ...rest].slice(0, Math.min(bank.draw, bank.questions.length));
  return shuffle(all, rng).map((q) => ({
    id: q.id,
    order: shuffle(
      q.choices.map((_, i) => i),
      rng,
    ),
  }));
}

export interface Graded {
  good: number;
  total: number;
  score: number;
  passed: boolean;
  /** Réponses en index d'origine, pour l'historique. */
  original: Array<number | null>;
  topics: Array<{ topic: number; ok: number; total: number }>;
  corrections: Array<{
    question: BankQuestion;
    order: number[];
    given: number | null;
    answer: number;
    correct: boolean;
  }>;
}

/** Correction : `answers` donne l'index du choix affiché (ou null) pour chaque question tirée. */
export function grade(bank: Bank, drawn: Drawn[], answers: Array<number | null>): Graded {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const corrections: Graded['corrections'] = [];
  const original: Array<number | null> = [];
  for (const [k, d] of drawn.entries()) {
    const question = byId.get(d.id);
    if (!question) continue; // question retirée de la banque depuis le tirage
    const shown = answers[k];
    const given = shown === null || shown === undefined || shown >= d.order.length ? null : shown;
    const originalGiven = given === null ? null : d.order[given]!;
    original.push(originalGiven);
    corrections.push({
      question,
      order: d.order,
      given,
      answer: d.order.indexOf(question.answer),
      correct: originalGiven === question.answer,
    });
  }
  const total = corrections.length;
  const good = corrections.filter((c) => c.correct).length;
  const score = total ? Math.round((good / total) * 100) : 0;
  const topics = bank.syllabus
    .map((_, topic) => {
      const qs = corrections.filter((c) => c.question.topic === topic);
      return { topic, ok: qs.filter((c) => c.correct).length, total: qs.length };
    })
    .filter((t) => t.total > 0);
  return { good, total, score, passed: score >= bank.passScore, original, topics, corrections };
}

export interface LastExam {
  startedAt: Date;
  deadline: Date;
  submittedAt: Date | null;
  passed: boolean | null;
}

/** Une tentative non envoyée reste « en cours » jusqu'à la fin du chrono plus la marge. */
export function isActive(a: { deadline: Date; submittedAt: Date | null }, now: Date): boolean {
  return !a.submittedAt && now.getTime() <= a.deadline.getTime() + SUBMIT_GRACE_MS;
}

/**
 * Prochaine tentative d'examen : une heure après un échec. Une tentative abandonnée (chrono écoulé
 * sans envoi) compte comme un échec à la fin de son chrono.
 */
export function nextAttemptAt(last: LastExam | null, now: Date): Date | null {
  if (!last || isActive(last, now)) return null;
  if (last.submittedAt && last.passed) return null;
  const failedAt = last.submittedAt ?? last.deadline;
  const next = new Date(failedAt.getTime() + CERT_RETRY_DELAY_MS);
  return next > now ? next : null;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Code de vérification public : DH-WEB-7K2Q-M9XD (sans 0/O ni 1/I pour éviter les confusions). */
export function certificateCode(certId: string, rng: Rng = cryptoRng): string {
  const block = () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[rng(CODE_ALPHABET.length)]).join('');
  const prefix = certId
    .split('-')[0]!
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  return `DH-${prefix}-${block()}-${block()}`;
}
