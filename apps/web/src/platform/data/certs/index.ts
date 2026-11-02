import type { MarketCert, PlatformCert } from '../../types';
import { JS, PYTHON, WEB } from './devhub-1';
import { GIT, REACT, SQL } from './devhub-2';
import { DOCKER, IA, SECURITE } from './devhub-3';
import { CHECKED_AT, OFFICIAL_CERTS } from './official';

/** Certifications DevHub : gratuites, examen chronométré en ligne, badge sur le Passport. */
export const PLATFORM_CERTS: PlatformCert[] = [
  WEB,
  JS,
  PYTHON,
  GIT,
  SQL,
  REACT,
  SECURITE,
  DOCKER,
  IA,
];

/** Certifications officielles des éditeurs (fiches vérifiées, liens officiels). */
export const MARKET_CERTS: MarketCert[] = OFFICIAL_CERTS;
export { CHECKED_AT };

export const LEVEL_LABEL = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
  expert: 'Expert',
} as const;
