import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { mapToSkill } from './skill-taxonomy';
import { DetectedTech, EvidenceRepo, GitHubRepo } from './github.types';

const MANIFEST_FILES = [
  'package.json',
  'requirements.txt',
  'Pipfile',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'pubspec.yaml',
  'Gemfile',
  'composer.json',
  'mix.exs',
];

const MAX_REPOS = 100;
const MAX_EXTERNAL_REPOS = 20;
const MANIFEST_TIMEOUT_MS = 4000;
const REPO_LIST_TIMEOUT_MS = 10000;

/** Thrown by username scanning when GitHub has no such user. */
export const GITHUB_USER_NOT_FOUND = 'GITHUB_USER_NOT_FOUND';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  async detectTechnologies(accessToken: string, githubUsername: string): Promise<DetectedTech[]> {
    const repos = await this.fetchRepos(accessToken);
    const techMap = new Map<string, DetectedTech>();

    await Promise.all(
      repos.map((repo) => this.analyzeRepo(repo, accessToken, githubUsername, techMap)),
    );

    return Array.from(techMap.values()).sort((a, b) => b.repos.length - a.repos.length);
  }

  /**
   * Detect technologies for an arbitrary public GitHub user (not necessarily a
   * site member), e.g. "torvalds". `accessToken` is used only to lift GitHub
   * rate limits for public reads; it may be empty for best-effort unauthenticated access.
   */
  async detectTechnologiesForUsername(username: string, accessToken: string): Promise<DetectedTech[]> {
    const repos = await this.fetchReposForUsername(username, accessToken);
    const techMap = new Map<string, DetectedTech>();

    await Promise.all(
      repos.map((repo) => this.analyzeRepo(repo, accessToken, username, techMap)),
    );

    return Array.from(techMap.values()).sort((a, b) => b.repos.length - a.repos.length);
  }

  private async fetchReposForUsername(username: string, accessToken: string): Promise<GitHubRepo[]> {
    const all: GitHubRepo[] = [];
    let page = 1;

    while (all.length < MAX_EXTERNAL_REPOS) {
      let response;
      try {
        response = await axios.get<GitHubRepo[]>(
          `https://api.github.com/users/${encodeURIComponent(username)}/repos`,
          {
            params: { per_page: 50, page, sort: 'pushed', type: 'owner' },
            headers: this.publicHeaders(accessToken),
            timeout: REPO_LIST_TIMEOUT_MS,
          },
        );
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          throw new Error(GITHUB_USER_NOT_FOUND);
        }
        this.logger.warn(`Failed to fetch repos for @${username} page ${page}: ${this.errMsg(err)}`);
        break;
      }

      if (!response.data.length) break;
      all.push(...response.data.filter((r) => !r.fork));
      if (response.data.length < 50) break;
      page++;
    }

    return all.slice(0, MAX_EXTERNAL_REPOS);
  }

  private async fetchRepos(accessToken: string): Promise<GitHubRepo[]> {
    const all: GitHubRepo[] = [];
    let page = 1;

    while (all.length < MAX_REPOS) {
      try {
        const response = await axios.get<GitHubRepo[]>('https://api.github.com/user/repos', {
          params: { per_page: 50, page, sort: 'pushed', affiliation: 'owner' },
          headers: this.authHeaders(accessToken),
          timeout: REPO_LIST_TIMEOUT_MS,
        });

        if (!response.data.length) break;
        all.push(...response.data.filter((r) => !r.fork));
        if (response.data.length < 50) break;
        page++;
      } catch (err) {
        this.logger.warn(`Failed to fetch repos page ${page}: ${this.errMsg(err)}`);
        break;
      }
    }

    return all.slice(0, MAX_REPOS);
  }

  private async analyzeRepo(
    repo: GitHubRepo,
    accessToken: string,
    githubUsername: string,
    techMap: Map<string, DetectedTech>,
  ): Promise<void> {
    // Primary language reported by GitHub
    if (repo.language) {
      this.addTech(repo.language, repo, githubUsername, techMap, `primary language`);
    }

    // Full language breakdown — the single "primary language" field misses
    // secondary languages a developer clearly works in (e.g. Assembly + Shell
    // alongside C). Count the top languages by bytes, plus any that are a
    // meaningful share of the repo, so trace amounts don't add noise.
    try {
      const langResp = await axios.get<Record<string, number>>(
        `https://api.github.com/repos/${repo.full_name}/languages`,
        { headers: this.publicHeaders(accessToken), timeout: MANIFEST_TIMEOUT_MS },
      );
      const langs = Object.entries(langResp.data ?? {}).sort((a, b) => b[1] - a[1]);
      const total = langs.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;
      langs
        .filter(([, bytes], i) => i < 3 || bytes / total >= 0.1)
        .forEach(([lang]) => this.addTech(lang, repo, githubUsername, techMap, 'repo language'));
    } catch {
      // languages endpoint unavailable — primary language above still counted
    }

    // Manifest files detection
    for (const manifest of MANIFEST_FILES) {
      try {
        const resp = await axios.get<{ content?: string }>(
          `https://api.github.com/repos/${repo.full_name}/contents/${manifest}`,
          { headers: this.authHeaders(accessToken), timeout: MANIFEST_TIMEOUT_MS },
        );
        if (resp.data?.content) {
          const raw = Buffer.from(resp.data.content, 'base64').toString('utf-8');
          this.extractFromManifest(manifest, raw, repo, githubUsername, techMap);
        }
      } catch {
        // 404 = file doesn't exist in this repo, skip silently
      }
    }

    // Dockerfile or docker-compose presence
    await Promise.all([
      axios.get(`https://api.github.com/repos/${repo.full_name}/contents/Dockerfile`, {
        headers: this.authHeaders(accessToken), timeout: MANIFEST_TIMEOUT_MS,
      }).then(() => this.addTech('Docker', repo, githubUsername, techMap, 'Dockerfile')).catch(() => null),
      axios.get(`https://api.github.com/repos/${repo.full_name}/contents/docker-compose.yml`, {
        headers: this.authHeaders(accessToken), timeout: MANIFEST_TIMEOUT_MS,
      }).then(() => this.addTech('Docker', repo, githubUsername, techMap, 'docker-compose.yml')).catch(() => null),
      axios.get(`https://api.github.com/repos/${repo.full_name}/contents/docker-compose.yaml`, {
        headers: this.authHeaders(accessToken), timeout: MANIFEST_TIMEOUT_MS,
      }).then(() => this.addTech('Docker', repo, githubUsername, techMap, 'docker-compose.yaml')).catch(() => null),
    ]);

    // GitHub Actions — scan workflow files for tool usage
    try {
      const wf = await axios.get<Array<{ name: string; download_url?: string }>>(
        `https://api.github.com/repos/${repo.full_name}/contents/.github/workflows`,
        { headers: this.authHeaders(accessToken), timeout: MANIFEST_TIMEOUT_MS },
      );
      if (Array.isArray(wf.data) && wf.data.length > 0) {
        this.addTech('GitHub Actions', repo, githubUsername, techMap, '.github/workflows');
        // Scan first workflow file for tool mentions
        const firstWf = wf.data.find(f => f.name.endsWith('.yml') || f.name.endsWith('.yaml'));
        if (firstWf?.download_url) {
          try {
            const wfContent = await axios.get<string>(firstWf.download_url, { timeout: MANIFEST_TIMEOUT_MS });
            this.extractFromWorkflow(String(wfContent.data), repo, githubUsername, techMap);
          } catch { /* silent */ }
        }
      }
    } catch {
      // no workflows
    }

    // Chart.yaml → Helm
    try {
      await axios.get(`https://api.github.com/repos/${repo.full_name}/contents/Chart.yaml`, {
        headers: this.authHeaders(accessToken), timeout: MANIFEST_TIMEOUT_MS,
      });
      this.addTech('helm', repo, githubUsername, techMap, 'Chart.yaml');
    } catch { /* no Chart.yaml */ }
  }

  private extractFromManifest(
    filename: string,
    content: string,
    repo: GitHubRepo,
    githubUsername: string,
    techMap: Map<string, DetectedTech>,
  ): void {
    if (filename === 'package.json') {
      try {
        const pkg = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        const allDeps = [
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ];
        for (const dep of allDeps) {
          this.addTech(dep, repo, githubUsername, techMap, 'package.json');
        }
      } catch {
        // malformed JSON
      }
      return;
    }

    if (filename === 'requirements.txt' || filename === 'Pipfile') {
      const lines = content.split('\n')
        .map((l) => l.split('==')[0].split('>=')[0].split('~=')[0].split('[')[0].trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith('-'));
      for (const lib of lines) {
        this.addTech(lib, repo, githubUsername, techMap, filename);
      }
      this.addTech('Python', repo, githubUsername, techMap, filename);
      return;
    }

    if (filename === 'pyproject.toml') {
      // Extract dependencies from [tool.poetry.dependencies] or [project] dependencies
      const depLines = content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith('['));
      for (const line of depLines) {
        // Poetry: "requests = \"^2.28\""  or  "fastapi = {version = ...}"
        const poetryMatch = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*=/);
        if (poetryMatch) this.addTech(poetryMatch[1], repo, githubUsername, techMap, 'pyproject.toml');
        // PEP 621: "\"requests>=2.28\""
        const pepMatch = line.match(/["']([a-zA-Z][a-zA-Z0-9_-]*)/);
        if (pepMatch) this.addTech(pepMatch[1], repo, githubUsername, techMap, 'pyproject.toml');
      }
      this.addTech('Python', repo, githubUsername, techMap, 'pyproject.toml');
      return;
    }

    if (filename === 'go.mod') {
      this.addTech('Go', repo, githubUsername, techMap, 'go.mod');
      // Parse both block and inline require forms
      // Block: require (\n    github.com/pkg v1.2.3\n)
      // Inline: require github.com/pkg v1.2.3
      const lines = content.split('\n');
      let inRequireBlock = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'require (') { inRequireBlock = true; continue; }
        if (trimmed === ')') { inRequireBlock = false; continue; }
        if (inRequireBlock && trimmed) {
          const pkg = trimmed.split(/\s+/)[0];
          if (pkg) this.addTech(pkg, repo, githubUsername, techMap, 'go.mod');
        } else if (!inRequireBlock) {
          const match = trimmed.match(/^require\s+(\S+)/);
          if (match) this.addTech(match[1], repo, githubUsername, techMap, 'go.mod');
        }
      }
      return;
    }

    if (filename === 'Cargo.toml') {
      this.addTech('Rust', repo, githubUsername, techMap, 'Cargo.toml');
      // Parse [dependencies] section
      const lines = content.split('\n');
      let inDeps = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '[dependencies]' || trimmed === '[dev-dependencies]') { inDeps = true; continue; }
        if (trimmed.startsWith('[')) { inDeps = false; continue; }
        if (inDeps && trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*=/);
          if (match) this.addTech(match[1], repo, githubUsername, techMap, 'Cargo.toml');
        }
      }
      return;
    }

    if (filename === 'pom.xml' || filename === 'build.gradle' || filename === 'build.gradle.kts') {
      this.addTech('Java', repo, githubUsername, techMap, filename);
      return;
    }

    if (filename === 'pubspec.yaml') {
      this.addTech('Dart', repo, githubUsername, techMap, 'pubspec.yaml');
      this.addTech('Flutter', repo, githubUsername, techMap, 'pubspec.yaml');
      return;
    }

    if (filename === 'Gemfile') {
      this.addTech('Ruby', repo, githubUsername, techMap, 'Gemfile');
      // Parse gem names
      const gemLines = content.split('\n').filter(l => l.trim().startsWith('gem '));
      for (const line of gemLines) {
        const match = line.match(/gem\s+['"]([^'"]+)['"]/);
        if (match) this.addTech(match[1], repo, githubUsername, techMap, 'Gemfile');
      }
      return;
    }

    if (filename === 'composer.json') {
      this.addTech('PHP', repo, githubUsername, techMap, 'composer.json');
      try {
        const pkg = JSON.parse(content) as { require?: Record<string, string>; 'require-dev'?: Record<string, string> };
        const allDeps = [...Object.keys(pkg.require ?? {}), ...Object.keys(pkg['require-dev'] ?? {})];
        for (const dep of allDeps) {
          this.addTech(dep, repo, githubUsername, techMap, 'composer.json');
        }
      } catch { /* malformed */ }
      return;
    }

    if (filename === 'mix.exs') {
      this.addTech('Elixir', repo, githubUsername, techMap, 'mix.exs');
      return;
    }
  }

  private extractFromWorkflow(
    content: string,
    repo: GitHubRepo,
    githubUsername: string,
    techMap: Map<string, DetectedTech>,
  ): void {
    const WORKFLOW_SIGNALS: Array<{ pattern: RegExp; tech: string }> = [
      { pattern: /terraform/i,      tech: 'terraform' },
      { pattern: /kubectl|kubernetes/i, tech: 'kubernetes' },
      { pattern: /helm\b/i,         tech: 'helm' },
      { pattern: /aws-actions|awscli|aws\s+s3|aws\s+ecr/i, tech: 'aws' },
      { pattern: /google-cloud-sdk|gcloud\s/i,              tech: 'gcp' },
      { pattern: /azure\/login|az\s+login/i,                tech: 'azure' },
      { pattern: /docker\/build-push-action|docker build/i, tech: 'docker' },
      { pattern: /argocd/i,         tech: 'argocd' },
      { pattern: /ansible-playbook|ansible\/ansible/i,      tech: 'ansible' },
      { pattern: /nginx/i,          tech: 'nginx' },
    ];
    for (const { pattern, tech } of WORKFLOW_SIGNALS) {
      if (pattern.test(content)) {
        this.addTech(tech, repo, githubUsername, techMap, '.github/workflows');
      }
    }
  }

  private addTech(
    rawName: string,
    repo: GitHubRepo,
    githubUsername: string,
    techMap: Map<string, DetectedTech>,
    evidence: string,
  ): void {
    const mapped = mapToSkill(rawName);
    if (!mapped) return;

    const key = mapped.canonicalTitle;
    const existing = techMap.get(key);

    const evidenceRepo: EvidenceRepo = {
      name: repo.name,
      url: repo.html_url,
      evidence,
    };

    if (existing) {
      const alreadyAdded = existing.repos.some((r) => r.name === repo.name);
      if (!alreadyAdded) {
        existing.repos.push(evidenceRepo);
      }
      if (repo.pushed_at > existing.lastSeen) {
        existing.lastSeen = repo.pushed_at;
      }
    } else {
      techMap.set(key, {
        tech: rawName,
        canonicalTitle: key,
        category: mapped.category,
        icon: mapped.icon,
        prerequisites: mapped.prerequisites,
        repos: [evidenceRepo],
        lastSeen: repo.pushed_at,
      });
    }
  }

  private authHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  /** Headers for public reads — Authorization is included only when a token is available. */
  private publicHeaders(accessToken: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
