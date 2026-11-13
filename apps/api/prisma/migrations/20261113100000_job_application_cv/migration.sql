-- Candidatures complètes (13/11/2026) : CV en PDF, e-mail de contact partagé, liens, mot de l'entreprise.
CREATE TABLE "cv_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cv_files_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cv_files_owner_id_created_at_idx" ON "cv_files"("owner_id", "created_at");
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_applications" ADD COLUMN "contact_email" TEXT;
ALTER TABLE "job_applications" ADD COLUMN "links" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "job_applications" ADD COLUMN "cv_id" UUID;
ALTER TABLE "job_applications" ADD COLUMN "note" TEXT;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cv_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
