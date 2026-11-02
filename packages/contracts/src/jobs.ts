import { z } from 'zod';

// Offres d'emploi publiées par l'administration de DevHub. Chaque offre renvoie vers sa source
// officielle (page carrière de l'entreprise) : pas d'offre inventée, pas de candidature captée.

export const JobContract = z.enum(['cdi', 'cdd', 'freelance', 'stage', 'alternance']);
export type JobContract = z.infer<typeof JobContract>;
export const JobWorkMode = z.enum(['remote', 'hybrid', 'onsite']);
export type JobWorkMode = z.infer<typeof JobWorkMode>;
export const JobSeniority = z.enum(['junior', 'confirme', 'senior', 'lead']);
export type JobSeniority = z.infer<typeof JobSeniority>;
export const JobStatus = z.enum(['draft', 'published', 'archived']);
export type JobStatus = z.infer<typeof JobStatus>;

const HttpsUrl = z.url({ protocol: /^https$/ }).max(500);
/** Lien de candidature : page https de l'entreprise, ou adresse e-mail (mailto:). */
const ApplyTarget = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https:\/\/\S+$/i.test(v) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(v), {
    message: 'Lien https:// ou adresse mailto:',
  });

/** POST /api/v1/admin/jobs et PUT /api/v1/admin/jobs/:id */
export const JobOfferInput = z.object({
  title: z.string().trim().min(3).max(140),
  company: z.string().trim().min(2).max(100),
  companyUrl: HttpsUrl.nullable().default(null),
  location: z.string().trim().min(2).max(120),
  /** ISO 3166-1 alpha-2 ; null pour une offre à distance ouverte à plusieurs pays */
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .default(null),
  workMode: JobWorkMode,
  contract: JobContract,
  seniority: JobSeniority,
  salary: z.string().trim().max(120).nullable().default(null),
  description: z.string().trim().min(40).max(8000),
  applyUrl: ApplyTarget,
  /** Page officielle où l'offre a été publiée : la preuve qu'elle existe */
  sourceUrl: HttpsUrl,
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  expiresAt: z.iso.datetime().nullable().default(null),
  status: JobStatus.default('draft'),
});
export type JobOfferInput = z.infer<typeof JobOfferInput>;

/** Offre telle que l'administration la voit (brouillons et archives compris). */
export const AdminJobView = JobOfferInput.extend({
  id: z.uuid(),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AdminJobView = z.infer<typeof AdminJobView>;

export const AdminJobsResponse = z.object({ data: z.array(AdminJobView) });
export type AdminJobsResponse = z.infer<typeof AdminJobsResponse>;

/** GET /api/v1/jobs : offres publiées et non expirées, les plus récentes d'abord. */
export const PublicJobView = AdminJobView.omit({ status: true, createdAt: true }).extend({
  publishedAt: z.iso.datetime(),
});
export type PublicJobView = z.infer<typeof PublicJobView>;

export const ListJobsResponse = z.object({ data: z.array(PublicJobView) });
export type ListJobsResponse = z.infer<typeof ListJobsResponse>;
