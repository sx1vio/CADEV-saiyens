import { CERT_CATALOG } from '@devhub/core';
import type { MarketCert, PlatformCert } from '../../types';
import { CHECKED_AT, OFFICIAL_CERTS } from './official';

/**
 * Certifications DevHub : gratuites, examen chronométré corrigé par le serveur, badge vérifiable.
 * Le catalogue public vient de @devhub/core ; les questions et réponses restent sur l'API.
 */
export const PLATFORM_CERTS: PlatformCert[] = CERT_CATALOG;

/** Certifications officielles des éditeurs (fiches vérifiées, liens officiels). */
export const MARKET_CERTS: MarketCert[] = OFFICIAL_CERTS;
export { CHECKED_AT };

export const LEVEL_LABEL = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
  expert: 'Expert',
} as const;
