import type { Person } from '../types'

/** Comptes de démonstration (mêmes personnes que le serveur local), tous marqués « démo ». */
const RAW: [string, string, string, string][] = [
  ['awa-kone', 'Awa Koné', 'CI', 'Abidjan'],
  ['moussa-diop', 'Moussa Diop', 'SN', 'Dakar'],
  ['kwame-dev', 'Kwame Asante', 'GH', 'Accra'],
  ['chiamaka-o', 'Chiamaka Okafor', 'NG', 'Lagos'],
  ['yao-mensah', 'Yao Mensah', 'TG', 'Lomé'],
  ['fatou-nd', 'Fatou Ndiaye', 'SN', 'Saint-Louis'],
  ['je-hounkpatin', 'Jean-Eudes Hounkpatin', 'BJ', 'Cotonou'],
  ['amina-bello', 'Amina Bello', 'NG', 'Abuja'],
  ['ibra-traore', 'Ibrahim Traoré', 'ML', 'Bamako'],
  ['nadia-benali', 'Nadia Benali', 'MA', 'Casablanca'],
  ['sam-mwangi', 'Samuel Mwangi', 'KE', 'Nairobi'],
  ['grace-uwase', 'Grace Uwase', 'RW', 'Kigali'],
  ['cedric-nk', 'Cédric Nkoulou', 'CM', 'Douala'],
  ['thandi-d', 'Thandiwe Dlamini', 'ZA', 'Johannesburg'],
  ['ousmane-sow', 'Ousmane Sow', 'SN', 'Dakar'],
  ['esi-owusu', 'Esi Owusu', 'GH', 'Kumasi'],
  ['koffi-ag', 'Koffi Agbeko', 'TG', 'Lomé'],
  ['aicha-sanogo', 'Aïcha Sanogo', 'BF', 'Ouagadougou'],
  ['pat-kabongo', 'Patrick Kabongo', 'CD', 'Kinshasa'],
  ['mariam-k', 'Mariam Kouyaté', 'GN', 'Conakry'],
]

export const PEOPLE: Record<string, Person> = Object.fromEntries(
  RAW.map(([handle, name, country, city]) => [handle, { handle, name, country, city, avatar: `/avatars/${handle}.webp` }]),
)

/** L'équipe éditoriale (actu IA et tech) */
PEOPLE['devhub'] = { handle: 'devhub-admin', name: 'Rédaction DevHub', country: 'BJ', city: 'Cotonou', avatar: '/avatars/djeli.webp' }

export function person(handle: string): Person {
  return PEOPLE[handle] ?? { handle, name: handle, country: '', city: '', avatar: '' }
}

const NOW = Date.now()
/** Date relative figée au chargement (heures dans le passé). */
export const ago = (hours: number) => new Date(NOW - hours * 3600_000).toISOString()
export const inDays = (days: number) => new Date(NOW + days * 86400_000).toISOString()
