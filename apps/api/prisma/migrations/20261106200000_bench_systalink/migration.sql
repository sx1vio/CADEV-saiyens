-- Banc d'essai : l'application testée est-elle hébergée chez Systalink (adresse IP vérifiée) ?
ALTER TABLE "bench_requests" ADD COLUMN "hosted_on_systalink" BOOLEAN NOT NULL DEFAULT false;
