import { describe, expect, it } from 'vitest';
import { parseSide, sniffImage } from './image';

const bytes = (...head: number[]) => new Uint8Array([...head, ...new Array(16).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe('sniffImage', () => {
  it('reconnaît JPEG, PNG et WebP par leurs octets', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffImage(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe('image/webp');
  });

  it('refuse SVG, HTML, GIF et les fichiers trop courts', () => {
    expect(sniffImage(bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg">')))).toBeNull();
    expect(sniffImage(bytes(...ascii('<!doctype html>')))).toBeNull();
    expect(sniffImage(bytes(...ascii('GIF89a')))).toBeNull();
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe('parseSide', () => {
  it('garde un entier positif borné', () => {
    expect(parseSide('1600')).toBe(1600);
    expect(parseSide('0')).toBeNull();
    expect(parseSide('5000')).toBeNull();
    expect(parseSide('12.5')).toBeNull();
    expect(parseSide(undefined)).toBeNull();
  });
});
