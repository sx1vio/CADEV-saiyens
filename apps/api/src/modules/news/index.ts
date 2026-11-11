// API publique du module news : ce que les autres modules ont le droit d'importer.
export { NewsIngestModule, NewsModule } from './news.module';
export { IngestNews } from './application/ingest-news';
export { NewsJobsModule } from './jobs';
// Administration des contenus (backoffice) : identifiant d'un lien et nettoyage du texte.
export { newsId } from './infrastructure/prisma-news.repository';
export { cleanText, decode } from './domain/text';
