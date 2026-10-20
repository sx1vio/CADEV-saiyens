import { describe, expect, it } from 'vitest';
import { CONTACTS_PER_DAY, contactRetryAfter } from './contact';

const now = new Date('2026-10-19T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe('contactRetryAfter (PR4)', () => {
  it('laisse partir les messages sous la limite quotidienne', () => {
    expect(contactRetryAfter([], now)).toBe(0);
    expect(contactRetryAfter([hoursAgo(1), hoursAgo(2), hoursAgo(3), hoursAgo(4)], now)).toBe(0);
  });

  it('bloque le message de trop jusqu’à ce que le plus ancien sorte de la fenêtre de 24 h', () => {
    const sent = [hoursAgo(20), hoursAgo(4), hoursAgo(3), hoursAgo(2), hoursAgo(1)];
    expect(sent).toHaveLength(CONTACTS_PER_DAY);
    expect(contactRetryAfter(sent, now)).toBe(4 * 3600);
  });

  it('ignore les messages de plus de 24 h', () => {
    const sent = [hoursAgo(30), hoursAgo(25), hoursAgo(4), hoursAgo(3), hoursAgo(2), hoursAgo(1)];
    expect(contactRetryAfter(sent, now)).toBe(0);
  });
});
