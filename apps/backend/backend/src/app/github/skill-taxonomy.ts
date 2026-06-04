export type SkillCategory =
  | 'language'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'mobile'
  | 'testing'
  | 'ml'
  | 'tooling';

export interface TaxonomyEntry {
  canonicalTitle: string;
  category: SkillCategory;
  icon: string;
  aliases: string[];
  prerequisites?: string[];
}

export const SKILL_TAXONOMY: TaxonomyEntry[] = [
  // ── Languages ──────────────────────────────────────────────────────────────
  { canonicalTitle: 'JavaScript', category: 'language', icon: 'code', aliases: ['javascript', 'js'] },
  { canonicalTitle: 'TypeScript', category: 'language', icon: 'code', aliases: ['typescript', 'ts'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Python',     category: 'language', icon: 'code', aliases: ['python', 'py'] },
  { canonicalTitle: 'Go',         category: 'language', icon: 'code', aliases: ['go', 'golang'] },
  { canonicalTitle: 'Rust',       category: 'language', icon: 'code', aliases: ['rust'] },
  { canonicalTitle: 'Java',       category: 'language', icon: 'code', aliases: ['java'] },
  { canonicalTitle: 'Kotlin',     category: 'language', icon: 'code', aliases: ['kotlin'], prerequisites: ['Java'] },
  { canonicalTitle: 'Swift',      category: 'language', icon: 'code', aliases: ['swift'] },
  { canonicalTitle: 'C#',         category: 'language', icon: 'code', aliases: ['c#', 'csharp'] },
  { canonicalTitle: 'Ruby',       category: 'language', icon: 'code', aliases: ['ruby'] },
  { canonicalTitle: 'PHP',        category: 'language', icon: 'code', aliases: ['php'] },
  { canonicalTitle: 'Dart',       category: 'language', icon: 'code', aliases: ['dart'] },
  { canonicalTitle: 'Elixir',     category: 'language', icon: 'code', aliases: ['elixir'] },
  { canonicalTitle: 'Scala',      category: 'language', icon: 'code', aliases: ['scala'], prerequisites: ['Java'] },
  { canonicalTitle: 'C++',        category: 'language', icon: 'code', aliases: ['c++', 'cpp'], prerequisites: ['C'] },
  { canonicalTitle: 'C',          category: 'language', icon: 'code', aliases: ['c'] },
  { canonicalTitle: 'Shell',      category: 'language', icon: 'terminal', aliases: ['shell', 'bash', 'shellscript'] },
  { canonicalTitle: 'Assembly',   category: 'language', icon: 'memory', aliases: ['assembly'] },
  { canonicalTitle: 'Perl',       category: 'language', icon: 'code', aliases: ['perl'] },
  { canonicalTitle: 'Lua',        category: 'language', icon: 'code', aliases: ['lua'] },
  { canonicalTitle: 'Haskell',    category: 'language', icon: 'code', aliases: ['haskell'] },
  { canonicalTitle: 'Clojure',    category: 'language', icon: 'code', aliases: ['clojure'], prerequisites: ['Java'] },
  { canonicalTitle: 'OCaml',      category: 'language', icon: 'code', aliases: ['ocaml'] },
  { canonicalTitle: 'Zig',        category: 'language', icon: 'code', aliases: ['zig'] },
  { canonicalTitle: 'Objective-C', category: 'language', icon: 'code', aliases: ['objective-c', 'objectivec'], prerequisites: ['C'] },
  { canonicalTitle: 'Groovy',     category: 'language', icon: 'code', aliases: ['groovy'], prerequisites: ['Java'] },
  { canonicalTitle: 'Julia',      category: 'language', icon: 'code', aliases: ['julia'] },

  // ── Frontend frameworks ────────────────────────────────────────────────────
  { canonicalTitle: 'React',    category: 'frontend', icon: 'web', aliases: ['react', 'react-dom', 'react-scripts'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Vue.js',   category: 'frontend', icon: 'web', aliases: ['vue', '@vue/core', '@vue/runtime-dom'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Angular',  category: 'frontend', icon: 'web', aliases: ['@angular/core', '@angular/common', 'angular'], prerequisites: ['TypeScript'] },
  { canonicalTitle: 'Svelte',   category: 'frontend', icon: 'web', aliases: ['svelte'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Next.js',  category: 'frontend', icon: 'web', aliases: ['next', 'nextjs', 'next.js'], prerequisites: ['React'] },
  { canonicalTitle: 'Nuxt',     category: 'frontend', icon: 'web', aliases: ['nuxt', 'nuxtjs', '@nuxt/core', '@nuxt/kit'], prerequisites: ['Vue.js'] },
  { canonicalTitle: 'SvelteKit', category: 'frontend', icon: 'web', aliases: ['@sveltejs/kit', 'sveltekit'], prerequisites: ['Svelte'] },
  { canonicalTitle: 'Remix',    category: 'frontend', icon: 'web', aliases: ['@remix-run/react', '@remix-run/node', 'remix'], prerequisites: ['React'] },
  { canonicalTitle: 'Astro',    category: 'frontend', icon: 'web', aliases: ['astro', '@astrojs/core'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Tailwind CSS', category: 'frontend', icon: 'style', aliases: ['tailwindcss', 'tailwind', '@tailwindcss/forms'] },
  { canonicalTitle: 'Sass',     category: 'frontend', icon: 'style', aliases: ['sass', 'node-sass', 'sass-loader'] },
  { canonicalTitle: 'Storybook', category: 'tooling', icon: 'auto_stories', aliases: ['@storybook/react', '@storybook/vue3', '@storybook/angular', '@storybook/core', 'storybook'], prerequisites: ['JavaScript'] },

  // ── Build tools ───────────────────────────────────────────────────────────
  { canonicalTitle: 'Vite',    category: 'tooling', icon: 'flash_on', aliases: ['vite', '@vitejs/plugin-react', '@vitejs/plugin-vue'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Webpack', category: 'tooling', icon: 'settings', aliases: ['webpack', 'webpack-cli', 'webpack-dev-server'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Turbopack / Turborepo', category: 'tooling', icon: 'speed', aliases: ['turbo', '@turbo/gen', 'turborepo'], prerequisites: ['JavaScript'] },

  // ── Node.js backend ────────────────────────────────────────────────────────
  { canonicalTitle: 'Node.js',     category: 'backend', icon: 'dns', aliases: ['node', 'nodejs'] },
  { canonicalTitle: 'NestJS',      category: 'backend', icon: 'dns', aliases: ['@nestjs/core', '@nestjs/common', 'nestjs'], prerequisites: ['TypeScript', 'Node.js'] },
  { canonicalTitle: 'Express',     category: 'backend', icon: 'dns', aliases: ['express', 'express.js'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'Fastify',     category: 'backend', icon: 'dns', aliases: ['fastify', '@fastify/core'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'Hono',        category: 'backend', icon: 'dns', aliases: ['hono'], prerequisites: ['TypeScript'] },
  { canonicalTitle: 'Koa',         category: 'backend', icon: 'dns', aliases: ['koa', 'koa-router'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'tRPC',        category: 'backend', icon: 'api', aliases: ['@trpc/server', '@trpc/client', '@trpc/react-query'], prerequisites: ['TypeScript'] },
  { canonicalTitle: 'Apollo Server', category: 'backend', icon: 'api', aliases: ['apollo-server', '@apollo/server', 'apollo-server-express'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'gRPC',        category: 'backend', icon: 'api', aliases: ['@grpc/grpc-js', 'grpc', '@grpc/proto-loader'] },

  // ── Python backend ────────────────────────────────────────────────────────
  { canonicalTitle: 'FastAPI',    category: 'backend', icon: 'dns', aliases: ['fastapi'], prerequisites: ['Python'] },
  { canonicalTitle: 'Django',     category: 'backend', icon: 'dns', aliases: ['django'], prerequisites: ['Python'] },
  { canonicalTitle: 'Flask',      category: 'backend', icon: 'dns', aliases: ['flask'], prerequisites: ['Python'] },
  { canonicalTitle: 'Celery',     category: 'backend', icon: 'dns', aliases: ['celery'], prerequisites: ['Python'] },

  // ── Go backend ────────────────────────────────────────────────────────────
  { canonicalTitle: 'Gin',  category: 'backend', icon: 'dns', aliases: ['github.com/gin-gonic/gin', 'gin-gonic/gin'], prerequisites: ['Go'] },
  { canonicalTitle: 'Echo', category: 'backend', icon: 'dns', aliases: ['github.com/labstack/echo', 'labstack/echo'], prerequisites: ['Go'] },
  { canonicalTitle: 'Fiber', category: 'backend', icon: 'dns', aliases: ['github.com/gofiber/fiber', 'gofiber/fiber'], prerequisites: ['Go'] },

  // ── Java/JVM backend ─────────────────────────────────────────────────────
  { canonicalTitle: 'Spring Boot', category: 'backend', icon: 'dns', aliases: ['spring-boot', 'spring', 'org.springframework', 'spring-boot-starter'], prerequisites: ['Java'] },
  { canonicalTitle: 'Rails',   category: 'backend', icon: 'dns', aliases: ['rails', 'ruby-on-rails', 'railties'], prerequisites: ['Ruby'] },
  { canonicalTitle: 'Laravel', category: 'backend', icon: 'dns', aliases: ['laravel', 'illuminate', 'laravel/framework'], prerequisites: ['PHP'] },
  { canonicalTitle: 'Phoenix', category: 'backend', icon: 'dns', aliases: ['phoenix', 'plug'], prerequisites: ['Elixir'] },

  // ── Databases ─────────────────────────────────────────────────────────────
  { canonicalTitle: 'PostgreSQL', category: 'database', icon: 'storage', aliases: ['pg', 'postgres', 'postgresql', 'psycopg2', 'asyncpg', 'psycopg2-binary'] },
  { canonicalTitle: 'MySQL',      category: 'database', icon: 'storage', aliases: ['mysql', 'mysql2', 'mysqlclient', 'pymysql'] },
  { canonicalTitle: 'MongoDB',    category: 'database', icon: 'storage', aliases: ['mongodb', 'mongoose', 'motor', 'pymongo'] },
  { canonicalTitle: 'Redis',      category: 'database', icon: 'storage', aliases: ['redis', 'ioredis', 'aioredis'] },
  { canonicalTitle: 'SQLite',     category: 'database', icon: 'storage', aliases: ['sqlite', 'sqlite3', 'better-sqlite3', 'aiosqlite'] },
  { canonicalTitle: 'Elasticsearch', category: 'database', icon: 'storage', aliases: ['elasticsearch', '@elastic/elasticsearch', 'elasticsearch-py'] },
  { canonicalTitle: 'Supabase',   category: 'database', icon: 'storage', aliases: ['@supabase/supabase-js', 'supabase'], prerequisites: ['PostgreSQL'] },
  { canonicalTitle: 'Firebase',   category: 'database', icon: 'storage', aliases: ['firebase', 'firebase-admin', '@firebase/app'] },

  // ── ORMs / query builders ─────────────────────────────────────────────────
  { canonicalTitle: 'Prisma',      category: 'tooling', icon: 'settings', aliases: ['prisma', '@prisma/client', 'prisma-client-js'], prerequisites: ['TypeScript'] },
  { canonicalTitle: 'TypeORM',     category: 'tooling', icon: 'settings', aliases: ['typeorm'], prerequisites: ['TypeScript'] },
  { canonicalTitle: 'Drizzle',     category: 'tooling', icon: 'settings', aliases: ['drizzle-orm', 'drizzle-kit'], prerequisites: ['TypeScript'] },
  { canonicalTitle: 'Sequelize',   category: 'tooling', icon: 'settings', aliases: ['sequelize', 'sequelize-cli'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'SQLAlchemy',  category: 'tooling', icon: 'settings', aliases: ['sqlalchemy', 'sqlalchemy', 'alembic'], prerequisites: ['Python'] },

  // ── DevOps / Infrastructure ───────────────────────────────────────────────
  { canonicalTitle: 'Docker',          category: 'devops', icon: 'cloud', aliases: ['docker', 'dockerfile', 'docker-compose', 'compose'] },
  { canonicalTitle: 'Kubernetes',      category: 'devops', icon: 'cloud', aliases: ['kubernetes', 'k8s', 'kubectl'], prerequisites: ['Docker'] },
  { canonicalTitle: 'Helm',            category: 'devops', icon: 'cloud', aliases: ['helm', 'chart.yaml'], prerequisites: ['Kubernetes'] },
  { canonicalTitle: 'Terraform',       category: 'devops', icon: 'cloud', aliases: ['terraform', '.tf', 'hashicorp/terraform', 'terraform-aws'] },
  { canonicalTitle: 'GitHub Actions',  category: 'devops', icon: 'settings_suggest', aliases: ['.github/workflows', 'github-actions', 'actions/checkout'] },
  { canonicalTitle: 'AWS',             category: 'devops', icon: 'cloud', aliases: ['aws-cdk-lib', '@aws-cdk/core', 'aws-sdk', 'boto3', 'botocore', 'aws-actions', 'amazon-linux', 'awscli', '@aws-sdk/client-s3'] },
  { canonicalTitle: 'GCP',             category: 'devops', icon: 'cloud', aliases: ['google-cloud-storage', 'google-cloud', '@google-cloud/storage', 'google-cloud-sdk', 'googleapiclient'] },
  { canonicalTitle: 'Azure',           category: 'devops', icon: 'cloud', aliases: ['azure', '@azure/identity', 'azure-storage-blob', 'azure-devops'] },
  { canonicalTitle: 'Nginx',           category: 'devops', icon: 'cloud', aliases: ['nginx', 'nginx.conf'] },
  { canonicalTitle: 'ArgoCD',          category: 'devops', icon: 'cloud', aliases: ['argocd', 'argo-cd', 'argoproj'], prerequisites: ['Kubernetes'] },
  { canonicalTitle: 'Ansible',         category: 'devops', icon: 'cloud', aliases: ['ansible', 'ansible-playbook'] },

  // ── Mobile ────────────────────────────────────────────────────────────────
  { canonicalTitle: 'React Native', category: 'mobile', icon: 'smartphone', aliases: ['react-native'], prerequisites: ['React'] },
  { canonicalTitle: 'Expo',         category: 'mobile', icon: 'smartphone', aliases: ['expo', '@expo/cli', 'expo-router'], prerequisites: ['React Native'] },
  { canonicalTitle: 'Flutter',      category: 'mobile', icon: 'smartphone', aliases: ['flutter', 'flutter_test', 'flutter_sdk'], prerequisites: ['Dart'] },

  // ── Testing ───────────────────────────────────────────────────────────────
  { canonicalTitle: 'Jest',       category: 'testing', icon: 'science', aliases: ['jest', '@jest/core', 'jest-environment-jsdom', '@types/jest'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Vitest',     category: 'testing', icon: 'science', aliases: ['vitest', '@vitest/coverage-v8'], prerequisites: ['Vite', 'JavaScript'] },
  { canonicalTitle: 'Playwright', category: 'testing', icon: 'science', aliases: ['playwright', '@playwright/test'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Cypress',    category: 'testing', icon: 'science', aliases: ['cypress', 'cypress-io'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'pytest',     category: 'testing', icon: 'science', aliases: ['pytest', 'pytest-asyncio', 'pytest-cov'], prerequisites: ['Python'] },
  { canonicalTitle: 'Testing Library', category: 'testing', icon: 'science', aliases: ['@testing-library/react', '@testing-library/vue', '@testing-library/dom', 'testing-library'], prerequisites: ['JavaScript'] },

  // ── ML / Data Science ─────────────────────────────────────────────────────
  { canonicalTitle: 'PyTorch',     category: 'ml', icon: 'psychology', aliases: ['torch', 'torchvision', 'torchaudio'], prerequisites: ['Python'] },
  { canonicalTitle: 'TensorFlow',  category: 'ml', icon: 'psychology', aliases: ['tensorflow', 'tensorflow-cpu', 'tensorflow-gpu', 'tf'], prerequisites: ['Python'] },
  { canonicalTitle: 'scikit-learn', category: 'ml', icon: 'psychology', aliases: ['scikit-learn', 'sklearn'], prerequisites: ['Python'] },
  { canonicalTitle: 'pandas',      category: 'ml', icon: 'psychology', aliases: ['pandas'], prerequisites: ['Python'] },
  { canonicalTitle: 'NumPy',       category: 'ml', icon: 'psychology', aliases: ['numpy', 'np'], prerequisites: ['Python'] },
  { canonicalTitle: 'Jupyter',     category: 'ml', icon: 'psychology', aliases: ['jupyter', 'jupyterlab', 'notebook', 'ipykernel'], prerequisites: ['Python'] },
  { canonicalTitle: 'MLflow',      category: 'ml', icon: 'psychology', aliases: ['mlflow'], prerequisites: ['Python'] },
  { canonicalTitle: 'LangChain',   category: 'ml', icon: 'psychology', aliases: ['langchain', 'langchain-core', 'langchain-community'], prerequisites: ['Python'] },
  { canonicalTitle: 'Hugging Face', category: 'ml', icon: 'psychology', aliases: ['transformers', 'huggingface_hub', 'datasets', 'diffusers'], prerequisites: ['Python'] },
  { canonicalTitle: 'OpenAI SDK',  category: 'ml', icon: 'psychology', aliases: ['openai', '@openai/openai'], prerequisites: ['Python'] },

  // ── API / Protocols ───────────────────────────────────────────────────────
  { canonicalTitle: 'GraphQL',    category: 'tooling', icon: 'hub', aliases: ['graphql', '@apollo/client', 'graphql-tag'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'REST API',   category: 'tooling', icon: 'api', aliases: ['axios', 'supertest', 'got', 'node-fetch'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'WebSockets', category: 'tooling', icon: 'sync', aliases: ['socket.io', 'ws', '@nestjs/websockets', 'socket.io-client'], prerequisites: ['Node.js'] },
  { canonicalTitle: 'JWT / Auth', category: 'tooling', icon: 'lock', aliases: ['jsonwebtoken', 'passport', 'passport-jwt', '@nestjs/jwt', 'python-jose', 'authjs', 'next-auth'], prerequisites: ['Node.js'] },

  // ── Observability / Tooling ──────────────────────────────────────────────
  { canonicalTitle: 'ESLint',   category: 'tooling', icon: 'check_circle', aliases: ['eslint', '@eslint/js', '@typescript-eslint/parser'], prerequisites: ['JavaScript'] },
  { canonicalTitle: 'Prettier', category: 'tooling', icon: 'format_paint', aliases: ['prettier', 'eslint-config-prettier'], prerequisites: ['JavaScript'] },
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
    // Exact match always; substring match only for aliases >= 3 chars, so short
    // aliases like "c", "go", "js" don't false-match (e.g. "javascript" includes "c").
    if (entry.aliases.some((alias) => {
      const a = alias.toLowerCase();
      return lower === a || (a.length >= 3 && lower.includes(a));
    })) {
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
