// Y3 : e-mail récapitulatif des notifications non lues (docs/architecture/09-ia-integrations.md §3).
// Règles pures : contenu, liens et pied « Envoyé via Systalink Mail » (Y6). Aucun envoi ici.

export type EmailLang = 'fr' | 'en';

export interface PendingNotification {
  type: string;
  payload: Record<string, unknown>;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const str = (v: unknown): string =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : '';

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Une ligne lisible et son lien, par type de notification. */
export function describe(
  n: PendingNotification,
  lang: EmailLang,
  appUrl: string,
): { line: string; url: string } {
  const p = n.payload;
  const fr = lang === 'fr';
  const question = new URL(`/sos/${str(p.questionId)}`, appUrl).toString();
  const rooms = new URL('/projets', appUrl).toString();
  switch (n.type) {
    case 'match.request':
      return {
        line: fr
          ? `On a besoin de toi : « ${str(p.title)} »`
          : `Someone needs your help: “${str(p.title)}”`,
        url: question,
      };
    case 'answer.created':
      return {
        line: fr
          ? `${str(p.by)} a répondu à « ${str(p.title)} »`
          : `${str(p.by)} answered “${str(p.title)}”`,
        url: question,
      };
    case 'answer.accepted':
      return {
        line: fr
          ? `Ta réponse a débloqué « ${str(p.title)} » : +${str(p.points)} Proof XP`
          : `Your answer unblocked “${str(p.title)}”: +${str(p.points)} Proof XP`,
        url: question,
      };
    case 'join.request':
      return {
        line: fr
          ? `Nouvelle demande pour rejoindre ${str(p.roomName)}`
          : `New request to join ${str(p.roomName)}`,
        url: rooms,
      };
    case 'join.decided':
      return {
        line: fr
          ? `Ta demande pour ${str(p.roomName)} : ${p.decision === 'accepted' ? 'acceptée' : 'refusée'}`
          : `Your request for ${str(p.roomName)}: ${p.decision === 'accepted' ? 'accepted' : 'declined'}`,
        url: rooms,
      };
    case 'task.completed':
      return {
        line: fr
          ? `Ta contribution « ${str(p.taskTitle)} » est validée : +${str(p.points)} Proof XP`
          : `Your contribution “${str(p.taskTitle)}” was accepted: +${str(p.points)} Proof XP`,
        url: rooms,
      };
    case 'feedback.requested':
      return {
        line: fr
          ? `${str(p.by)} demande ${p.kind === 'code_review' ? 'une revue de code' : 'un retour'} sur ${str(p.roomName)}`
          : `${str(p.by)} asks for ${p.kind === 'code_review' ? 'a code review' : 'feedback'} on ${str(p.roomName)}`,
        url: rooms,
      };
    case 'feedback.taken':
      return {
        line: fr
          ? `${str(p.by)} relit ${str(p.roomName)}`
          : `${str(p.by)} is reviewing ${str(p.roomName)}`,
        url: rooms,
      };
    case 'feedback.confirmed':
      return {
        line:
          Number(p.points) > 0
            ? fr
              ? `Ta revue de ${str(p.roomName)} est confirmée : +${str(p.points)} Proof XP`
              : `Your review of ${str(p.roomName)} was confirmed: +${str(p.points)} Proof XP`
            : fr
              ? `Ton retour sur ${str(p.roomName)} est confirmé`
              : `Your feedback on ${str(p.roomName)} was confirmed`,
        url: rooms,
      };
    default:
      return { line: fr ? 'Nouvelle notification' : 'New notification', url: appUrl };
  }
}

/** Un seul e-mail par personne et par passage, quel que soit le nombre de notifications. */
export function renderDigest(
  notifications: PendingNotification[],
  input: { lang: EmailLang; appUrl: string; unsubscribeUrl: string; displayName: string },
): EmailContent {
  const fr = input.lang === 'fr';
  const items = notifications.map((n) => describe(n, input.lang, input.appUrl));
  const subject =
    items.length === 1
      ? items[0]!.line
      : fr
        ? `${items.length} nouvelles notifications sur DevHub Africa`
        : `${items.length} new notifications on DevHub Africa`;
  const hello = fr ? `Bonjour ${input.displayName},` : `Hi ${input.displayName},`;
  const footer = fr
    ? `Envoyé via Systalink Mail. Ne plus recevoir ces e-mails : ${input.unsubscribeUrl}`
    : `Sent via Systalink Mail. Stop these emails: ${input.unsubscribeUrl}`;
  const text = [hello, '', ...items.map((i) => `- ${i.line}\n  ${i.url}`), '', footer].join('\n');
  const html = [
    `<p>${escapeHtml(hello)}</p>`,
    '<ul>',
    ...items.map((i) => `<li><a href="${escapeHtml(i.url)}">${escapeHtml(i.line)}</a></li>`),
    '</ul>',
    `<p style="color:#666;font-size:12px">${fr ? 'Envoyé via Systalink Mail.' : 'Sent via Systalink Mail.'} <a href="${escapeHtml(input.unsubscribeUrl)}">${fr ? 'Ne plus recevoir ces e-mails' : 'Unsubscribe'}</a></p>`,
  ].join('\n');
  return { subject, text, html };
}
