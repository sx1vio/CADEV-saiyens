import { describe, expect, it } from 'vitest';
import {
  ReportAlreadyHandledError,
  TargetNotHideableError,
  decide,
  isHideable,
} from './moderation';

describe('decide (M1)', () => {
  it('masquer ou rejeter un signalement ouvert', () => {
    expect(decide('open', 'hide', 'answer')).toEqual({ reportStatus: 'actioned', hidden: true });
    expect(decide('open', 'dismiss', 'answer')).toEqual({
      reportStatus: 'dismissed',
      hidden: null,
    });
  });

  it('rétablir seulement un contenu masqué par ce signalement', () => {
    expect(decide('actioned', 'restore', 'room')).toEqual({
      reportStatus: 'dismissed',
      hidden: false,
    });
    expect(() => decide('open', 'restore', 'room')).toThrow(ReportAlreadyHandledError);
  });

  it('un signalement traité ne se retraite pas', () => {
    expect(() => decide('actioned', 'hide', 'question')).toThrow(ReportAlreadyHandledError);
    expect(() => decide('dismissed', 'dismiss', 'question')).toThrow(ReportAlreadyHandledError);
  });

  it('un compte se rejette, il ne se masque pas', () => {
    expect(isHideable('user')).toBe(false);
    expect(() => decide('open', 'hide', 'user')).toThrow(TargetNotHideableError);
    expect(decide('open', 'dismiss', 'user').reportStatus).toBe('dismissed');
  });
});
