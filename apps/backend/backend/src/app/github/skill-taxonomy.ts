export type SkillCategory =
  | 'language'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'mobile'
  | 'testing'
  | 'tooling';

export interface TaxonomyEntry {
  canonicalTitle: string;
  category: SkillCategory;
  icon: string;
  aliases: string[];
  prerequisites?: string[];
}

export const SKILL_TAXONOMY: TaxonomyEntry[] = [
  // Languages
  { canonicalTitle: 'JavaScript', category: 'language', icon: 'code', aliases: ['javascript', 'js'] },
  { canonicalTitle: 'TypeScript', category: 'language', icon: 'code', aliases: ['typescript', 'ts'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Python', category: 'language', icon: 'code', aliases: ['python', 'py'] },
  { canonicalTitle: 'Go', category: 'language', icon: 'code', aliases: ['go', 'golang'] },
  { canonicalTitle: 'Rust', category: 'language', icon: 'code', aliases: ['rust'] },
  { canonicalTitle: 'Java', category: 'language', icon: 'code', aliases: ['java'] },
  { canonicalTitle: 'Kotlin', category: 'language', icon: 'code', aliases: ['kotlin'], prerequisites: ['Java'] },
  { canonicalTitle: 'Swift', category: 'language', icon: 'code', aliases: ['swift'] },
  { canonicalTitle: 'C#', category: 'language', icon: 'code', aliases: ['c#', 'csharp'] },
  { canonicalTitle: 'Ruby', category: 'language', icon: 'code', aliases: ['ruby'] },
  { canonicalTitle: 'PHP', category: 'language', icon: 'code', aliases: ['php'] },
  { canonicalTitle: 'Dart', category: 'language', icon: 'code', aliases: ['dart'] },

  // Frontend frameworks
  { canonicalTitle: 'React', category: 'frontend', icon: 'web', aliases: ['react', 'react-dom', 'react-scripts', 'next', 'nextjs', 'next.js'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Vue.js', category: 'frontend', icon: 'web', aliases: ['vue', '@vue/core', 'nuxt', 'nuxtjs'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Angular', category: 'frontend', icon: 'web', aliases: ['@angular/core', '@angular/common', 'angular'], prerequisites: ['TypeScript'] },
  { canonicalTitle: 'Svelte', category: 'frontend', icon: 'web', aliases: ['svelte', 'sveltekit', '@sveltejs/kit'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Tailwind CSS', category: 'frontend', icon: 'style', aliases: ['tailwindcss', 'tailwind'] },
  { canonicalTitle: 'Vite', category: 'tooling', icon: 'flash_on', aliases: ['vite', '@vitejs/plugin-react'] },
  { canonicalTitle: 'Webpack', category: 'tooling', icon: 'settings', aliases: ['webpack', 'webpack-cli'] },

  // Backend frameworks
  { canonicalTitle: 'Node.js', category: 'backend', icon: 'dns', aliases: ['node', 'nodejs'] },
  { canonicalTitle: 'NestJS', category: 'backend', icon: 'dns', aliases: ['@nestjs/core', '@nestjs/common', 'nestjs'], prerequisites: ['TypeScript', 'Node.js'] },
  { canonicalTitle: 'Express', category: 'backend', icon: 'dns', aliases: ['express', 'express.js'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'FastAPI', category: 'backend', icon: 'dns', aliases: ['fastapi'], prerequisites: ['Python'] },
  { canonicalTitle: 'Django', category: 'backend', icon: 'dns', aliases: ['django'], prerequisites: ['Python'] },
  { canonicalTitle: 'Flask', category: 'backend', icon: 'dns', aliases: ['flask'], prerequisites: ['Python'] },
  { canonicalTitle: 'Spring Boot', category: 'backend', icon: 'dns', aliases: ['spring-boot', 'spring', 'org.springframework'], prerequisites: ['Java'] },
  { canonicalTitle: 'Rails', category: 'backend', icon: 'dns', aliases: ['rails', 'ruby-on-rails', 'railties'], prerequisites: ['Ruby'] },
  { canonicalTitle: 'Laravel', category: 'backend', icon: 'dns', aliases: ['laravel', 'illuminate'], prerequisites: ['PHP'] },

  // Databases
  { canonicalTitle: 'PostgreSQL', category: 'database', icon: 'storage', aliases: ['pg', 'postgres', 'postgresql', '@prisma/client'] },
  { canonicalTitle: 'MySQL', category: 'database', icon: 'storage', aliases: ['mysql', 'mysql2'] },
  { canonicalTitle: 'MongoDB', category: 'database', icon: 'storage', aliases: ['mongodb', 'mongoose'] },
  { canonicalTitle: 'Redis', category: 'database', icon: 'storage', aliases: ['redis', 'ioredis'] },
  { canonicalTitle: 'SQLite', category: 'database', icon: 'storage', aliases: ['sqlite', 'sqlite3', 'better-sqlite3'] },
  { canonicalTitle: 'Prisma', category: 'tooling', icon: 'settings', aliases: ['prisma', '@prisma/client'] },

  // DevOps
  { canonicalTitle: 'Docker', category: 'devops', icon: 'cloud', aliases: ['docker', 'dockerfile'] },
  { canonicalTitle: 'Kubernetes', category: 'devops', icon: 'cloud', aliases: ['kubernetes', 'k8s', 'kubectl'], prerequisites: ['Docker'] },
  { canonicalTitle: 'GitHub Actions', category: 'devops', icon: 'settings_suggest', aliases: ['.github/workflows', 'github-actions'] },
  { canonicalTitle: 'Terraform', category: 'devops', icon: 'cloud', aliases: ['terraform', '.tf'] },

  // Mobile
  { canonicalTitle: 'React Native', category: 'mobile', icon: 'smartphone', aliases: ['react-native', 'expo'], prerequisites: ['React'] },
  { canonicalTitle: 'Flutter', category: 'mobile', icon: 'smartphone', aliases: ['flutter', 'flutter_test'], prerequisites: ['Dart'] },

  // Testing
  { canonicalTitle: 'Jest', category: 'testing', icon: 'science', aliases: ['jest', '@jest/core', 'jest-environment-jsdom'] },
  { canonicalTitle: 'Vitest', category: 'testing', icon: 'science', aliases: ['vitest'] },
  { canonicalTitle: 'Playwright', category: 'testing', icon: 'science', aliases: ['playwright', '@playwright/test'] },
  { canonicalTitle: 'Cypress', category: 'testing', icon: 'science', aliases: ['cypress'] },
  { canonicalTitle: 'pytest', category: 'testing', icon: 'science', aliases: ['pytest'], prerequisites: ['Python'] },

  // Tooling
  { canonicalTitle: 'GraphQL', category: 'tooling', icon: 'hub', aliases: ['graphql', '@apollo/client', 'apollo-server'] },
  { canonicalTitle: 'REST API', category: 'tooling', icon: 'api', aliases: ['axios', 'fetch', 'supertest'] },
  { canonicalTitle: 'WebSockets', category: 'tooling', icon: 'sync', aliases: ['socket.io', 'ws', '@nestjs/websockets'] },
  { canonicalTitle: 'JWT / Auth', category: 'tooling', icon: 'lock', aliases: ['jsonwebtoken', 'passport', 'passport-jwt', '@nestjs/jwt'] },
];

export interface MappedSkill {
  canonicalTitle: string;
  category: SkillCategory;
  icon: string;
  prerequisites: string[];
}

export function mapToSkill(detectedName: string): MappedSkill | null {
  const lower = detectedName.toLowerCase().trim();
  for (const entry of SKILL_TAXONOMY) {
    if (entry.aliases.some((alias) => lower === alias || lower.includes(alias))) {
      return {
        canonicalTitle: entry.canonicalTitle,
        category: entry.category,
        icon: entry.icon,
        prerequisites: entry.prerequisites ?? [],
      };
    }
  }
  return null;
}
