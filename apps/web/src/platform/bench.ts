import type {
  BenchDetail,
  BenchDevice,
  BenchNetwork,
  BenchSeverity,
  CreateBenchReport,
  ListBenchResponse,
  ReviewBenchReportResponse,
} from '@devhub/contracts';
import { apiCall } from '@/lib/api-call';

/* Banc d'essai : client de l'API, libellés et export Markdown pour l'agent IA. */

const call = <T>(method: 'GET' | 'POST', path: string, body?: unknown) =>
  apiCall<T>(method, `/bench${path}`, body);

export const benchApi = {
  list: (q: URLSearchParams) =>
    call<ListBenchResponse>('GET', q.toString() ? `?${q.toString()}` : ''),
  detail: (id: string) => call<BenchDetail>('GET', `/${id}`),
  create: (body: unknown) => call<{ id: string }>('POST', '', body),
  report: (id: string, body: CreateBenchReport) =>
    call<{ id: string }>('POST', `/${id}/reports`, body),
  review: (reportId: string, decision: 'confirm' | 'reject') =>
    call<ReviewBenchReportResponse>('POST', `/reports/${reportId}/review`, { decision }),
  setOpen: (id: string, open: boolean) => call<void>('POST', `/${id}/${open ? 'reopen' : 'close'}`),
};

export const DEVICE_LABEL: Record<BenchDevice, string> = {
  android_low: 'Android d’entrée de gamme',
  android: 'Android',
  iphone: 'iPhone',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
};
export const NETWORK_LABEL: Record<BenchNetwork, string> = {
  '2g': '2G',
  '3g': '3G',
  '4g': '4G',
  wifi: 'Wi-Fi',
  offline: 'Hors ligne',
};

const SEVERITY_LABEL: Record<BenchSeverity, string> = {
  blocking: 'Bloquant',
  major: 'Important',
  minor: 'Mineur',
};

/** Problèmes de tous les rapports retenus, au format Markdown pour Claude Code, Codex ou Cursor. */
export function benchMarkdown(detail: BenchDetail): string {
  const lines = [
    `# Banc d’essai : ${detail.title}`,
    '',
    `Application : ${detail.appUrl}`,
    'Rapports de tests réels sur appareils et réseaux. Corrige les problèmes du plus grave au moins grave ; pour chacun, explique la cause avant de modifier le code.',
    '',
  ];
  const order: BenchSeverity[] = ['blocking', 'major', 'minor'];
  const reports = detail.reports.filter((r) => r.status !== 'rejected');
  for (const severity of order) {
    const found = reports.flatMap((r) =>
      r.findings.filter((f) => f.severity === severity).map((f) => ({ r, f })),
    );
    if (found.length === 0) continue;
    lines.push(`## ${SEVERITY_LABEL[severity]}`, '');
    for (const { r, f } of found) {
      lines.push(
        `- **${f.title}** (${r.model}, ${r.os}, ${r.browser}, réseau ${NETWORK_LABEL[r.network]})`,
      );
      if (f.details) lines.push(...f.details.split('\n').map((l) => `  ${l}`));
    }
    lines.push('');
  }
  const notes = reports.filter((r) => r.notes);
  if (notes.length) {
    lines.push('## Remarques des testeurs', '');
    for (const r of notes) lines.push(`- ${r.model} (${NETWORK_LABEL[r.network]}) : ${r.notes}`);
  }
  return lines.join('\n').trim() + '\n';
}
