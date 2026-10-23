// R7, PR2 : aperçus de partage (ADR-0012). Une SPA ne peut pas donner aux robots de WhatsApp
// ou LinkedIn des balises propres à chaque page : l'API renvoie l'index.html construit, avec les
// balises de la page partagée. Le navigateur charge ensuite la SPA normalement.

export interface ShareMeta {
  title: string;
  description: string;
  /** URL absolue de la page partagée. */
  url: string;
  /** URL absolue de l'image d'aperçu. */
  image: string;
  /** Image 1200 × 630 (Proof Card) : grand aperçu sur X, dimensions annoncées aux robots. */
  largeImage?: boolean;
  type: 'profile' | 'website';
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Texte d'une ligne, au plus `max` caractères (coupé au mot, avec points de suspension). */
export function oneLine(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Retire les balises de partage d'origine et insère celles de la page, avant `</head>`. */
export function renderSharePage(indexHtml: string, meta: ShareMeta): string {
  const stripped = indexHtml
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(
      /<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[\s\S]*?\/?>\s*/gi,
      '',
    );
  const tags = [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description)}" />`,
    `<meta property="og:type" content="${escape(meta.type)}" />`,
    `<meta property="og:site_name" content="DevHub Africa" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description)}" />`,
    `<meta property="og:url" content="${escape(meta.url)}" />`,
    `<meta property="og:image" content="${escape(meta.image)}" />`,
    ...(meta.largeImage
      ? [
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
        ]
      : []),
    `<meta name="twitter:card" content="${meta.largeImage ? 'summary_large_image' : 'summary'}" />`,
    `<link rel="canonical" href="${escape(meta.url)}" />`,
  ].join('\n    ');
  // Remplacement par fonction : une chaîne de remplacement interpréterait `$'`, `$\``, `$&`
  // venus d'un nom de salle ou d'une bio, et recopierait du HTML brut dans un attribut.
  return stripped.replace(/<\/head>/i, () => `    ${tags}\n  </head>`);
}
