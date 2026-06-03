export interface RoleProfile {
  label: string;
  required: string[];
  nice: string[];
}

export const ROLE_PROFILES: Record<string, RoleProfile> = {
  'senior-backend': {
    label: 'Senior Backend Engineer',
    required: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'Redis', 'GitHub Actions'],
    nice: ['Kubernetes', 'GraphQL', 'MongoDB', 'NestJS', 'JWT / Auth'],
  },
  'senior-frontend': {
    label: 'Senior Frontend Engineer',
    required: ['TypeScript', 'React', 'Tailwind CSS', 'Jest', 'Vite'],
    nice: ['GraphQL', 'Playwright', 'Vue.js', 'Webpack'],
  },
  'fullstack': {
    label: 'Full-Stack Engineer',
    required: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    nice: ['GraphQL', 'Redis', 'GitHub Actions', 'Jest', 'NestJS'],
  },
  'devops': {
    label: 'DevOps / Platform Engineer',
    required: ['Docker', 'Kubernetes', 'GitHub Actions', 'Terraform', 'Python'],
    nice: ['Go', 'Rust', 'PostgreSQL', 'Redis'],
  },
  'mobile': {
    label: 'Mobile Engineer',
    required: ['TypeScript', 'React Native', 'Jest'],
    nice: ['Flutter', 'Dart', 'GraphQL', 'Firebase'],
  },
  'ml-engineer': {
    label: 'ML / AI Engineer',
    required: ['Python', 'pytest'],
    nice: ['TypeScript', 'Docker', 'FastAPI', 'PostgreSQL'],
  },
};

export const ROLE_PROFILE_KEYS = Object.keys(ROLE_PROFILES);
