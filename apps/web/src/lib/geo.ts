/** Pays africains (+ diaspora fréquente) : code ISO, noms, fuseau IANA principal, décalage UTC. */
export interface Country {
  code: string;
  fr: string;
  en: string;
  tz: string;
  utc: number;
}

export const COUNTRIES: Country[] = [
  { code: 'BJ', fr: 'Bénin', en: 'Benin', tz: 'Africa/Porto-Novo', utc: 1 },
  { code: 'BF', fr: 'Burkina Faso', en: 'Burkina Faso', tz: 'Africa/Ouagadougou', utc: 0 },
  { code: 'CM', fr: 'Cameroun', en: 'Cameroon', tz: 'Africa/Douala', utc: 1 },
  { code: 'CI', fr: "Côte d'Ivoire", en: "Côte d'Ivoire", tz: 'Africa/Abidjan', utc: 0 },
  { code: 'CD', fr: 'RD Congo', en: 'DR Congo', tz: 'Africa/Kinshasa', utc: 1 },
  { code: 'CG', fr: 'Congo', en: 'Congo', tz: 'Africa/Brazzaville', utc: 1 },
  { code: 'EG', fr: 'Égypte', en: 'Egypt', tz: 'Africa/Cairo', utc: 3 },
  { code: 'ET', fr: 'Éthiopie', en: 'Ethiopia', tz: 'Africa/Addis_Ababa', utc: 3 },
  { code: 'GA', fr: 'Gabon', en: 'Gabon', tz: 'Africa/Libreville', utc: 1 },
  { code: 'GH', fr: 'Ghana', en: 'Ghana', tz: 'Africa/Accra', utc: 0 },
  { code: 'GN', fr: 'Guinée', en: 'Guinea', tz: 'Africa/Conakry', utc: 0 },
  { code: 'KE', fr: 'Kenya', en: 'Kenya', tz: 'Africa/Nairobi', utc: 3 },
  { code: 'MA', fr: 'Maroc', en: 'Morocco', tz: 'Africa/Casablanca', utc: 1 },
  { code: 'MG', fr: 'Madagascar', en: 'Madagascar', tz: 'Indian/Antananarivo', utc: 3 },
  { code: 'ML', fr: 'Mali', en: 'Mali', tz: 'Africa/Bamako', utc: 0 },
  { code: 'NE', fr: 'Niger', en: 'Niger', tz: 'Africa/Niamey', utc: 1 },
  { code: 'NG', fr: 'Nigeria', en: 'Nigeria', tz: 'Africa/Lagos', utc: 1 },
  { code: 'RW', fr: 'Rwanda', en: 'Rwanda', tz: 'Africa/Kigali', utc: 2 },
  { code: 'SN', fr: 'Sénégal', en: 'Senegal', tz: 'Africa/Dakar', utc: 0 },
  { code: 'TG', fr: 'Togo', en: 'Togo', tz: 'Africa/Lome', utc: 0 },
  { code: 'TN', fr: 'Tunisie', en: 'Tunisia', tz: 'Africa/Tunis', utc: 1 },
  { code: 'TZ', fr: 'Tanzanie', en: 'Tanzania', tz: 'Africa/Dar_es_Salaam', utc: 3 },
  { code: 'UG', fr: 'Ouganda', en: 'Uganda', tz: 'Africa/Kampala', utc: 3 },
  { code: 'ZA', fr: 'Afrique du Sud', en: 'South Africa', tz: 'Africa/Johannesburg', utc: 2 },
  { code: 'DZ', fr: 'Algérie', en: 'Algeria', tz: 'Africa/Algiers', utc: 1 },
  { code: 'FR', fr: 'France (diaspora)', en: 'France (diaspora)', tz: 'Europe/Paris', utc: 2 },
];

export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code);

const regionNames: Partial<Record<'fr' | 'en', Intl.DisplayNames>> = {};

/** Nom du pays : liste locale d'abord, sinon le nom fourni par le navigateur (D4 : 54 pays). */
export function countryName(code: string, lang: 'fr' | 'en' = 'fr') {
  const c = countryByCode(code);
  if (c) return c[lang];
  try {
    regionNames[lang] ??= new Intl.DisplayNames([lang], { type: 'region' });
    return regionNames[lang].of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Décalage UTC courant du navigateur, en heures. */
export function browserUtcOffset() {
  return -new Date().getTimezoneOffset() / 60;
}

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Africa/Abidjan';
  }
}

export function formatUtc(offset: number) {
  if (offset === 0) return 'UTC+0';
  return `UTC${offset > 0 ? '+' : '−'}${Math.abs(offset)}`;
}
