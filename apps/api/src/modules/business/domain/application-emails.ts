/** E-mails des candidatures (13/11/2026) : texte brut + HTML échappé, sans suivi ni image. */

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Aux recruteurs de l'entreprise : une nouvelle candidature les attend sur DevHub Business. */
export function newApplicationEmail(opts: {
  recruiter: string;
  candidate: string;
  jobTitle: string;
  url: string;
}) {
  const subject = `Nouvelle candidature : ${opts.jobTitle}`;
  const text = [
    `Bonjour ${opts.recruiter},`,
    '',
    `${opts.candidate} vient de postuler à votre offre « ${opts.jobTitle} » sur DevHub Africa.`,
    'Son message, son Passport (compétences prouvées, projets) et, s’il les a joints, son CV et son e-mail vous attendent ici :',
    opts.url,
    '',
    'Chaque changement de statut que vous faites est notifié au candidat.',
  ].join('\n');
  const html = `<p>Bonjour ${esc(opts.recruiter)},</p>
<p><strong>${esc(opts.candidate)}</strong> vient de postuler à votre offre « ${esc(opts.jobTitle)} » sur DevHub Africa.</p>
<p><a href="${esc(opts.url)}">Voir la candidature</a> : message, Passport (compétences prouvées, projets) et, s’il les a joints, CV et e-mail.</p>
<p>Chaque changement de statut que vous faites est notifié au candidat.</p>`;
  return { subject, text, html };
}

/** Au candidat : l'entreprise a fait avancer sa candidature (avec son mot, s'il y en a un). */
export function statusChangeEmail(opts: {
  name: string;
  company: string;
  jobTitle: string;
  label: string | null;
  note: string | null;
  url: string;
}) {
  const subject = opts.label
    ? `${opts.company} : candidature ${opts.label}`
    : `${opts.company} t’a écrit à propos de ta candidature`;
  const head = opts.label
    ? `Ta candidature « ${opts.jobTitle} » chez ${opts.company} est ${opts.label}.`
    : `${opts.company} t’a écrit à propos de ta candidature « ${opts.jobTitle} ».`;
  const text = [
    `Bonjour ${opts.name},`,
    '',
    head,
    ...(opts.note ? ['', `Message de ${opts.company} :`, opts.note] : []),
    '',
    `Suivre tes candidatures : ${opts.url}`,
  ].join('\n');
  const html = `<p>Bonjour ${esc(opts.name)},</p>
<p>${esc(head)}</p>
${opts.note ? `<p>Message de ${esc(opts.company)} :</p><blockquote style="border-left:3px solid #ccc;margin:0;padding-left:12px;white-space:pre-line">${esc(opts.note)}</blockquote>` : ''}
<p><a href="${esc(opts.url)}">Suivre tes candidatures</a></p>`;
  return { subject, text, html };
}

/** Un PDF commence par « %PDF- » (ISO 32000). */
export const isPdf = (b: Buffer) => b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-';

/** Nom de fichier sûr pour l'en-tête Content-Disposition. */
export function cvFileName(raw: unknown): string {
  const base =
    typeof raw === 'string'
      ? raw
          .normalize('NFKD')
          .replace(/[^\w.\- ]+/g, '')
          .trim()
      : '';
  const name = (base || 'cv').slice(0, 80);
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}
