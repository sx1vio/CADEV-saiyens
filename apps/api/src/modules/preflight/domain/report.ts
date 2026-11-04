import type {
  PreflightCheck,
  PreflightReport,
  PreflightStatus,
  PreflightVerdict,
} from '@devhub/contracts';
import { formatBytes, formatMs } from './network';

export function countChecks(checks: PreflightCheck[]): Record<PreflightStatus, number> {
  const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
  for (const c of checks) counts[c.status]++;
  return counts;
}

/** Score sur 100 : un contrôle réussi vaut 1, un avertissement 0,5, un échec 0. Les infos ne comptent pas. */
export function scoreOf(checks: PreflightCheck[]): number {
  const { pass, warn, fail } = countChecks(checks);
  const n = pass + warn + fail;
  return n === 0 ? 100 : Math.round((100 * (pass + warn / 2)) / n);
}

export function verdictOf(checks: PreflightCheck[]): PreflightVerdict {
  const { warn, fail } = countChecks(checks);
  return fail ? 'fix' : warn ? 'review' : 'ready';
}

/** Ordre de lecture : ce qui bloque d'abord, la sécurité avant le reste. */
const STATUS_ORDER: Record<PreflightStatus, number> = { fail: 0, warn: 1, info: 2, pass: 3 };
const CATEGORY_ORDER = ['security', 'dependencies', 'network', 'licences', 'hosting'];

export function sortChecks(checks: PreflightCheck[]): PreflightCheck[] {
  return [...checks].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
}

const VERDICT_LABEL: Record<PreflightVerdict, string> = {
  ready: 'Prêt pour la production',
  review: 'À améliorer avant le lancement',
  fix: 'À corriger avant le lancement',
};

const CATEGORY_LABEL: Record<string, string> = {
  security: 'Sécurité',
  dependencies: 'Dépendances',
  network: 'Réseau lent et téléphones',
  licences: 'Licences',
  hosting: 'Hébergement',
};

function block(c: PreflightCheck): string {
  const lines = [
    `### \`${c.id}\` · ${c.title}`,
    '',
    `*${CATEGORY_LABEL[c.category]}.* ${c.detail}`,
  ];
  if (c.evidence.length) lines.push('', ...c.evidence.map((e) => `- ${e}`));
  if (c.fix) {
    lines.push('', '**Correction :**', '');
    lines.push(c.fix.includes('\n') ? '```\n' + c.fix + '\n```' : c.fix);
  }
  return lines.join('\n');
}

/**
 * Rapport Markdown destiné à l'agent de codage du développeur (Claude Code, Codex, Cursor…) :
 * consigne en tête, corrections dans l'ordre, identifiants stables pour s'y référer.
 */
export function toMarkdown(report: PreflightReport, links: { page: string; json: string }): string {
  const target = [report.url, report.repo && `github.com/${report.repo}`]
    .filter(Boolean)
    .join(' · ');
  const fail = report.checks.filter((c) => c.status === 'fail');
  const warn = report.checks.filter((c) => c.status === 'warn');
  const info = report.checks.filter((c) => c.status === 'info');
  const pass = report.checks.filter((c) => c.status === 'pass');

  const out: string[] = [
    `# Rapport de pré-vol DevHub : ${target}`,
    '',
    `**${VERDICT_LABEL[report.verdict]}** · score ${report.score}/100 · ${report.counts.fail} à corriger, ${report.counts.warn} à améliorer, ${report.counts.pass} OK · ${report.createdAt.slice(0, 16).replace('T', ' ')} UTC`,
    '',
    `Rapport en ligne : ${links.page} · JSON : ${links.json}`,
    '',
    '## Consigne pour l’agent IA',
    '',
    'Tu es l’agent de codage de l’auteur de ce projet. Applique les corrections ci-dessous dans l’ordre : d’abord « À corriger », puis « À améliorer ».',
    '- Ne touche pas aux points marqués OK.',
    '- Pour un secret exposé, la correction du code ne suffit pas : demande à l’auteur de révoquer la clé chez le fournisseur.',
    '- Explique chaque changement en une phrase et cite l’identifiant du contrôle (ex. `net.compression`).',
    '- Une fois le code redéployé, demande à l’auteur de relancer le pré-vol pour confirmer.',
  ];

  if (fail.length) out.push('', `## À corriger (${fail.length})`, '', fail.map(block).join('\n\n'));
  if (warn.length)
    out.push('', `## À améliorer (${warn.length})`, '', warn.map(block).join('\n\n'));
  if (info.length)
    out.push(
      '',
      '## Pour information',
      '',
      ...info.map((c) => `- \`${c.id}\` · ${c.title}. ${c.detail}`),
    );
  if (pass.length) out.push('', '## OK', '', ...pass.map((c) => `- \`${c.id}\` · ${c.title}`));

  if (report.metrics) {
    const m = report.metrics;
    out.push(
      '',
      '## Mesures',
      '',
      '| Mesure | Valeur |',
      '| --- | --- |',
      `| Adresse finale | ${m.finalUrl} (HTTP ${m.status}) |`,
      `| Réponse du serveur | ${formatMs(m.ttfbMs)} |`,
      `| Premier affichage estimé en 3G | ${formatMs(m.estimated3gMs)} |`,
      `| Poids total / critique | ${formatBytes(m.totalBytes)} / ${formatBytes(m.criticalBytes)} |`,
      `| Requêtes | ${m.requests} |`,
      `| Hébergement | ${m.hostedOnSystalink ? 'Systalink' : 'hors Systalink'} (${m.hostIps.join(', ')}) |`,
    );
  }
  if (report.repoSummary) {
    const r = report.repoSummary;
    out.push(
      '',
      '## Dépôt',
      '',
      `github.com/${r.fullName} (branche ${r.defaultBranch}) · licence ${r.licence ?? 'aucune'} · ${r.dependencies} dépendances (${r.ecosystems.join(', ') || 'aucun écosystème reconnu'}) · ${r.vulnerablePackages} avec des failles connues`,
    );
  }
  out.push(
    '',
    '---',
    '',
    'Généré par le pré-vol DevHub Africa. L’estimation 3G est un calcul (profil « 3G rapide » de Chrome), pas une mesure sur un vrai téléphone.',
    '',
  );
  return out.join('\n');
}
