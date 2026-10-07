// Le pseudo (handle) sert d'URL publique du Passport : /u/:handle. Il ne change plus après l'inscription.
const MAX_LENGTH = 39; // longueur maximale d'un login GitHub

export function handleFromLogin(login: string): string {
  const handle = login
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_LENGTH);
  return handle || 'dev';
}

/** Candidats successifs si le pseudo est déjà pris : awa, awa-2, …, awa-9, puis un suffixe aléatoire. */
export function* handleCandidates(base: string, random: () => string): Generator<string> {
  yield base;
  for (let n = 2; n <= 9; n++) yield `${base.slice(0, MAX_LENGTH - 2)}-${n}`;
  for (;;) yield `${base.slice(0, MAX_LENGTH - 5)}-${random()}`;
}
