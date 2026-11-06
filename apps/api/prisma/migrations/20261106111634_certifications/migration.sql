-- CreateEnum
CREATE TYPE "CertAttemptMode" AS ENUM ('exam', 'mock');

-- CreateTable
CREATE TABLE "cert_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cert_id" TEXT NOT NULL,
    "mode" "CertAttemptMode" NOT NULL,
    "questions" JSONB NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMPTZ NOT NULL,
    "submitted_at" TIMESTAMPTZ,
    "answers" JSONB,
    "score" INTEGER,
    "passed" BOOLEAN,

    CONSTRAINT "cert_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cert_id" TEXT NOT NULL,
    "best_score" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "passed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cert_attempts_user_id_cert_id_started_at_idx" ON "cert_attempts"("user_id", "cert_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_id_cert_id_key" ON "certificates"("user_id", "cert_id");

-- AddForeignKey
ALTER TABLE "cert_attempts" ADD CONSTRAINT "cert_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
