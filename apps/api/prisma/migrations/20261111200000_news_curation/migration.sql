-- Contenus gérés depuis l'administration (11/11/2026) : un contenu retiré (hidden_at) ne
-- s'affiche plus nulle part et la collecte ne le remet pas en ligne ; un contenu ajouté ou
-- modifié par un administrateur (curated_at) n'est plus écrasé par la collecte ni purgé.
ALTER TABLE "news_items" ADD COLUMN "hidden_at" TIMESTAMPTZ;
ALTER TABLE "news_items" ADD COLUMN "curated_at" TIMESTAMPTZ;
CREATE INDEX "news_items_curated_idx" ON "news_items"("curated_at") WHERE "curated_at" IS NOT NULL;
