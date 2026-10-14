// Référentiel des étiquettes de technologies (source unique). L'API le synchronise en base à
// chaque démarrage (BUG-026) ; le seed de développement et la détection d'étiquettes (S9)
// l'utilisent aussi. Les alias relient les langages GitHub (X3) et les mots d'une erreur.

export interface ReferenceTag {
  slug: string;
  label: string;
  aliases: readonly string[];
}

const ROWS: ReadonlyArray<readonly [slug: string, label: string, aliases: readonly string[]]> = [
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

export const TAG_REFERENCE: readonly ReferenceTag[] = ROWS.map(([slug, label, aliases]) => ({
  slug,
  label,
  aliases,
}));
