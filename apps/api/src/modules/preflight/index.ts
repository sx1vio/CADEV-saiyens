export { PreflightModule } from './preflight.module';
// Client HTTP anti-SSRF, réutilisé par l'administration pour lire la page d'un lien.
export { SafeFetcher } from './infrastructure/safe-fetch';
