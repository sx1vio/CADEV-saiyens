-- AlterEnum
ALTER TYPE "XpKind" ADD VALUE 'deployment_verified';

-- CreateTable
CREATE TABLE "room_deployments" (
    "room_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "hosted_on_systalink" BOOLEAN NOT NULL DEFAULT false,
    "host_ip" TEXT,
    "last_check_at" TIMESTAMPTZ,
    "last_up" BOOLEAN,
    "last_latency_ms" INTEGER,
    "checks_total" INTEGER NOT NULL DEFAULT 0,
    "checks_up" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_deployments_pkey" PRIMARY KEY ("room_id")
);

-- CreateIndex
CREATE INDEX "room_deployments_verified_at_idx" ON "room_deployments"("verified_at");

-- AddForeignKey
ALTER TABLE "room_deployments" ADD CONSTRAINT "room_deployments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
