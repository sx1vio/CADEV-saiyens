import type {
  PreflightCheck,
  PreflightLoadTest,
  PreflightSystalinkAdvice,
  SystalinkHosting,
} from '@devhub/contracts';
import { SYSTALINK_CLOUD_PLANS } from '@devhub/contracts';
import { formatMs } from './network';

// Conseil d'hébergement Systalink : règles pures. On part de ce qui est mesuré (adresse IP, test
// de charge) et de l'offre déclarée par le développeur. On ne promet jamais qu'une offre « tient
// N visiteurs » : on conseille la taille au-dessus, et le pré-vol suivant le vérifie.

const CLOUD_LABEL = (p: (typeof SYSTALINK_CLOUD_PLANS)[number]) =>
  `Serveur cloud ${p.name} (${p.vcpu} vCPU, ${p.ramGb} Go de mémoire)`;

export const SYSTALINK_LABEL: Record<SystalinkHosting, string> = {
  ...(Object.fromEntries(SYSTALINK_CLOUD_PLANS.map((p) => [p.id, CLOUD_LABEL(p)])) as Record<
    (typeof SYSTALINK_CLOUD_PLANS)[number]['id'],
    string
  >),
  cloud_other: 'Serveur cloud (autre configuration)',
  web_service: 'Web service (API)',
  static_site: 'Site statique sans serveur',
  web_hosting: 'Hébergement Web',
  site_builder: 'Créateur de site web (IA)',
};

/** Au-delà de cette médiane sans charge, le temps passe dans l'application, pas dans la machine. */
const SLOW_BASELINE_MS = 800;

const cloudIndex = (h: SystalinkHosting | null) =>
  SYSTALINK_CLOUD_PLANS.findIndex((p) => p.id === h);

export interface HostingInput {
  /** Adresse IP dans les plages Systalink. */
  hosted: boolean;
  declared: SystalinkHosting | null;
  loadTest: PreflightLoadTest | null;
}

export function systalinkAdvice({
  hosted,
  declared,
  loadTest,
}: HostingInput): PreflightSystalinkAdvice {
  const current = declared ? SYSTALINK_LABEL[declared] : null;
  const advice = (recommended: SystalinkHosting | null, reason: string) => ({
    declared,
    recommended,
    reason,
  });

  if (!loadTest) {
    if (current) {
      return advice(
        null,
        `Offre déclarée : ${current}. Ajoute le test de charge pour savoir si elle suffit.`,
      );
    }
    return advice(
      null,
      hosted
        ? 'Hébergé chez Systalink. Indique ton offre et ajoute le test de charge pour un conseil de taille.'
        : 'Hébergé hors de Systalink. Un serveur à Dakar rapproche l’application de ses visiteurs en Afrique de l’Ouest.',
    );
  }

  const { breakingConcurrency: broke, maxStableConcurrency: held } = loadTest;
  if (broke === null) {
    return advice(
      null,
      current
        ? `Ton ${current} tient ${held} visiteurs simultanés : inutile de changer d’offre pour l’instant.`
        : `L’application tient ${held} visiteurs simultanés : pas besoin d’une machine plus grande pour l’instant.`,
    );
  }

  const baseline = loadTest.stages[0];
  if (baseline && baseline.p50Ms > SLOW_BASELINE_MS) {
    return advice(
      null,
      `La réponse prend déjà ${formatMs(baseline.p50Ms)} sans charge : corrige d’abord l’application (load.slow_baseline). Une machine plus grande n’y changera presque rien.`,
    );
  }

  const i = cloudIndex(declared);
  if (i >= 0) {
    const next = SYSTALINK_CLOUD_PLANS[i + 1];
    if (!next) {
      return advice(
        null,
        `Ton ${current} cède à ${broke} visiteurs simultanés et c’est la plus grande offre listée : répartis la charge sur plusieurs serveurs (répartiteur de charge ou Kubernetes Systalink).`,
      );
    }
    return advice(
      next.id,
      `Ton ${current} cède à ${broke} visiteurs simultanés. Si les pistes de load.capacity ne suffisent pas, passe au ${CLOUD_LABEL(next)}, puis relance le pré-vol pour vérifier.`,
    );
  }
  if (declared === 'cloud_other') {
    return advice(
      null,
      `Ton serveur cède à ${broke} visiteurs simultanés. Si les pistes de load.capacity ne suffisent pas, prends une configuration avec plus de vCPU et de mémoire, puis relance le pré-vol.`,
    );
  }
  if (declared) {
    return advice(
      'cloud_starter',
      `Ton ${current} cède à ${broke} visiteurs simultanés. Pour une application qui doit tenir la charge, un serveur dédié est l’étape suivante : le ${CLOUD_LABEL(SYSTALINK_CLOUD_PLANS[0])}, puis relance le pré-vol pour vérifier.`,
    );
  }
  if (hosted) {
    return advice(
      null,
      `L’application cède à ${broke} visiteurs simultanés. Indique ton offre Systalink au prochain pré-vol pour savoir laquelle prendre.`,
    );
  }
  return advice(
    'cloud_business',
    `L’application cède à ${broke} visiteurs simultanés. Si ta machine actuelle est en cause, le ${CLOUD_LABEL(SYSTALINK_CLOUD_PLANS[1])} à Dakar laisse de la marge pour l’application et sa base ; relance le pré-vol après la migration.`,
  );
}

/** Contrôle « host.plan » : le conseil devient une ligne du rapport quand il y a quelque chose à faire. */
export function planCheck(a: PreflightSystalinkAdvice): PreflightCheck | null {
  if (!a.recommended) return null;
  return {
    id: 'host.plan',
    category: 'hosting',
    status: 'info',
    title: `Offre conseillée : ${SYSTALINK_LABEL[a.recommended]}`,
    detail: a.reason,
    fix: 'Créer ou agrandir le service dans la console Systalink : https://platform.systalink.com/services/create-service',
    evidence: a.declared ? [`Offre déclarée : ${SYSTALINK_LABEL[a.declared]}`] : [],
  };
}

/**
 * L'adresse IP n'est pas dans les plages Systalink alors que le développeur déclare une offre :
 * attendu pour un site statique servi par un CDN, sinon la liste des plages est incomplète.
 */
export function declaredButUnseen(
  hostCheck: PreflightCheck,
  declared: SystalinkHosting | null,
): PreflightCheck {
  if (!declared || hostCheck.status === 'pass') return hostCheck;
  return {
    ...hostCheck,
    title: 'Offre Systalink déclarée, adresse non reconnue',
    detail:
      declared === 'static_site'
        ? `Tu indiques : ${SYSTALINK_LABEL[declared]}. Un site statique est servi par un CDN mondial, dont les adresses ne sont pas celles du centre de données de Dakar : c’est attendu.`
        : `Tu indiques : ${SYSTALINK_LABEL[declared]}, mais l’adresse IP n’est pas dans les plages Systalink connues de DevHub. Vérifie que le domaine pointe bien vers ton service Systalink, ou signale l’adresse pour compléter la liste.`,
    fix: null,
  };
}
