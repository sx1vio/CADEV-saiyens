import { SYSTALINK_CLOUD_PLANS, type SystalinkHosting } from '@devhub/contracts';

/* Offres Systalink proposées au pré-vol (console : platform.systalink.com/services/create-service). */

const cloud = Object.fromEntries(
  SYSTALINK_CLOUD_PLANS.map((p) => [
    p.id,
    `Serveur cloud ${p.name} (${p.vcpu} vCPU, ${p.ramGb} Go)`,
  ]),
) as Record<(typeof SYSTALINK_CLOUD_PLANS)[number]['id'], string>;

export const SYSTALINK_HOSTING_LABEL: Record<SystalinkHosting, string> = {
  ...cloud,
  cloud_other: 'Serveur cloud, autre configuration',
  web_service: 'Web service (API)',
  static_site: 'Site statique sans serveur',
  web_hosting: 'Hébergement Web',
  site_builder: 'Créateur de site web (IA)',
};

export const SYSTALINK_HOSTING_GROUPS: { label: string; options: SystalinkHosting[] }[] = [
  { label: 'Serveur cloud', options: [...SYSTALINK_CLOUD_PLANS.map((p) => p.id), 'cloud_other'] },
  {
    label: 'Autres services',
    options: ['web_service', 'static_site', 'web_hosting', 'site_builder'],
  },
];
