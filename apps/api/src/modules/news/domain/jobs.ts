/** Une offre est retenue si une personne en Afrique peut y postuler. */
const AFRICA_OK =
  /worldwide|anywhere|global|everywhere|\bafrica\b|\bemea\b|nigeria|kenya|ghana|egypt|morocco|south africa|senegal|rwanda|tunisia|ivory coast|c[ôo]te d.ivoire|benin|togo|cameroon|ethiopia|uganda|tanzania|lagos|nairobi|cape town|johannesburg|cairo|accra|kigali|casablanca|dakar|abidjan|tunis/i;

/** « Remote » seul, sans région : ouvert partout. « Remote - US » ne l'est pas. */
const OPEN_REMOTE = /^\s*(remote|distributed)\s*$/i;

export const opensToAfrica = (location: string): boolean =>
  AFRICA_OK.test(location) || OPEN_REMOTE.test(location);

/** Métiers du numérique : les grandes entreprises publient aussi des postes commerciaux ou juridiques. */
const TECH_ROLE =
  /engineer|developer|devops|\bsre\b|software|back-?end|front-?end|full[- ]?stack|data (scientist|engineer|analyst)|machine learning|\bml\b|\bai\b|security|\bqa\b|mobile|android|\bios\b|cloud|platform|architect|programmer|\bit\b|product designer/i;

export const isTechRole = (title: string): boolean => TECH_ROLE.test(title);
