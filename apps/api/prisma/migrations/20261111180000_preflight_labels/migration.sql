-- Label « DevHub Ready » (11/11/2026) : une application dont le domaine est prouvé et dont le
-- dernier pré-vol rend un verdict de recette GO reçoit un label public (page, badge SVG pour le
-- README) valable 30 jours, et son auteur 10 Proof XP la première fois.
ALTER TYPE "XpKind" ADD VALUE IF NOT EXISTS 'preflight_ready';

CREATE TABLE "preflight_labels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "recette_score" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL,
    "ready_since" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "preflight_labels_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "preflight_labels_decision_check" CHECK ("decision" IN ('go', 'go_with_reservations', 'no_go'))
);

CREATE UNIQUE INDEX "preflight_labels_domain_key" ON "preflight_labels"("domain");
CREATE INDEX "preflight_labels_user_id_idx" ON "preflight_labels"("user_id");

ALTER TABLE "preflight_labels" ADD CONSTRAINT "preflight_labels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "preflight_labels" ADD CONSTRAINT "preflight_labels_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "preflight_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
