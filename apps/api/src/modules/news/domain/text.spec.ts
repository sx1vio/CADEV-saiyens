import { describe, expect, it } from 'vitest';
import { cleanText, decode, firstImage } from './text';

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
