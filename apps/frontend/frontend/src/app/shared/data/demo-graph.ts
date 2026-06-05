import { SkillGraphNode } from '../components/skill-graph/skill-graph.component';

/**
 * Illustrative skill graph used on the public landing page. Mirrors a real dev
 * stack: nodes are sized by repo count and linked by what they build on.
 */
export const DEMO_GRAPH_NODES: SkillGraphNode[] = [
  { id: 'js', label: 'JavaScript', tier: 'core', repos: 21, group: 'language' },
  { id: 'ts', label: 'TypeScript', tier: 'core', repos: 18, group: 'language', deps: ['js'] },
  { id: 'htmlcss', label: 'HTML / CSS', tier: 'core', repos: 16, group: 'frontend' },
  { id: 'react', label: 'React', tier: 'core', repos: 12, group: 'frontend', deps: ['ts', 'htmlcss'] },
  { id: 'tailwind', label: 'Tailwind', tier: 'familiar', repos: 7, group: 'frontend', deps: ['htmlcss'] },
  { id: 'next', label: 'Next.js', tier: 'familiar', repos: 5, group: 'frontend', deps: ['react'] },
  { id: 'svelte', label: 'Svelte', tier: 'exposure', repos: 2, group: 'frontend', deps: ['js'] },
  { id: 'node', label: 'Node.js', tier: 'core', repos: 14, group: 'backend', deps: ['js'] },
  { id: 'nest', label: 'NestJS', tier: 'familiar', repos: 6, group: 'backend', deps: ['ts', 'node'] },
  { id: 'prisma', label: 'Prisma', tier: 'familiar', repos: 5, group: 'backend', deps: ['ts'] },
  { id: 'postgres', label: 'PostgreSQL', tier: 'familiar', repos: 8, group: 'data', deps: ['prisma'] },
  { id: 'python', label: 'Python', tier: 'familiar', repos: 9, group: 'language' },
  { id: 'fastapi', label: 'FastAPI', tier: 'exposure', repos: 3, group: 'backend', deps: ['python'] },
  { id: 'docker', label: 'Docker', tier: 'core', repos: 11, group: 'devops', deps: ['node'] },
  { id: 'gha', label: 'GitHub Actions', tier: 'familiar', repos: 7, group: 'devops', deps: ['docker'] },
  { id: 'k8s', label: 'Kubernetes', tier: 'exposure', repos: 2, group: 'devops', deps: ['docker'] },
];
