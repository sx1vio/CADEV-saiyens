import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { toProblem } from './problem-details.filter';

describe('toProblem', () => {
  it('reprend le code métier fourni par l’exception', () => {
    const problem = toProblem(
      new ConflictException({
        code: 'question.already_resolved',
        title: 'Question already resolved',
      }),
      '/api/v1/answers/1/accept',
      'req_1',
    );
    expect(problem).toMatchObject({
      status: 409,
      code: 'question.already_resolved',
      type: 'https://devhub.africa/errors/question.already_resolved',
      instance: '/api/v1/answers/1/accept',
      requestId: 'req_1',
    });
  });

  it('déduit un code générique du statut HTTP', () => {
    expect(toProblem(new NotFoundException(), '/x').code).toBe('not_found');
  });

  it('masque les détails des erreurs inattendues', () => {
    const problem = toProblem(new Error('secret interne'), '/x');
    expect(problem.status).toBe(500);
    expect(problem.title).not.toContain('secret');
  });

  it('donne le même titre à une route inconnue qu’à une route masquée (SEC-01)', () => {
    const unknown = toProblem(
      new NotFoundException('Cannot GET /api/v1/admin/nope'),
      '/api/v1/admin/nope',
    );
    const hidden = toProblem(
      new NotFoundException({ code: 'not_found', title: 'Not found' }),
      '/api/v1/admin/users',
    );
    expect(unknown.title).toBe('Not found');
    expect(unknown.title).toBe(hidden.title);
    expect(unknown.code).toBe(hidden.code);
  });
});
