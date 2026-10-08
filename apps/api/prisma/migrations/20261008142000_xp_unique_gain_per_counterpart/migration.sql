-- Un gain d'XP est unique par utilisateur, type, source, étiquette ET contrepartie :
-- plusieurs votants peuvent faire gagner des XP sur la même réponse (X2), une seule fois chacun.
-- NULLS NOT DISTINCT (PostgreSQL 15+) : une étiquette ou une contrepartie absente compte comme une valeur.
-- Les événements d'annulation (revert) ne sont pas contraints.
DROP INDEX "xp_events_user_id_kind_source_type_source_id_tag_id_key";

CREATE UNIQUE INDEX "xp_events_unique_gain"
  ON "xp_events" ("user_id", "kind", "source_type", "source_id", "tag_id", "counterpart_id") NULLS NOT DISTINCT
  WHERE "kind" <> 'revert';
