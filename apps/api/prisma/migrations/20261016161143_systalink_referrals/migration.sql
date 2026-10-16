-- CreateTable
CREATE TABLE "systalink_referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target" VARCHAR(20) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "room_id" UUID,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "systalink_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "systalink_referrals_created_at_idx" ON "systalink_referrals"("created_at");
