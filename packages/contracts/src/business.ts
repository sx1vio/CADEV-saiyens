import { z } from 'zod';
import { JobContract, JobSeniority, JobStatus, JobWorkMode, PublicJobView } from './jobs';

// Portail entreprise (apps/business, origine à part) : comptes recruteurs distincts des devs,
// entreprise validée une fois par l'administration, offres et candidatures sur DevHub.

export const CompanyStatus = z.enum(['pending', 'verified', 'rejected', 'suspended']);
export type CompanyStatus = z.infer<typeof CompanyStatus>;
export const CompanySize = z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']);
export type CompanySize = z.infer<typeof CompanySize>;

const HttpsUrl = z.url({ protocol: /^https$/ }).max(300);
const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const Country = z.string().regex(/^[A-Z]{2}$/);

export const CompanyProfileInput = z.object({
  name: z.string().trim().min(2).max(100),
  website: HttpsUrl.nullable().default(null),
  country: Country.nullable().default(null),
  city: z.string().trim().max(80).nullable().default(null),
  sector: z.string().trim().min(2).max(60),
  size: CompanySize,
  about: z.string().trim().max(3000).default(''),
});
export type CompanyProfileInput = z.infer<typeof CompanyProfileInput>;

/** POST /api/v1/business/register */
export const BusinessRegisterRequest = z.object({
  company: CompanyProfileInput,
  account: z.object({
    name: z.string().trim().min(2).max(80),
    email: Email,
    password: z.string().min(10).max(200),
  }),
});
export type BusinessRegisterRequest = z.infer<typeof BusinessRegisterRequest>;

/** POST /api/v1/business/session */
export const BusinessLoginRequest = z.object({
  email: Email,
  password: z.string().min(1).max(200),
});
export type BusinessLoginRequest = z.infer<typeof BusinessLoginRequest>;

export const CompanyView = CompanyProfileInput.extend({
  id: z.uuid(),
  slug: z.string(),
  status: CompanyStatus,
  statusReason: z.string().nullable(),
  verifiedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type CompanyView = z.infer<typeof CompanyView>;

/** GET /api/v1/business/me */
export const BusinessMeView = z.object({
  account: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['owner', 'recruiter']),
  }),
  company: CompanyView,
});
export type BusinessMeView = z.infer<typeof BusinessMeView>;

/** POST et PUT /api/v1/business/jobs : sans lien externe, la candidature se fait sur DevHub. */
export const BusinessJobInput = z.object({
  title: z.string().trim().min(3).max(140),
  location: z.string().trim().min(2).max(120),
  country: Country.nullable().default(null),
  workMode: JobWorkMode,
  contract: JobContract,
  seniority: JobSeniority,
  salary: z.string().trim().max(120).nullable().default(null),
  description: z.string().trim().min(80).max(8000),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  expiresAt: z.iso.datetime().nullable().default(null),
  status: JobStatus.default('draft'),
});
export type BusinessJobInput = z.infer<typeof BusinessJobInput>;

export const BusinessJobView = BusinessJobInput.extend({
  id: z.uuid(),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  applications: z.number().int(),
  newApplications: z.number().int(),
});
export type BusinessJobView = z.infer<typeof BusinessJobView>;

export const ApplicationStatus = z.enum([
  'submitted',
  'seen',
  'interview',
  'rejected',
  'hired',
  'withdrawn',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

/** Ce que l'entreprise voit d'un candidat : son Passport public, rien de privé. */
export const ApplicationView = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  status: ApplicationStatus,
  message: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  candidate: z.object({
    handle: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    country: z.string().nullable(),
    bio: z.string().nullable(),
    githubLinked: z.boolean(),
    proofXp: z.number().int(),
    skills: z.array(z.object({ label: z.string(), score: z.number() })),
  }),
});
export type ApplicationView = z.infer<typeof ApplicationView>;

/** PATCH /api/v1/business/applications/:id (le dev voit le nouveau statut) */
export const ApplicationStatusRequest = z.object({
  status: z.enum(['seen', 'interview', 'rejected', 'hired']),
});
export type ApplicationStatusRequest = z.infer<typeof ApplicationStatusRequest>;

/** POST /api/v1/jobs/:id/apply (connecté) */
export const ApplyRequest = z.object({ message: z.string().trim().min(30).max(3000) });
export type ApplyRequest = z.infer<typeof ApplyRequest>;

/** GET /api/v1/me/applications */
export const MyApplicationView = z.object({
  id: z.uuid(),
  status: ApplicationStatus,
  message: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  job: z.object({ id: z.uuid(), title: z.string(), company: z.string(), location: z.string() }),
});
export type MyApplicationView = z.infer<typeof MyApplicationView>;

/** GET /api/v1/companies/:slug : entreprise validée et ses offres ouvertes. */
export const CompanyPublicView = CompanyProfileInput.extend({
  slug: z.string(),
  verifiedAt: z.iso.datetime(),
  jobs: z.array(PublicJobView),
});
export type CompanyPublicView = z.infer<typeof CompanyPublicView>;

/** Administration : entreprises à valider et à suivre. */
export const AdminCompanyView = CompanyView.extend({
  accounts: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
      role: z.string(),
      lastLoginAt: z.iso.datetime().nullable(),
    }),
  ),
  offers: z.number().int(),
  applications: z.number().int(),
});
export type AdminCompanyView = z.infer<typeof AdminCompanyView>;

/** POST /api/v1/admin/companies/:id/action */
export const AdminCompanyAction = z.object({
  action: z.enum(['verify', 'reject', 'suspend', 'restore']),
  reason: z.string().trim().max(500).default(''),
});
export type AdminCompanyAction = z.infer<typeof AdminCompanyAction>;
