import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { ImageDecodeError, resizeToWebp, svgToPng } from './raster';

const png = (w: number, h: number) => createCanvas(w, h).toBuffer('image/png');

describe('rendu d’images (sans libvips)', () => {
  it('redimensionne en WebP en gardant les proportions', async () => {
    const out = await resizeToWebp(png(800, 400), 320);
    expect(out.subarray(8, 12).toString()).toBe('WEBP');
    const img = await loadImage(out);
    expect([img.width, img.height]).toEqual([320, 160]);
  });

  it('n’agrandit jamais une petite image', async () => {
    const img = await loadImage(await resizeToWebp(png(100, 50), 640));
    expect([img.width, img.height]).toEqual([100, 50]);
  });

  it('refuse ce qui n’est pas une image', async () => {
    await expect(resizeToWebp(Buffer.from('pas une image'), 320)).rejects.toBeInstanceOf(
      ImageDecodeError,
    );
  });

  it('dessine un SVG en PNG à sa taille', async () => {
    const out = await svgToPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><text x="10" y="50">Été</text></svg>',
    );
    expect(out.subarray(1, 4).toString()).toBe('PNG');
    const img = await loadImage(out);
    expect([img.width, img.height]).toEqual([1200, 630]);
  });
});
