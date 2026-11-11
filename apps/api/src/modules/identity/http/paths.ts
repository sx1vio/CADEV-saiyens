/** Routes de l'espace d'administration (apps/admin). */
export const isAdminPath = (path: string): boolean =>
  path === '/api/v1/admin' || path.startsWith('/api/v1/admin/');

/** Routes du portail entreprise (apps/business). */
export const isBusinessPath = (path: string): boolean =>
  path === '/api/v1/business' || path.startsWith('/api/v1/business/');
