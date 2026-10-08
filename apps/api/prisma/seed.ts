// Données de référence : étiquettes de technologies et leurs alias.
// Les alias servent à relier les langages GitHub (X3) et à la détection d'étiquettes (S9).
// Idempotent : peut être relancé sans créer de doublon.
import { PrismaPg } from '@prisma/adapter-pg';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });

const TAGS: Array<[slug: string, label: string, aliases: string[]]> = [
  ['javascript', 'JavaScript', ['JavaScript', 'js']],
  ['typescript', 'TypeScript', ['TypeScript', 'ts']],
  ['python', 'Python', ['Python', 'py']],
  ['java', 'Java', ['Java']],
  ['kotlin', 'Kotlin', ['Kotlin']],
  ['php', 'PHP', ['PHP']],
  ['go', 'Go', ['Go', 'golang']],
  ['rust', 'Rust', ['Rust']],
  ['csharp', 'C#', ['C#', 'dotnet', '.net']],
  ['c', 'C', ['C']],
  ['cpp', 'C++', ['C++']],
  ['dart', 'Dart', ['Dart']],
  ['swift', 'Swift', ['Swift']],
  ['ruby', 'Ruby', ['Ruby']],
  ['html', 'HTML', ['HTML']],
  ['css', 'CSS', ['CSS', 'SCSS', 'Sass']],
  ['shell', 'Shell', ['Shell', 'bash']],
  ['nodejs', 'Node.js', ['node', 'node.js']],
  ['react', 'React', ['reactjs', 'react.js']],
  ['react-native', 'React Native', ['rn']],
  ['nextjs', 'Next.js', ['next', 'next.js']],
  ['vue', 'Vue.js', ['Vue', 'vuejs']],
  ['angular', 'Angular', []],
  ['svelte', 'Svelte', ['Svelte']],
  ['flutter', 'Flutter', []],
  ['android', 'Android', ['gradle']],
  ['nestjs', 'NestJS', ['nest']],
  ['express', 'Express', ['expressjs']],
  ['django', 'Django', []],
  ['fastapi', 'FastAPI', []],
  ['laravel', 'Laravel', []],
  ['spring', 'Spring', ['spring-boot']],
  ['postgresql', 'PostgreSQL', ['postgres', 'PLpgSQL']],
  ['mysql', 'MySQL', []],
  ['mongodb', 'MongoDB', ['mongo']],
  ['redis', 'Redis', []],
  ['sql', 'SQL', ['TSQL']],
  ['docker', 'Docker', ['Dockerfile', 'docker-compose']],
  ['kubernetes', 'Kubernetes', ['k8s']],
  ['nginx', 'nginx', []],
  ['linux', 'Linux', []],
  ['git', 'Git', ['github']],
  ['aws', 'AWS', ['amazon-web-services']],
  ['firebase', 'Firebase', []],
  ['graphql', 'GraphQL', []],
  ['rest-api', 'API REST', ['rest', 'api']],
  ['mobile-money', 'Mobile Money', ['momo', 'orange-money', 'mtn-momo', 'wave']],
  ['security', 'Sécurité', ['oauth', 'jwt']],
  ['devops', 'DevOps', ['ci', 'cd', 'github-actions']],
  ['machine-learning', 'Machine learning', ['ml', 'ai', 'Jupyter Notebook']],
  ['pwa', 'PWA', ['service-worker', 'workbox']],
  ['tailwind', 'Tailwind CSS', ['tailwindcss']],
];

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const [slug, label, aliases] of TAGS) {
      await prisma.tag.upsert({
        where: { slug },
        create: { slug, label, aliases },
        update: { label, aliases },
      });
    }
    console.log(`${TAGS.length} étiquettes à jour.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
