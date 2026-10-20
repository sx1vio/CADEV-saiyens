-- Recherche plein texte dans les réponses (S6) : une question résolue se retrouve aussi par
-- les mots de sa solution. Même configuration « simple » que les questions (FR et EN mêlés).
ALTER TABLE "answers" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce("body", ''))
) STORED;
CREATE INDEX "answers_search_idx" ON "answers" USING GIN ("search");
