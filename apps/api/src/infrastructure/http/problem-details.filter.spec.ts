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
});
