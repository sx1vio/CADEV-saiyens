/**
 * Recalcule topicCounts et bankSize du catalogue public (@devhub/core) depuis la banque de l'API.
 * Usage : pnpm --filter @devhub/api exec tsx scripts/sync-cert-catalog.ts
 * Le test bank.spec.ts vérifie ensuite que le catalogue correspond à la banque.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BANK } from '../src/modules/certifications/bank';

const file = resolve(__dirname, '../../../packages/core/src/certs/catalog.ts');
let src = readFileSync(file, 'utf8');
for (const cert of BANK) {
  const counts = cert.syllabus.map((_, t) => cert.questions.filter((q) => q.topic === t).length);
  const start = src.indexOf(`id: '${cert.id}'`);
  if (start < 0) throw new Error(`Certification absente du catalogue : ${cert.id}`);
  const end = src.indexOf('bankSize:', start);
  const lineEnd = src.indexOf('\n', end);
  const block = src
    .slice(start, lineEnd)
    .replace(/topicCounts: \[[^\]]*\]/, `topicCounts: [${counts.join(', ')}]`)
    .replace(/bankSize: \d+/, `bankSize: ${cert.questions.length}`);
  src = src.slice(0, start) + block + src.slice(lineEnd);
  // eslint-disable-next-line no-console -- script en ligne de commande
  console.log(cert.id.padEnd(24), cert.questions.length, counts.join('/'));
}
writeFileSync(file, src);
