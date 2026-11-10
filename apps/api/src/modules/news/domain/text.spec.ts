import { describe, expect, it } from 'vitest';
import { cleanText, decode, firstImage, htmlToText } from './text';

describe('decode', () => {
  it('décode les entités nommées et numériques', () => {
    expect(decode('Tom &amp; Jerry &#8217;s &#x2014; caf&eacute;')).toBe('Tom & Jerry ’s — café');
  });
});

describe('cleanText', () => {
  it('retire les balises, scripts et la mention « appeared first on »', () => {
    const html =
      '<p>Gemini <b>3</b> arrive</p><script>x()</script> The post Gemini appeared first on Blog.';
    expect(cleanText(html)).toBe('Gemini 3 arrive');
  });

  it('coupe au dernier mot entier avec une ellipse', () => {
    expect(cleanText('un deux trois quatre', 12)).toBe('un deux…');
  });
});

describe('firstImage', () => {
  it("ne garde qu'une image absolue en http(s)", () => {
    expect(firstImage('<img src="https://a.b/c.jpg">')).toBe('https://a.b/c.jpg');
    expect(firstImage('<img src="/relative.png">')).toBeNull();
  });
});
describe('htmlToText (description des offres)', () => {
  it('garde paragraphes, titres et puces, sans aucune balise', () => {
    const out = htmlToText(
      '<h3>About us</h3><p>We build <b>payments</b>.</p><ul><li>Node.js</li><li>Postgres</li></ul><script>alert(1)</script>',
    );
    expect(out).toBe('About us\n\nWe build payments.\n\n• Node.js\n• Postgres');
    expect(out).not.toContain('<');
  });

  it('décode le HTML échappé (Greenhouse) et coupe les textes trop longs', () => {
    expect(htmlToText('&lt;p&gt;Remote &amp;amp; Africa&lt;/p&gt;')).toBe('Remote & Africa');
    expect(htmlToText(`<p>${'mot '.repeat(50)}</p>`, 40).endsWith('…')).toBe(true);
    expect(htmlToText(null)).toBe('');
  });
});
