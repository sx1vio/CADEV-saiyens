/** Photos des publications : formats acceptés, reconnus par leurs octets (jamais par l'en-tête seul). */
export const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
/** Envois par compte sur 24 heures glissantes (anti-abus du stockage). */
export const MEDIA_PER_DAY = 40;
export const MEDIA_MAX_SIDE = 4096;

export type ImageMime = 'image/webp' | 'image/jpeg' | 'image/png';

/** Format réel de l'image d'après ses premiers octets ; null pour tout le reste (SVG, HTML…). */
export function sniffImage(bytes: Uint8Array): ImageMime | null {
  const b = bytes;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Dimensions déclarées par le navigateur : entiers positifs bornés, sinon null. */
export function parseSide(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 && n <= MEDIA_MAX_SIDE ? n : null;
}
