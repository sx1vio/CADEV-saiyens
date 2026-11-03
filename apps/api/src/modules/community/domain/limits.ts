/** Limites anti-spam du fil, sur 24 heures glissantes et par compte. */
export const POSTS_PER_DAY = 10;
export const COMMENTS_PER_DAY = 100;
/** Un compte créé il y a moins d'une heure ne publie pas encore de lien (PR11, confiance). */
export const NEW_ACCOUNT_LINK_DELAY_MS = 60 * 60 * 1000;

/** Fenêtre du tri « populaires » : les publications des 30 derniers jours. */
export const TOP_WINDOW_DAYS = 30;
