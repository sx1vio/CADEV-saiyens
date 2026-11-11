-- Portée des jetons d'API personnels (11/11/2026) : « preflight » (pré-vol seulement, comme avant)
-- ou « platform » (toute l'API au nom du titulaire, sauf compte, jetons, admin et portail entreprise),
-- pour le serveur MCP de la plateforme. Les jetons existants gardent la portée pré-vol.
ALTER TABLE "api_tokens" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'preflight';
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_scope_check" CHECK ("scope" IN ('preflight', 'platform'));
