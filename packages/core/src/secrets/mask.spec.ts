import { describe, expect, it } from 'vitest';
import { SECRET_PLACEHOLDER, maskSecrets } from './mask';

const M = SECRET_PLACEHOLDER;

describe('maskSecrets (O9, §6.1)', () => {
  it.each([
    ['clé AWS', 'key AKIAIOSFODNN7EXAMPLE ok', `key ${M} ok`, 'aws_access_key'],
    ['jeton GitHub classique', `token ghp_${'a'.repeat(36)}`, `token ${M}`, 'github_token'],
    ['jeton GitHub fin', `github_pat_${'A1_'.repeat(10)}`, M, 'github_token'],
    ['clé Stripe', `sk_live_${'x'.repeat(24)}`, M, 'stripe_key'],
    ['clé Anthropic', `sk-ant-api03-${'z'.repeat(30)}`, M, 'anthropic_key'],
    ['clé OpenAI', `sk-proj-${'q'.repeat(30)}`, M, 'openai_key'],
    ['clé Google', `AIza${'b'.repeat(35)}`, M, 'google_api_key'],
    ['jeton Slack', 'xoxb-1234567890-abcdef', M, 'slack_token'],
    ['JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N', M, 'jwt'],
  ])('masque : %s', (_, input, expected, kind) => {
    const result = maskSecrets(input);
    expect(result.text).toBe(expected);
    expect(result.count).toBe(1);
    expect(result.kinds).toEqual([kind]);
  });

  it('masque une clé privée PEM entière', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\nabc\n-----END RSA PRIVATE KEY-----';
    expect(maskSecrets(`avant\n${pem}\naprès`).text).toBe(`avant\n${M}\naprès`);
  });

  it('ne masque que le mot de passe d’une chaîne de connexion', () => {
    expect(maskSecrets('DATABASE=postgres://awa:S3cr3t!x@db:5432/app').text).toBe(
      `DATABASE=postgres://awa:${M}@db:5432/app`,
    );
  });

  it('masque un en-tête Bearer', () => {
    expect(maskSecrets('Authorization: Bearer abcdefghijklmnop1234').text).toBe(
      `Authorization: Bearer ${M}`,
    );
  });

  it.each([
    ['API_KEY=abc123def456', `API_KEY=${M}`],
    ['"password": "hunter22"', `"password": "${M}"`],
    ['DB_PASSWORD: tr0ub4dor', `DB_PASSWORD: ${M}`],
    ["const secretToken = 'q1w2e3r4t5'", `const secretToken = '${M}'`],
  ])('masque une affectation : %s', (input, expected) => {
    expect(maskSecrets(input).text).toBe(expected);
  });

  it('laisse intact un texte sans secret, y compris des valeurs courtes', () => {
    const text = 'ECONNREFUSED 127.0.0.1:5432\npassword: abc\nconst token = getToken();';
    expect(maskSecrets(text)).toEqual({ text, count: 0, kinds: [] });
  });

  it('compte plusieurs secrets et est idempotent', () => {
    const once = maskSecrets(`AKIAIOSFODNN7EXAMPLE et ghp_${'b'.repeat(36)}`);
    expect(once.count).toBe(2);
    const twice = maskSecrets(once.text);
    expect(twice).toEqual({ text: once.text, count: 0, kinds: [] });
  });

  it('ne remasque pas une affectation déjà masquée', () => {
    expect(maskSecrets(`API_KEY=${M}`).count).toBe(0);
  });
});
