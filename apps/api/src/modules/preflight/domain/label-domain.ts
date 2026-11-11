/** Domaine du label « DevHub Ready » d'une adresse : hôte HTTPS en minuscules, port compris. */
export function labelDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.host.toLowerCase() : null;
  } catch {
    return null;
  }
}
