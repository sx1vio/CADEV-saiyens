-- Pré-vol : rapports de vérification d'une application en ligne et de son dépôt.

CREATE TABLE "preflight_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "url" TEXT,
    "repo" TEXT,
    "score" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preflight_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "preflight_reports_user_id_created_at_idx" ON "preflight_reports"("user_id", "created_at");
CREATE INDEX "preflight_reports_created_at_idx" ON "preflight_reports"("created_at");
ALTER TABLE "preflight_reports" ADD CONSTRAINT "preflight_reports_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
