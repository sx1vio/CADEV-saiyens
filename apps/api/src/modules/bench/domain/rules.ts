import type { BenchDevice, BenchNetwork, BenchVerdict } from '@devhub/contracts';

/** Demandes ouvertes en même temps, au plus, par personne. */
export const OPEN_REQUESTS_PER_USER = 3;
/** Rapports rendus par jour glissant, au plus, par testeur. */
export const REPORTS_PER_DAY = 10;
/** Un compte de moins d'une heure ne publie pas de demande (liens vers des sites externes). */
export const NEW_ACCOUNT_DELAY_MS = 60 * 60 * 1000;

export class BenchError extends Error {
  constructor(
    readonly code:
      | 'bench.own_request'
      | 'bench.closed'
      | 'bench.full'
      | 'bench.already_reported'
      | 'bench.device_not_requested'
      | 'bench.network_not_requested'
      | 'bench.not_requester'
      | 'bench.already_reviewed',
  ) {
    super(code);
  }
}

export interface RequestState {
  authorId: string;
  status: 'open' | 'closed';
  maxTesters: number;
  devices: string[];
  networks: string[];
}

/**
 * Un testeur peut rendre un rapport si la demande est ouverte, s'il n'en est pas l'auteur, s'il
 * reste une place (les rapports refusés libèrent la leur) et si son appareil et son réseau font
 * partie de ceux demandés.
 */
export function assertCanReport(
  request: RequestState,
  input: {
    testerId: string;
    device: BenchDevice;
    network: BenchNetwork;
    activeReports: number;
    alreadyReported: boolean;
  },
): void {
  if (request.authorId === input.testerId) throw new BenchError('bench.own_request');
  if (request.status !== 'open') throw new BenchError('bench.closed');
  if (input.alreadyReported) throw new BenchError('bench.already_reported');
  if (input.activeReports >= request.maxTesters) throw new BenchError('bench.full');
  if (!request.devices.includes(input.device)) throw new BenchError('bench.device_not_requested');
  if (!request.networks.includes(input.network))
    throw new BenchError('bench.network_not_requested');
}

export function assertCanReview(
  request: { authorId: string },
  report: { status: string },
  actorId: string,
): void {
  if (request.authorId !== actorId) throw new BenchError('bench.not_requester');
  if (report.status !== 'submitted') throw new BenchError('bench.already_reviewed');
}

const SEVERITY: Record<BenchVerdict, number> = { works: 0, issues: 1, broken: 2 };

/** Couverture appareil × réseau, avec le pire verdict reçu ; les rapports refusés ne comptent pas. */
export function coverage(
  reports: Array<{ device: string; network: string; verdict: BenchVerdict; status: string }>,
): Array<{ device: BenchDevice; network: BenchNetwork; reports: number; worst: BenchVerdict }> {
  const cells = new Map<
    string,
    { device: BenchDevice; network: BenchNetwork; reports: number; worst: BenchVerdict }
  >();
  for (const r of reports) {
    if (r.status === 'rejected') continue;
    const key = `${r.device}|${r.network}`;
    const cell = cells.get(key);
    if (!cell) {
      cells.set(key, {
        device: r.device as BenchDevice,
        network: r.network as BenchNetwork,
        reports: 1,
        worst: r.verdict,
      });
    } else {
      cell.reports += 1;
      if (SEVERITY[r.verdict] > SEVERITY[cell.worst]) cell.worst = r.verdict;
    }
  }
  return [...cells.values()];
}
