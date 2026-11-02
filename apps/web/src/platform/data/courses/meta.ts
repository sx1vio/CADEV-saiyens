import { Database, GitBranch, Globe, Smartphone, Sparkles, Terminal } from 'lucide-react';
import type { CourseMeta } from './types';

/** Les cours façon Duolingo, du plus demandé au plus spécialisé. Le contenu est chargé à la demande. */
export const COURSE_META: CourseMeta[] = [
  {
    id: 'web',
    title: 'Créer des sites web',
    tagline: 'HTML, CSS et JavaScript : de ta première page à un site en ligne.',
    forWho: 'Le meilleur point de départ si tu n’as jamais codé.',
    icon: Globe,
    color: '#2563eb',
    domain: 'web',
    certId: 'web-fondamentaux',
  },
  {
    id: 'python',
    title: 'Programmer en Python',
    tagline:
      'Variables, conditions, boucles, fonctions : la logique du code avec le langage le plus lisible.',
    forWho: 'Pour automatiser, analyser des données ou viser l’IA.',
    icon: Terminal,
    color: '#ca8a04',
    domain: 'data',
    certId: 'python-fondamentaux',
  },
  {
    id: 'git',
    title: 'Git et GitHub',
    tagline: 'Sauvegarder ton code, revenir en arrière, travailler à plusieurs et publier.',
    forWho: 'Indispensable dès ton premier projet, quel que soit ton langage.',
    icon: GitBranch,
    color: '#ea580c',
    domain: 'web',
    certId: 'git-fondamentaux',
  },
  {
    id: 'sql',
    title: 'Bases de données et SQL',
    tagline: 'Tables, requêtes, filtres, jointures : interroger et organiser des données.',
    forWho: 'Pour le back-end, la data, ou comprendre où vivent les données d’une app.',
    icon: Database,
    color: '#0891b2',
    domain: 'backend',
    certId: 'sql-fondamentaux',
  },
  {
    id: 'mobile',
    title: 'Apps mobiles avec Flutter',
    tagline: 'Dart et Flutter : une seule base de code pour Android et iPhone.',
    forWho: 'Si tu rêves de publier ton app sur le Play Store.',
    icon: Smartphone,
    color: '#7c3aed',
    domain: 'mobile',
  },
  {
    id: 'ia',
    title: 'Créer avec l’IA',
    tagline:
      'Bien demander, vérifier ce que l’IA produit et construire une app avec un agent de code.',
    forWho: 'Même sans savoir coder : tu apprends à piloter l’IA sans te faire piéger.',
    icon: Sparkles,
    color: '#db2777',
    domain: 'ai',
    certId: 'ia-usage-responsable',
  },
];

export const courseMeta = (id: string | null | undefined) =>
  COURSE_META.find((c) => c.id === id) ?? null;
