import { beforeEach, describe, expect, it, vi } from 'vitest';

// BUG-033 : à chaque ouverture du flux (première fois et reconnexions), les pages suivies et
// les notifications sont relues, pour rattraper les événements publics émis entre-temps.
const invalidate = vi.fn();
vi.mock('@/lib/query', () => ({ invalidate: (k: string) => invalidate(k) }));
vi.mock('./index', () => ({ api: { mode: 'http' } }));

class FakeEventSource {
  static last: FakeEventSource | null = null;
  listeners = new Map<string, Array<(e: unknown) => void>>();
  readonly url: string;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }
  addEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  emit(type: string, e: unknown = {}) {
    for (const fn of this.listeners.get(type) ?? []) fn(e);
  }
  close() {}
}

describe('ouverture du flux temps réel (BUG-033)', () => {
  beforeEach(() => {
    invalidate.mockClear();
    vi.stubGlobal('EventSource', FakeEventSource);
  });

  it('relit les pages suivies à l’ouverture et à chaque reconnexion', async () => {
    const { followTopic, openStream } = await import('./realtime');
    const stop = followTopic('question:q1', 'question:q1');
    openStream();
    const source = FakeEventSource.last!;
    expect(source.url).toBe('/api/v1/events?topics=question%3Aq1');
    expect(invalidate).not.toHaveBeenCalled();
    source.emit('open');
    expect(invalidate).toHaveBeenCalledWith('question:q1');
    invalidate.mockClear();
    source.emit('open'); // reconnexion automatique du navigateur
    expect(invalidate).toHaveBeenCalledWith('question:q1');
    stop();
  });
});
