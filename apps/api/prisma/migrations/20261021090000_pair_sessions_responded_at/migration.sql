-- S5 : date de la réponse de l'auteur (acceptée ou refusée). Elle sert au délai de 24 h avant
-- qu'un aidant refusé puisse reproposer un créneau sur la même question. Vide pour les lignes
-- antérieures : la date de la proposition sert alors de repli.
ALTER TABLE "pair_sessions" ADD COLUMN "responded_at" TIMESTAMPTZ;
