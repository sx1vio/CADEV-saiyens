-- CreateEnum
CREATE TYPE "BenchStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "BenchVerdict" AS ENUM ('works', 'issues', 'broken');

-- CreateEnum
CREATE TYPE "BenchReportStatus" AS ENUM ('submitted', 'confirmed', 'rejected');

-- AlterEnum
ALTER TYPE "XpKind" ADD VALUE 'field_test_confirmed';

-- CreateTable
CREATE TABLE "bench_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "app_url" TEXT NOT NULL,
    "repo_url" TEXT,
    "instructions" TEXT NOT NULL,
    "devices" TEXT[],
    "networks" TEXT[],
    "max_testers" INTEGER NOT NULL DEFAULT 5,
    "status" "BenchStatus" NOT NULL DEFAULT 'open',
    "hidden_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "bench_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bench_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "tester_id" UUID NOT NULL,
    "device" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "country" TEXT,
    "verdict" "BenchVerdict" NOT NULL,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "BenchReportStatus" NOT NULL DEFAULT 'submitted',
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bench_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bench_requests_status_created_at_idx" ON "bench_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bench_requests_author_id_created_at_idx" ON "bench_requests"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bench_reports_tester_id_created_at_idx" ON "bench_reports"("tester_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "bench_reports_request_id_tester_id_key" ON "bench_reports"("request_id", "tester_id");

-- AddForeignKey
ALTER TABLE "bench_requests" ADD CONSTRAINT "bench_requests_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bench_reports" ADD CONSTRAINT "bench_reports_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "bench_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bench_reports" ADD CONSTRAINT "bench_reports_tester_id_fkey" FOREIGN KEY ("tester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
