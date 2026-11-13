-- Fil façon LinkedIn (12/11/2026) : photos dans les publications.
ALTER TABLE "posts" ADD COLUMN "images" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "post_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "media_owner_id_created_at_idx" ON "media"("owner_id", "created_at");
CREATE INDEX "media_post_id_idx" ON "media"("post_id");
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
