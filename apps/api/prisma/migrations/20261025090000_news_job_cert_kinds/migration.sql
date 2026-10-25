-- E1 : offres d'emploi et certifications collectées avec les actualités.
ALTER TYPE "NewsKind" ADD VALUE IF NOT EXISTS 'job';
ALTER TYPE "NewsKind" ADD VALUE IF NOT EXISTS 'cert';
