-- Espace d'administration séparé (double facteur) et offres d'emploi tenues par l'administration.

ALTER TABLE "users" ADD COLUMN "admin_totp_secret" BYTEA;

CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_sessions_user_id_idx" ON "admin_sessions"("user_id");
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "company_url" TEXT,
    "location" TEXT NOT NULL,
    "country" CHAR(2),
    "work_mode" TEXT NOT NULL,
    "contract" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "salary" TEXT,
    "description" TEXT NOT NULL,
    "apply_url" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expires_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "job_offers_status_published_at_idx" ON "job_offers"("status", "published_at");
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
