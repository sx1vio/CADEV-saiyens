import { describe, expect, it } from 'vitest';
import { inCidr, ipv4ToInt } from './cidr';

describe('ipv4ToInt', () => {
  it('convertit une adresse valide', () => {
    expect(ipv4ToInt('0.0.0.0')).toBe(0);
    expect(ipv4ToInt('10.0.0.1')).toBe(167772161);
  });
  it.each(['10.0.0', '10.0.0.256', '10.0.0.-1', 'a.b.c.d', '10.0.0.1.2', '1.2.3.4.5'])(
    'refuse %s',
    (ip) => expect(ipv4ToInt(ip)).toBeNull(),
  );
});

describe('inCidr', () => {
  it('accepte une adresse dans la plage, y compris au format IPv4 mappé en IPv6', () => {
    expect(inCidr('102.203.221.7', '102.203.220.0/22')).toBe(true);
    expect(inCidr('::ffff:102.203.223.255', '102.203.220.0/22')).toBe(true);
  });
  it('refuse une adresse hors plage', () => {
    expect(inCidr('102.203.224.1', '102.203.220.0/22')).toBe(false);
  });
  it('une plage sans masque vaut une seule adresse', () => {
    expect(inCidr('41.1.2.3', '41.1.2.3')).toBe(true);
    expect(inCidr('41.1.2.4', '41.1.2.3')).toBe(false);
  });
  it('/0 couvre tout', () => expect(inCidr('8.8.8.8', '0.0.0.0/0')).toBe(true));
  it.each([
    ['pas-une-ip', '10.0.0.0/8'],
    ['10.0.0.1', 'pas-une-plage/8'],
    ['10.0.0.1', '10.0.0.0/33'],
    ['10.0.0.1', '10.0.0.0/-1'],
    ['10.0.0.1', '10.0.0.0/x'],
    ['2001:db8::1', '10.0.0.0/8'],
  ])('refuse %s dans %s', (ip, cidr) => expect(inCidr(ip, cidr)).toBe(false));
});
