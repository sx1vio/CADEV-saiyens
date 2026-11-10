// Génère shared/.../certs/CertCatalogData.kt depuis le catalogue du web (@devhub/core et official.ts).
// Usage : node --experimental-strip-types apps/mobile/scripts/gen-certs.mjs
import { writeFileSync } from 'node:fs';
import { CERT_CATALOG } from '../../../packages/core/dist/index.js';
import { OFFICIAL_CERTS, CHECKED_AT } from '../../web/src/platform/data/certs/official.ts';

const q = (s) => JSON.stringify(s).replace(/\$/g, '\\$');
const list = (a) => `listOf(${(a ?? []).map(q).join(', ')})`;
const lvl = (l) =>
  ({ debutant: 'Beginner', intermediaire: 'Intermediate', avance: 'Advanced', expert: 'Expert' })[
    l
  ];
const hex = (c) => `0xFF${c.replace('#', '').toUpperCase()}`;

let out = `// Fichier généré par apps/mobile/scripts/gen-certs.mjs : ne pas modifier à la main.
package africa.devhub.certs

internal val GENERATED_CERTS: List<DevHubCert> = listOf(
${CERT_CATALOG.map((c) => `    DevHubCert(id = ${q(c.id)}, title = ${q(c.title)}, track = ${q(c.track)}, level = CertLevel.${lvl(c.level)}, minutes = ${c.minutes}, passScore = ${c.passScore}, draw = ${c.draw}, skills = ${list(c.skills)}, description = ${q(c.description)}, syllabus = ${list(c.syllabus)}, topicCounts = listOf(${c.topicCounts.join(', ')}), bankSize = ${c.bankSize}, color = ${hex(c.color)}, logo = ${q(c.logo ?? '')}, course = ${q(c.course ?? '')}),`).join('\n')}
)

internal const val OFFICIAL_CHECKED_AT = ${q(CHECKED_AT)}

internal val GENERATED_OFFICIAL: List<OfficialCert> = listOf(
${OFFICIAL_CERTS.map((c) => `    OfficialCert(id = ${q(c.id)}, title = ${q(c.title)}, code = ${q(c.code ?? '')}, provider = ${q(c.provider)}, providerColor = ${hex(c.providerColor)}, domain = ${q(c.domain)}, level = CertLevel.${lvl(c.level)}, free = ${c.free}, price = ${q(c.price)}, format = ${q(c.format)}, passScore = ${q(c.passScore ?? '')}, validity = ${q(c.validity)}, url = ${q(c.url)}, languages = ${list(c.language)}, description = ${q(c.description)}, prepLabel = ${q(c.prep?.label ?? '')}, prepUrl = ${q(c.prep?.url ?? '')}, prepPath = ${q(c.prepPath ?? '')}, note = ${q(c.note ?? '')}),`).join('\n')}
)
`;
const dir = new URL('../shared/src/commonMain/kotlin/africa/devhub/certs/', import.meta.url);
import('node:fs').then(({ mkdirSync }) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('CertCatalogData.kt', dir), out);
  console.log(CERT_CATALOG.length, 'devhub certs,', OFFICIAL_CERTS.length, 'official');
});
