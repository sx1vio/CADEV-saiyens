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

/**
 * Intitulés qui contiennent un mot du numérique (« engineer », « cloud », « developer ») sans être
 * des métiers du logiciel : ingénieries du bâtiment ou de l'industrie, vente, RH, etc.
 */
const NOT_SOFTWARE =
  /\b(structural|civil|mechanical|electrical|chemical|petroleum|process|mining|geotechnical|site (engineer|supervisor|manager)|maintenance|production|biomedical|sales|marketing|account(ant|ing)?|business development|recruit(er|ment)?|talent|hr|human resources|customer|nurse|teacher|driver|procurement|finance|legal|product developer)\b/i;

export const isTechRole = (title: string): boolean =>
  TECH_ROLE.test(title) && !NOT_SOFTWARE.test(title);

/**
 * Filtre strict pour les sites d'emploi généralistes (MyJobMag) : l'intitulé doit nommer un métier
 * du logiciel ou une technologie. « Engineer » seul n'y suffit pas (ingénieurs du bâtiment, etc.).
 */
const SOFTWARE_ROLE =
  /\b(software|developer|devops|sre|site reliability|back-?end|front-?end|full[- ]?stack|data (scientist|engineer|analyst)|machine learning|ml engineer|ai engineer|android|ios|flutter|react|node(\.js)?|python|javascript|typescript|java|golang|php|laravel|\.net|mobile (developer|engineer)|cloud (engineer|architect)|platform engineer|security (engineer|analyst)|qa (engineer|tester)|test automation|programmer|web (developer|designer)|ui\/ux|product designer|database administrator|dba|network engineer|systems? administrator)\b/i;

export const isSoftwareRole = (title: string): boolean =>
  SOFTWARE_ROLE.test(title) && !NOT_SOFTWARE.test(title);

/** Sources généralistes : on y applique le filtre strict. */
export const GENERALIST_JOB_SOURCES = new Set(['myjobmag']);

export const keepJob = (source: string, title: string): boolean =>
  GENERALIST_JOB_SOURCES.has(source) ? isSoftwareRole(title) : isTechRole(title);
