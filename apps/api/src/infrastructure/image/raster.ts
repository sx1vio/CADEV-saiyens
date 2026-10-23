import { createCanvas, loadImage } from '@napi-rs/canvas';

// Rendu d'images avec @napi-rs/canvas (MIT, moteur Skia sous BSD). Il remplace sharp, dont la
// bibliothèque libvips est sous LGPL-3.0 : le règlement CADEV refuse tout composant GPL ou LGPL.

const MAX_PIXELS = 40_000_000;

export class ImageDecodeError extends Error {}

async function decode(input: Buffer) {
  const img = await loadImage(input).catch(() => {
    throw new ImageDecodeError('image illisible');
  });
  if (!img.width || !img.height) throw new ImageDecodeError('image illisible');
  if (img.width * img.height > MAX_PIXELS) throw new ImageDecodeError('image trop grande');
  return img;
}

/** Redimensionne à `width` (jamais d'agrandissement) et encode en WebP. */
export async function resizeToWebp(input: Buffer, width: number, quality = 72): Promise<Buffer> {
  const img = await decode(input);
  const w = Math.min(width, img.width);
  const h = Math.max(1, Math.round((img.height * w) / img.width));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.encode('webp', quality);
}

/** Dessine un SVG (texte avec les polices du système) et l'encode en PNG à sa taille propre. */
export async function svgToPng(svg: string): Promise<Buffer> {
  const img = await decode(Buffer.from(svg));
  const canvas = createCanvas(img.width, img.height);
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas.encode('png');
}
