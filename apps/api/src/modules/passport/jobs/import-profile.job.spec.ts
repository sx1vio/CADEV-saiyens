import { describe, expect, it } from 'vitest';
import { GithubApiError } from '../../github';
import {
  GithubNotLinkedError,
  type ImportGithubProfile,
} from '../application/import-github-profile';
import { ImportProfileJob } from './import-profile.job';

function jobFailingWith(error: Error): ImportProfileJob {
  const importer = { execute: async () => Promise.reject(error) } as unknown as ImportGithubProfile;
  return new ImportProfileJob({ PROCESS_ROLE: 'http' } as never, {} as never, importer);
}

describe('ImportProfileJob', () => {
  it('abandonne sans réessayer si le jeton GitHub est révoqué', async () => {
    await expect(
      jobFailingWith(new GithubApiError('401', 401)).handle('u1'),
    ).resolves.toBeUndefined();
  });

  it('abandonne sans réessayer si aucun compte GitHub n’est lié', async () => {
    await expect(
      jobFailingWith(new GithubNotLinkedError('aucun')).handle('u1'),
    ).resolves.toBeUndefined();
  });

  it('laisse pg-boss réessayer après un quota épuisé ou une panne', async () => {
    const quota = new GithubApiError('403', 403, new Date(Date.now() + 60_000));
    await expect(jobFailingWith(quota).handle('u1')).rejects.toBe(quota);
    await expect(
      jobFailingWith(new GithubApiError('502', 502)).handle('u1'),
    ).rejects.toBeInstanceOf(GithubApiError);
  });
});
