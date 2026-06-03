export type SkillRequirement =
  | string
  | { label: string; any: string[] };

export interface RoleProfile {
  label: string;
  core: SkillRequirement[];        // blocking requirements — 60% of score
  recommended: SkillRequirement[]; // strong signal — 30% of score
  emerging: string[];              // differentiators — 10% of score
}

// Prerequisites used for "almost there" hints
export const SKILL_PREREQUISITES: Record<string, string[]> = {
  'NestJS':       ['TypeScript', 'Node.js'],
  'Next.js':      ['React'],
  'Nuxt':         ['Vue.js'],
  'SvelteKit':    ['Svelte'],
  'Remix':        ['React'],
  'React Native': ['React'],
  'Expo':         ['React Native'],
  'Flutter':      ['Dart'],
  'Kubernetes':   ['Docker'],
  'Helm':         ['Kubernetes'],
  'ArgoCD':       ['Kubernetes'],
  'Express':      ['Node.js'],
  'Fastify':      ['Node.js'],
  'tRPC':         ['TypeScript'],
  'FastAPI':      ['Python'],
  'Django':       ['Python'],
  'Flask':        ['Python'],
  'PyTorch':      ['Python'],
  'TensorFlow':   ['Python'],
  'scikit-learn': ['Python', 'NumPy'],
  'pandas':       ['Python'],
  'MLflow':       ['Python'],
  'LangChain':    ['Python'],
  'Hugging Face': ['Python', 'PyTorch'],
  'Spring Boot':  ['Java'],
  'Kotlin':       ['Java'],
  'Angular':      ['TypeScript'],
  'Prisma':       ['Node.js'],
  'TypeORM':      ['TypeScript'],
  'Drizzle':      ['TypeScript'],
  'SQLAlchemy':   ['Python'],
  'Playwright':   ['JavaScript'],
  'Vitest':       ['JavaScript'],
  'Gin':          ['Go'],
  'Echo':         ['Go'],
  'Fiber':        ['Go'],
};

export const ROLE_PROFILES: Record<string, RoleProfile> = {
  'fullstack': {
    label: 'Full-Stack Engineer',
    core: [
      'TypeScript',
      { label: 'Frontend framework', any: ['React', 'Vue.js', 'Angular', 'Svelte'] },
      { label: 'Backend runtime',    any: ['Node.js', 'Python', 'Go'] },
      { label: 'Relational DB',      any: ['PostgreSQL', 'MySQL', 'SQLite'] },
      'Docker',
    ],
    recommended: [
      'GitHub Actions',
      { label: 'Testing',    any: ['Jest', 'Vitest', 'Playwright', 'Cypress'] },
      { label: 'API layer',  any: ['GraphQL', 'NestJS', 'Express', 'FastAPI', 'tRPC'] },
      'Redis',
      { label: 'ORM',        any: ['Prisma', 'Drizzle', 'TypeORM'] },
    ],
    emerging: ['Kubernetes', 'Terraform', 'GraphQL'],
  },

  'senior-backend': {
    label: 'Backend Engineer',
    core: [
      { label: 'Primary language', any: ['TypeScript', 'Go', 'Python', 'Java', 'Rust'] },
      { label: 'Runtime / platform', any: ['Node.js', 'Python', 'Go', 'Java'] },
      { label: 'Relational DB',      any: ['PostgreSQL', 'MySQL'] },
      'Docker',
      { label: 'Backend framework', any: ['NestJS', 'Express', 'FastAPI', 'Django', 'Spring Boot'] },
    ],
    recommended: [
      'Redis',
      'GitHub Actions',
      { label: 'Testing', any: ['Jest', 'Vitest', 'pytest'] },
      'Kubernetes',
      { label: 'ORM / query', any: ['Prisma', 'TypeORM', 'Drizzle', 'SQLAlchemy'] },
    ],
    emerging: ['Terraform', 'GraphQL', 'gRPC'],
  },

  'senior-frontend': {
    label: 'Frontend Engineer',
    core: [
      'TypeScript',
      { label: 'UI framework', any: ['React', 'Vue.js', 'Angular', 'Svelte'] },
      { label: 'Build tool',   any: ['Vite', 'Webpack'] },
      { label: 'Styling',      any: ['Tailwind CSS', 'CSS Modules'] },
    ],
    recommended: [
      { label: 'Testing', any: ['Jest', 'Vitest', 'Playwright', 'Cypress', 'Testing Library'] },
      'GitHub Actions',
      { label: 'Meta-framework', any: ['Next.js', 'Nuxt', 'Remix', 'SvelteKit', 'Astro'] },
      { label: 'API client', any: ['GraphQL', 'tRPC'] },
    ],
    emerging: ['Storybook', 'Sass'],
  },

  'devops': {
    label: 'DevOps Engineer',
    core: [
      'Docker',
      'Kubernetes',
      { label: 'Infrastructure as code', any: ['Terraform'] },
      'GitHub Actions',
      { label: 'Scripting language', any: ['Python', 'Go', 'TypeScript'] },
    ],
    recommended: [
      'Redis',
      { label: 'Relational DB', any: ['PostgreSQL', 'MySQL'] },
      'Helm',
    ],
    emerging: ['ArgoCD', 'Crossplane'],
  },

  'ml-engineer': {
    label: 'ML Engineer',
    core: [
      'Python',
      { label: 'ML framework', any: ['PyTorch', 'TensorFlow', 'scikit-learn'] },
      { label: 'Data library',  any: ['pandas', 'NumPy'] },
      { label: 'Data store',    any: ['PostgreSQL', 'MongoDB', 'Redis'] },
    ],
    recommended: [
      'Docker',
      { label: 'API serving',  any: ['FastAPI', 'Flask'] },
      'GitHub Actions',
      { label: 'ML workflow',  any: ['Jupyter', 'MLflow'] },
      'pytest',
    ],
    emerging: ['LangChain', 'Hugging Face', 'MLflow'],
  },

  'mobile': {
    label: 'Mobile Developer',
    core: [
      { label: 'Cross-platform', any: ['React Native', 'Flutter'] },
      { label: 'Language', any: ['TypeScript', 'Dart'] },
      { label: 'Testing', any: ['Jest', 'Cypress'] },
    ],
    recommended: [
      { label: 'Native language', any: ['Swift', 'Kotlin'] },
      'Firebase',
      'GraphQL',
      'GitHub Actions',
    ],
    emerging: ['Expo'],
  },
};

export const ROLE_PROFILE_KEYS = Object.keys(ROLE_PROFILES);
