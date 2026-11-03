-- Administration complète : rôles d'admin, suspension des comptes, annonces du site.

ALTER TABLE "users" ADD COLUMN "admin_role" TEXT;
ALTER TABLE "users" ADD COLUMN "suspended_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "suspension_reason" TEXT;
-- Les administrateurs créés par la CLI avant les rôles sont super-admins.
UPDATE "users" SET "admin_role" = 'super' WHERE "is_admin" = true;

CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "link_url" TEXT,
    "link_label" TEXT,
    "starts_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "announcements_active_starts_at_idx" ON "announcements"("active", "starts_at");
