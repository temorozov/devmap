import { GitHubService } from './github.service';
import { GitHubSyncService } from './github-sync.service';
import { DetectedTech, GitHubRepo } from './github.types';

const repo: GitHubRepo = {
  name: 'bot',
  full_name: 'alice/bot',
  html_url: 'https://github.com/alice/bot',
  language: null,
  pushed_at: '2026-06-11T00:00:00Z',
  fork: false,
};

const makeTech = (
  canonicalTitle: string,
  prerequisites: string[],
  category = 'backend',
  icon = 'dns',
): DetectedTech => ({
  tech: canonicalTitle,
  canonicalTitle,
  category,
  icon,
  prerequisites,
  repos: [{ name: repo.name, url: repo.html_url, evidence: 'package.json' }],
  lastSeen: repo.pushed_at,
});

describe('GitHubService manifest parsing', () => {
  it('adds Python alongside FastAPI and aiogram dependencies from Python manifests', () => {
    const service = new GitHubService();
    const techMap = new Map<string, DetectedTech>();

    (service as unknown as {
      extractFromManifest: (
        filename: string,
        content: string,
        repo: GitHubRepo,
        githubUsername: string,
        techMap: Map<string, DetectedTech>,
      ) => void;
    }).extractFromManifest(
      'requirements.txt',
      [
        'fastapi==0.115.0',
        'aiogram>=3.7.0',
        'httpx==0.27.0',
      ].join('\n'),
      repo,
      'alice',
      techMap,
    );

    expect(techMap.has('Python')).toBe(true);
    expect(techMap.has('FastAPI')).toBe(true);
    expect(techMap.has('aiogram')).toBe(true);
  });
});

describe('GitHubService dependency layout', () => {
  it('links Python and TypeScript stacks through their detected prerequisites', () => {
    const service = new GitHubSyncService({} as never, {} as never, {} as never);
    const layout = (service as unknown as {
      buildLayoutNodes: (techs: DetectedTech[]) => Array<{
        title: string;
        parentTitle: string | null;
      }>;
    }).buildLayoutNodes([
      makeTech('JavaScript', []),
      makeTech('TypeScript', ['JavaScript']),
      makeTech('React', ['TypeScript', 'JavaScript'], 'frontend', 'web'),
      makeTech('Next.js', ['React', 'TypeScript'], 'frontend', 'web'),
      makeTech('Python', []),
      makeTech('FastAPI', ['Python']),
      makeTech('aiogram', ['Python']),
    ]);

    const parentByTitle = new Map(layout.map((node) => [node.title, node.parentTitle]));

    expect(parentByTitle.get('Dev Skills')).toBeNull();
    expect(parentByTitle.get('JavaScript')).toBe('Dev Skills');
    expect(parentByTitle.get('TypeScript')).toBe('JavaScript');
    expect(parentByTitle.get('React')).toBe('TypeScript');
    expect(parentByTitle.get('Next.js')).toBe('React');
    expect(parentByTitle.get('Python')).toBe('Dev Skills');
    expect(parentByTitle.get('FastAPI')).toBe('Python');
    expect(parentByTitle.get('aiogram')).toBe('Python');
  });
});
