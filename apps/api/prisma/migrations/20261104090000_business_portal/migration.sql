-- Portail entreprise : entreprises validées par l'administration, comptes recruteurs séparés,
-- offres publiées par les entreprises et candidatures sur DevHub.

ALTER TABLE "job_offers" ALTER COLUMN "apply_url" DROP NOT NULL;
ALTER TABLE "job_offers" ALTER COLUMN "source_url" DROP NOT NULL;
ALTER TABLE "job_offers" ADD COLUMN "company_id" UUID;
CREATE INDEX "job_offers_company_id_idx" ON "job_offers"("company_id");

CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "country" CHAR(2),
    "city" TEXT,
    "sector" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "status_reason" TEXT,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE INDEX "companies_status_idx" ON "companies"("status");

CREATE TABLE "business_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "password_hash" TEXT NOT NULL,
    "last_login_at" TIMESTAMPTZ,
    "disabled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_accounts_email_key" ON "business_accounts"("email");
CREATE INDEX "business_accounts_company_id_idx" ON "business_accounts"("company_id");

CREATE TABLE "business_sessions" (
    "id" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "business_sessions_account_id_idx" ON "business_sessions"("account_id");

CREATE TABLE "job_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_applications_job_id_user_id_key" ON "job_applications"("job_id", "user_id");
CREATE INDEX "job_applications_user_id_idx" ON "job_applications"("user_id");

ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_sessions" ADD CONSTRAINT "business_sessions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "business_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
