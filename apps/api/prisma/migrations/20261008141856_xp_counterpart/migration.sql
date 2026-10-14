-- AlterTable
ALTER TABLE "xp_events" ADD COLUMN     "counterpart_id" UUID;

-- CreateIndex
CREATE INDEX "xp_events_user_id_counterpart_id_kind_created_at_idx" ON "xp_events"("user_id", "counterpart_id", "kind", "created_at");

-- La protection append-only couvre aussi la nouvelle colonne : seule reverted_at reste modifiable.
CREATE OR REPLACE FUNCTION "xp_events_guard"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'xp_events est append-only';
  END IF;
  IF (NEW."user_id", NEW."kind", NEW."points", NEW."tag_id", NEW."source_type", NEW."source_id", NEW."counterpart_id", NEW."reverts_id", NEW."created_at")
     IS DISTINCT FROM
     (OLD."user_id", OLD."kind", OLD."points", OLD."tag_id", OLD."source_type", OLD."source_id", OLD."counterpart_id", OLD."reverts_id", OLD."created_at") THEN
    RAISE EXCEPTION 'xp_events : seule la colonne reverted_at est modifiable';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
