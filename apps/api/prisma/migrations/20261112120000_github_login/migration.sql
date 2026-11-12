-- Login GitHub réel (12/11/2026) : le lien « GitHub » du Passport visait github.com/<pseudo DevHub>,
-- faux pour un compte ouvert par e-mail puis relié à GitHub, ou dont le pseudo a reçu un suffixe.
-- Rempli à la connexion GitHub et à la liaison ; en attendant, le pseudo sert d'approximation
-- pour les comptes déjà reliés (il vient du login GitHub à l'inscription).
ALTER TABLE "users" ADD COLUMN "github_login" CITEXT;
UPDATE "users" SET "github_login" = "handle" WHERE "github_id" IS NOT NULL;
