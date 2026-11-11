import { describe, expect, it } from 'vitest';
import { parseLinkPreview } from './link-preview';

describe('aperçu d’un lien (administration des contenus)', () => {
  it('lit Open Graph, quel que soit l’ordre des attributs, et rend l’image absolue', () => {
    const html = `<html lang="fr-FR"><head>
      <title>Titre HTML</title>
      <meta property="og:title" content="Kotlin 2.4 est sorti &amp; c&#39;est rapide">
      <meta content="Les nouveautés du compilateur." property="og:description">
      <meta property="og:image" content="/img/cover.png">
      <meta property="og:site_name" content="Blog Kotlin">
      <meta property="article:published_time" content="2026-11-10T08:00:00Z">
    </head></html>`;
    expect(parseLinkPreview(html, 'https://blog.kotlinlang.org/2026/11/k24')).toEqual({
      title: "Kotlin 2.4 est sorti & c'est rapide",
      summary: 'Les nouveautés du compilateur.',
      image: 'https://blog.kotlinlang.org/img/cover.png',
      sourceName: 'Blog Kotlin',
      lang: 'fr',
      publishedAt: '2026-11-10T08:00:00.000Z',
    });
  });

  it('se rabat sur <title>, la description et le domaine', () => {
    const p = parseLinkPreview(
      '<html><head><title> Mon outil IA </title><meta name="description" content="Un agent."></head></html>',
      'https://www.exemple.dev/outil',
    );
    expect(p).toMatchObject({
      title: 'Mon outil IA',
      summary: 'Un agent.',
      image: null,
      sourceName: 'exemple.dev',
      lang: 'en',
      publishedAt: null,
    });
  });

  it('garde une apostrophe dans un contenu entre guillemets doubles', () => {
    const p = parseLinkPreview(
      `<meta property="og:title" content="L'IA au Sénégal">`,
      'https://exemple.sn/ia',
    );
    expect(p.title).toBe("L'IA au Sénégal");
  });

  it('refuse une image en http et ignore une date invalide', () => {
    const p = parseLinkPreview(
      '<meta property="og:image" content="http://x.com/a.png"><meta property="article:published_time" content="hier">',
      'https://x.com/a',
    );
    expect(p.image).toBeNull();
    expect(p.publishedAt).toBeNull();
  });
});
