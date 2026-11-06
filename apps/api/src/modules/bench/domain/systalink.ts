import { inCidr } from '@devhub/core';

/**
 * L'application est-elle servie depuis le réseau Systalink ? Même règle que le pré-vol et la
 * preuve « en production » des salles : une adresse IP dans `SYSTALINK_IP_RANGES`.
 */
export function onSystalinkNetwork(ips: string[], ranges: string[]): boolean {
  return ips.some((ip) => ranges.some((r) => inCidr(ip, r)));
}
