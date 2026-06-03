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
  'React Native': ['React'],
  'Flutter':      ['Dart'],
  'Kubernetes':   ['Docker'],
  'Express':      ['Node.js'],
  'FastAPI':      ['Python'],
  'Django':       ['Python'],
  'Flask':        ['Python'],
  'Spring Boot':  ['Java'],
  'Kotlin':       ['Java'],
  'Angular':      ['TypeScript'],
  'Prisma':       ['Node.js'],
  'Playwright':   ['JavaScript'],
  'Vitest':       ['JavaScript'],
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
      { label: 'API layer',  any: ['GraphQL', 'NestJS', 'Express', 'FastAPI'] },
      'Redis',
      'Prisma',
    ],
    emerging: ['Kubernetes', 'Terraform', 'GraphQL'],
  },

  'senior-backend': {
    label: 'Senior Backend Engineer',
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
      { label: 'ORM / query', any: ['Prisma', 'TypeORM', 'SQLAlchemy'] },
    ],
    emerging: ['Terraform', 'GraphQL'],
  },

  'senior-frontend': {
    label: 'Senior Frontend Engineer',
    core: [
      'TypeScript',
      { label: 'UI framework', any: ['React', 'Vue.js', 'Angular', 'Svelte'] },
      { label: 'Build tool',   any: ['Vite', 'Webpack'] },
      { label: 'Styling',      any: ['Tailwind CSS', 'CSS Modules'] },
    ],
    recommended: [
      { label: 'Testing', any: ['Jest', 'Vitest', 'Playwright', 'Cypress'] },
      'GitHub Actions',
      { label: 'Meta-framework', any: ['Next.js', 'Nuxt', 'Remix'] },
      'GraphQL',
    ],
    emerging: ['Storybook', 'Web Components'],
  },

  'devops': {
    label: 'DevOps / Platform Engineer',
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
    label: 'ML / AI Engineer',
    core: [
      'Python',
      { label: 'ML framework', any: ['PyTorch', 'TensorFlow', 'scikit-learn'] },
      'pytest',
      { label: 'Data store',   any: ['PostgreSQL', 'MongoDB', 'Redis'] },
    ],
    recommended: [
      'Docker',
      { label: 'API serving', any: ['FastAPI', 'Flask'] },
      'GitHub Actions',
      { label: 'Workflow', any: ['Jupyter', 'MLflow'] },
    ],
    emerging: ['Ray', 'DVC', 'LangChain'],
  },

  'mobile': {
    label: 'Mobile Engineer',
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
