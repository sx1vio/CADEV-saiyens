-- Compte par e-mail et mot de passe (sans GitHub) : hash scrypt, jamais le mot de passe.
-- Colonne nullable : les comptes GitHub existants n'en ont pas.
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
