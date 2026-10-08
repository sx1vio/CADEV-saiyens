import { describe, expect, it } from 'vitest';
import { isPrivateAddress, snapWidth } from './image-proxy';

describe('isPrivateAddress (anti-SSRF)', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.20.0.5',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    'fd00::1',
    '::ffff:127.0.0.1',
  ])('refuse %s', (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(['8.8.8.8', '151.101.1.69', '2606:4700::1111'])('accepte %s', (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe('snapWidth', () => {
  it('arrondit à la taille servie la plus proche', () => {
    expect(snapWidth(300)).toBe(320);
    expect(snapWidth(5000)).toBe(1280);
    expect(snapWidth()).toBe(640);
  });
});
