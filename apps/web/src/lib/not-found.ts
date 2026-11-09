/** Ressource absente : code du moteur local (`not-found`) ou de l'API (`not_found`, HTTP 404). */
export const isNotFound = (err: unknown) => {
  const code = (err as { code?: string } | null)?.code;
  return code === 'not-found' || code === 'not_found' || code === 'http.404';
};
