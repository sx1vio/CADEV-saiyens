const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  return parts.reduce((n, p) => n * 256 + p, 0);
};

/** IPv4 dans une plage CIDR (« 102.203.220.0/22 »). Les plages IPv6 ne sont pas gérées. */
export function inCidr(ip: string, cidr: string): boolean {
  const [base = '', bits = '32'] = cidr.trim().split('/');
  const n = ipv4ToInt(ip.replace(/^::ffff:/i, ''));
  const b = ipv4ToInt(base);
  const len = Number(bits);
  if (n === null || b === null || !Number.isInteger(len) || len < 0 || len > 32) return false;
  const size = 2 ** (32 - len);
  return Math.floor(n / size) === Math.floor(b / size);
}
