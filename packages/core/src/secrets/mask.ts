// Masquage des secrets collés dans une question, une réponse ou un message (§6.1, §9, correctif O9).
// Appliqué côté client avant la mise en file hors ligne, et côté serveur avant tout stockage
// ou envoi à l'IA. Les deux côtés utilisent exactement ces motifs.

export const SECRET_PLACEHOLDER = '[secret masqué]';

interface Rule {
  name: string;
  pattern: RegExp;
  /** Groupe à masquer ; par défaut, toute la correspondance. */
  group?: number;
}

const RULES: Rule[] = [
  {
    name: 'private_key',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  { name: 'aws_access_key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  {
    name: 'github_token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/g,
  },
  { name: 'stripe_key', pattern: /\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { name: 'anthropic_key', pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: 'openai_key', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: 'google_api_key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'slack_token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  // postgres://user:motdepasse@hôte : seul le mot de passe est masqué.
  {
    name: 'connection_string',
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:([^\s@/]+)@/gi,
    group: 1,
  },
  { name: 'bearer', pattern: /\bBearer\s+([A-Za-z0-9._~+/=-]{16,})/g, group: 1 },
  // API_KEY=…, "password": "…", DB_PASSWORD: … (valeur de 6 caractères ou plus).
  // Exclut les appels de fonction (token = getToken()) et les valeurs déjà masquées ([secret masqué]).
  {
    name: 'assignment',
    pattern:
      /\b[A-Za-z0-9_]*(?:SECRET|PASSWORD|PASSWD|PWD|TOKEN|API_?KEY|PRIVATE_?KEY)[A-Za-z0-9_]*["']?\s*[:=]\s*["']?(?![^\s"'`,;]*\()([^\s"'`,;()[\]]{6,})/gi,
    group: 1,
  },
];

export interface MaskResult {
  text: string;
  /** Nombre de secrets masqués (affiché à l'utilisateur : « Nous avons masqué 1 secret »). */
  count: number;
  kinds: string[];
}

export function maskSecrets(input: string): MaskResult {
  let text = input;
  let count = 0;
  const kinds = new Set<string>();
  for (const rule of RULES) {
    text = text.replace(rule.pattern, (match, ...args: unknown[]) => {
      const secret = rule.group ? (args[rule.group - 1] as string) : match;
      count++;
      kinds.add(rule.name);
      return rule.group ? match.replace(secret, SECRET_PLACEHOLDER) : SECRET_PLACEHOLDER;
    });
  }
  return { text, count, kinds: [...kinds] };
}
