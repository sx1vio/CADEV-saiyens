import { describe, expect, it } from 'vitest';
import {
  deploymentToken,
  inCidr,
  onSystalink,
  sameOrigin,
  servesToken,
  uptime,
} from './deployment';

describe('preuve de déploiement', () => {
  it('jeton : préfixe devhub- et 24 caractères hexadécimaux', () => {
    const token = deploymentToken((n) => new Uint8Array(n).fill(171));
    expect(token).toBe(`devhub-${'ab'.repeat(12)}`);
  });

  it('jeton servi par le fichier ou par la balise meta, jamais par un texte voisin', () => {
    const t = 'devhub-0123456789abcdef01234567';
    expect(servesToken(`${t}\n`, t)).toBe(true);
    expect(servesToken(`<head><meta name="devhub-proof" content="${t}"></head>`, t)).toBe(true);
    expect(servesToken(`<meta content='${t}' name='devhub-proof' />`, t)).toBe(true);
    expect(servesToken(`${t}x`, t)).toBe(false);
    expect(servesToken(`<meta name="description" content="${t}">`, t)).toBe(false);
  });

  it('plages CIDR IPv4, adresses IPv4 mappées en IPv6 comprises', () => {
    expect(inCidr('102.203.220.60', '102.203.220.0/22')).toBe(true);
    expect(inCidr('102.203.223.255', '102.203.220.0/22')).toBe(true);
    expect(inCidr('102.203.224.1', '102.203.220.0/22')).toBe(false);
    expect(inCidr('::ffff:102.203.221.9', '102.203.220.0/22')).toBe(true);
    expect(inCidr('2a06:98c1::1', '102.203.220.0/22')).toBe(false);
    expect(inCidr('10.0.0.1', 'pas-une-plage')).toBe(false);
  });

  it('hébergé sur Systalink si une des adresses est dans une plage', () => {
    expect(onSystalink(['188.114.96.2', '102.203.220.60'], ['102.203.220.0/22'])).toBe(true);
    expect(onSystalink(['188.114.96.2'], ['102.203.220.0/22'])).toBe(false);
    expect(onSystalink(['102.203.220.60'], [])).toBe(false);
  });

  it('même origine : chemin indifférent, hôte ou port différent non', () => {
    expect(sameOrigin('https://app.exemple.sn/', 'https://app.exemple.sn/demo')).toBe(true);
    expect(sameOrigin('https://app.exemple.sn', 'https://autre.exemple.sn')).toBe(false);
  });

  it('disponibilité : null sans sonde, arrondie au millième', () => {
    expect(uptime(0, 0)).toBeNull();
    expect(uptime(2, 3)).toBe(0.667);
    expect(uptime(5, 5)).toBe(1);
  });
});
