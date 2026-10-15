import { describe, expect, it } from 'vitest';
import { oneLine, renderSharePage } from './share-page';

const INDEX = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>DevHub Africa — aider, construire, prouver</title>
    <meta
      name="description"
      content="La plateforme des développeurs."
    />
    <meta property="og:title" content="DevHub Africa" />
    <meta property="og:type" content="website" />
    <script type="module" src="/assets/index-abc.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;

const meta = {
  title: 'Awa Koné « dev » <Docker> — Developer Passport',
  description: 'Docker, Node.js · 120 Proof XP',
  url: 'https://devhub.africa/u/awa-kone',
  image: 'https://devhub.africa/pwa-512.png',
  type: 'profile' as const,
};

describe('renderSharePage (R7, ADR-0012)', () => {
  it('remplace titre, description et balises og, garde le reste de la page', () => {
    const html = renderSharePage(INDEX, meta);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).not.toContain('La plateforme des développeurs.');
    expect(html).toContain('<meta property="og:url" content="https://devhub.africa/u/awa-kone" />');
    expect(html).toContain('<meta property="og:type" content="profile" />');
    expect(html).toContain('<script type="module" src="/assets/index-abc.js"></script>');
    expect(html).toContain('<div id="root"></div>');
  });

  it('échappe le contenu fourni par les utilisateurs (pas d’injection HTML)', () => {
    const html = renderSharePage(INDEX, { ...meta, description: '"><script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Awa Koné « dev » &lt;Docker&gt;');
  });
});

describe('renderSharePage : motifs de remplacement', () => {
  it("un nom contenant $' ou $& ne recopie pas le document dans la page", () => {
    const html = renderSharePage(INDEX, { ...meta, title: "Salle $' $& $` $1" });
    expect(html).toContain('<title>Salle $&#39; $&amp; $` $1</title>');
    expect(html.match(/<div id="root"><\/div>/g)).toHaveLength(1);
    expect(html.match(/<script type="module"/g)).toHaveLength(1);
  });
});

describe('oneLine', () => {
  it('aplatit et coupe au mot', () => {
    expect(oneLine('  Paiements\n mobile   money ', 100)).toBe('Paiements mobile money');
    expect(oneLine('Paiements mobile money pour les commerçants de Dakar', 30)).toBe(
      'Paiements mobile money pour…',
    );
    expect(oneLine('Supercalifragilisticexpialidocious', 10)).toBe('Supercali…');
  });
});
