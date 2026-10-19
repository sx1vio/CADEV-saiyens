import { describe, expect, it } from 'vitest';
import { describe as line, renderDigest } from './email';

const input = {
  lang: 'fr' as const,
  appUrl: 'https://devhub.africa',
  unsubscribeUrl: 'https://devhub.africa/api/v1/unsubscribe?token=t',
  displayName: 'Awa',
};

describe('renderDigest (Y3)', () => {
  it('une notification : son texte en objet, lien vers la question, pied Systalink', () => {
    const mail = renderDigest(
      [{ type: 'answer.created', payload: { questionId: 'q1', title: 'nginx 502', by: 'moussa' } }],
      input,
    );
    expect(mail.subject).toBe('moussa a répondu à « nginx 502 »');
    expect(mail.text).toContain('https://devhub.africa/sos/q1');
    expect(mail.text).toContain('Envoyé via Systalink Mail');
    expect(mail.text).toContain(input.unsubscribeUrl);
  });

  it('plusieurs : un seul e-mail récapitulatif ; anglais ; contenu échappé en HTML', () => {
    const mail = renderDigest(
      [
        { type: 'match.request', payload: { questionId: 'q1', title: '<script>x</script>' } },
        { type: 'task.completed', payload: { taskTitle: 'Orange Money', points: 15 } },
        { type: 'join.decided', payload: { roomName: 'Paylink', decision: 'refused' } },
        { type: 'inconnu', payload: {} },
      ],
      { ...input, lang: 'en' },
    );
    expect(mail.subject).toBe('4 new notifications on DevHub Africa');
    expect(mail.html).not.toContain('<script>x</script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.text).toContain('Your contribution “Orange Money” was accepted: +15 Proof XP');
    expect(mail.text).toContain('Your request for Paylink: declined');
    expect(mail.text).toContain('Sent via Systalink Mail');
  });

  it('chaque type a sa phrase et son lien', () => {
    expect(
      line(
        { type: 'answer.accepted', payload: { questionId: 'q', title: 'T', points: 13 } },
        'fr',
        input.appUrl,
      ),
    ).toEqual({
      line: 'Ta réponse a débloqué « T » : +13 Proof XP',
      url: 'https://devhub.africa/sos/q',
    });
    expect(line({ type: 'join.request', payload: { roomName: 'P' } }, 'fr', input.appUrl).url).toBe(
      'https://devhub.africa/projets',
    );
  });

  it('PR4 : le message relayé suit la ligne, échappé, avec un lien vers le Passport de l’expéditeur', () => {
    const mail = renderDigest(
      [
        {
          type: 'contact.request',
          payload: { by: 'moussa', byName: 'Moussa', message: 'Mission <b>React</b> à Dakar ?' },
        },
      ],
      input,
    );
    expect(mail.subject).toBe("Moussa (@moussa) t'a écrit depuis ton Passport");
    expect(mail.text).toContain('« Mission <b>React</b> à Dakar ? »');
    expect(mail.text).toContain('https://devhub.africa/u/moussa');
    expect(mail.html).toContain('<q>Mission &lt;b&gt;React&lt;/b&gt; à Dakar ?</q>');
    expect(mail.text).not.toMatch(/@[\w.-]+\.[a-z]{2,}/);
  });
});
