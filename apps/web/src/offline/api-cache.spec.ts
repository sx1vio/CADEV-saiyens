import { describe, expect, it } from 'vitest';
import { API_READ_PATTERN } from './api-cache';

const origin = 'https://devhub.africa';

describe('lectures gardées hors ligne (O1)', () => {
  it('garde les contenus que l’on rouvre', () => {
    for (const path of [
      '/api/v1/questions?status=open&limit=50',
      '/api/v1/questions/8f0c2b1e-0000-4000-8000-000000000000',
      '/api/v1/rooms/k7m2q9xa',
      '/api/v1/rooms/8f0c2b1e-0000-4000-8000-000000000000/tasks',
      '/api/v1/u/awa-kone',
      '/api/v1/u/awa-kone/proofs?limit=50',
      '/api/v1/tags',
      '/api/v1/discover/devs?tag=docker',
      '/api/v1/leaderboard',
      '/api/v1/status',
      '/api/v1/impact',
      '/api/v1/rules/xp',
    ]) {
      expect(API_READ_PATTERN.test(`${origin}${path}`), path).toBe(true);
    }
  });

  it('ne garde jamais la session, la connexion, le temps réel ni l’administration', () => {
    for (const path of [
      '/api/v1/me',
      '/api/v1/me/skills',
      '/api/v1/auth/github',
      '/api/v1/events?topics=question:x',
      '/api/v1/admin/reports',
      '/api/v1/notifications',
      '/api/v1/sync',
      '/api/v1/usersx',
      '/api/v1/questionsx',
      '/questions',
    ]) {
      expect(API_READ_PATTERN.test(`${origin}${path}`), path).toBe(false);
    }
  });
});
