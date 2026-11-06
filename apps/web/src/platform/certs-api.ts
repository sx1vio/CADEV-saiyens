import type {
  CertAttemptMode,
  CertAttemptResult,
  CertAttemptView,
  CertCheckResponse,
  CertPracticeResponse,
  MyCertificationsResponse,
  UserCertificatesResponse,
  VerifyCertificateResponse,
} from '@devhub/contracts';
import { apiCall } from '@/lib/api-call';

/** Certifications DevHub : l'API tire les questions, chronomètre et corrige. */
export const certsApi = {
  mine: () => apiCall<MyCertificationsResponse>('GET', '/certifications/me'),
  start: (certId: string, mode: CertAttemptMode) =>
    apiCall<CertAttemptView>('POST', `/certifications/${certId}/attempts`, { mode }),
  submit: (attemptId: string, answers: Array<number | null>) =>
    apiCall<CertAttemptResult>('POST', `/certifications/attempts/${attemptId}/submit`, {
      answers,
    }),
  practice: (certId: string, q: { topic?: number; ids?: string[]; count?: number }) => {
    const p = new URLSearchParams();
    if (q.topic !== undefined) p.set('topic', String(q.topic));
    if (q.ids?.length) p.set('ids', q.ids.join(','));
    if (q.count) p.set('count', String(q.count));
    return apiCall<CertPracticeResponse>('GET', `/certifications/${certId}/practice?${p}`);
  },
  check: (certId: string, id: string, choice: number) =>
    apiCall<CertCheckResponse>('POST', `/certifications/${certId}/check`, { id, choice }),
  ofUser: (handle: string) =>
    apiCall<UserCertificatesResponse>('GET', `/u/${encodeURIComponent(handle)}/certificates`),
  verify: (code: string) =>
    apiCall<VerifyCertificateResponse>(
      'GET',
      `/certifications/verify/${encodeURIComponent(code.trim().toUpperCase())}`,
    ),
};

export type MyCert = MyCertificationsResponse['items'][number];
