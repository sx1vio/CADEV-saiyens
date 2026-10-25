// Freine le devinage de mots de passe : 10 échecs par empreinte d'IP sur 15 minutes, puis 429.
// En mémoire : suffisant pour une instance d'API ; à passer dans Postgres si l'API se multiplie.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

export class AttemptLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  blocked(key: string): boolean {
    return this.recent(key).length >= MAX_FAILURES;
  }

  fail(key: string): void {
    this.failures.set(key, [...this.recent(key), this.now()]);
    if (this.failures.size > 10_000) this.failures.delete(this.failures.keys().next().value!);
  }

  private recent(key: string): number[] {
    const since = this.now() - WINDOW_MS;
    return (this.failures.get(key) ?? []).filter((t) => t > since);
  }
}
