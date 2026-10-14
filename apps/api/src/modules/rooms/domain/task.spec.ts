import { describe, expect, it } from 'vitest';
import { NotRoomManagerError } from './room';
import {
  NotRoomMemberError,
  NotTaskAssigneeError,
  TaskAlreadyTakenError,
  TaskInvalidStatusError,
  TaskPrInvalidError,
  type TaskState,
  assertCanComplete,
  assertCanSubmit,
  assertPrInRepo,
  decideTake,
  verificationOf,
} from './task';

const task = (over: Partial<TaskState> = {}): TaskState => ({
  id: 't1',
  roomId: 'r1',
  status: 'open',
  assigneeId: null,
  prUrl: null,
  ...over,
});

describe('tâches (R2, R8, R9)', () => {
  it('prendre : membre seulement, une seule fois', () => {
    expect(decideTake(task(), 'moussa', 'member')).toBe('take');
    expect(decideTake(task({ status: 'taken', assigneeId: 'moussa' }), 'moussa', 'member')).toBe(
      'already_mine',
    );
    expect(() => decideTake(task(), 'kwame', null)).toThrow(NotRoomMemberError);
    expect(() =>
      decideTake(task({ status: 'taken', assigneeId: 'moussa' }), 'aida', 'member'),
    ).toThrow(TaskAlreadyTakenError);
  });

  it('la PR doit appartenir au dépôt de la salle (casse ignorée)', () => {
    expect(() =>
      assertPrInRepo({ fullName: 'Awa/Paylink', number: 1 }, 'awa/paylink'),
    ).not.toThrow();
    expect(() => assertPrInRepo({ fullName: 'other/repo', number: 1 }, 'awa/paylink')).toThrow(
      TaskPrInvalidError,
    );
    expect(() => assertPrInRepo(null, 'awa/paylink')).toThrow(TaskPrInvalidError);
    expect(() => assertPrInRepo({ fullName: 'awa/paylink', number: 1 }, null)).toThrow(
      TaskPrInvalidError,
    );
  });

  it('soumettre : l’assigné, tâche prise ou en revue', () => {
    expect(() => assertCanSubmit(task({ status: 'taken', assigneeId: 'm' }), 'm')).not.toThrow();
    expect(() => assertCanSubmit(task({ status: 'taken', assigneeId: 'm' }), 'x')).toThrow(
      NotTaskAssigneeError,
    );
    expect(() => assertCanSubmit(task({ status: 'done', assigneeId: 'm' }), 'm')).toThrow(
      TaskInvalidStatusError,
    );
  });

  it('clôturer : le créateur, une tâche prise ou en revue', () => {
    expect(() =>
      assertCanComplete(task({ status: 'in_review', assigneeId: 'm' }), 'owner'),
    ).not.toThrow();
    expect(() => assertCanComplete(task({ status: 'taken', assigneeId: 'm' }), 'member')).toThrow(
      NotRoomManagerError,
    );
    expect(() => assertCanComplete(task({ status: 'taken', assigneeId: 'm' }), null)).toThrow(
      NotRoomMemberError,
    );
    expect(() => assertCanComplete(task(), 'owner')).toThrow(TaskInvalidStatusError);
  });

  it('« Vérifié par GitHub » : PR fusionnée et auteur = assigné ; sinon « déclarée »', () => {
    expect(verificationOf({ merged: true, authorId: 42n }, 42n)).toBe('github_verified');
    expect(verificationOf({ merged: true, authorId: 41n }, 42n)).toBe('declared');
    expect(verificationOf({ merged: false, authorId: 42n }, 42n)).toBe('declared');
    expect(verificationOf({ merged: true, authorId: null }, 42n)).toBe('declared');
    expect(verificationOf(null, 42n)).toBe('declared');
    expect(verificationOf({ merged: true, authorId: 42n }, null)).toBe('declared');
  });
});
