import { REPRO_HOSTS as CONTRACT_HOSTS, isReproUrl as contractCheck } from '@devhub/contracts';
import { describe, expect, it } from 'vitest';
import { REPRO_HOSTS, isReproUrl } from './repro';

describe('liens de reproduction (S14)', () => {
  it('même liste de domaines que le contrat de l’API', () => {
    expect([...REPRO_HOSTS]).toEqual([...CONTRACT_HOSTS]);
  });

  it('même verdict que le contrat de l’API', () => {
    for (const url of [
      'https://stackblitz.com/edit/x',
      'https://abc.csb.app/',
      'https://gist.github.com/awa/1',
      'http://codesandbox.io/s/x',
      'https://github.com@evil.example/x',
      'https://github.com:8443/x',
      'https://evil.example.com/',
      'pas un lien',
    ]) {
      expect(isReproUrl(url)).toBe(contractCheck(url));
    }
  });
});
