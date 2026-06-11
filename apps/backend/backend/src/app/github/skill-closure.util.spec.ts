import { collectConnectedSkills } from './skill-closure.util';
import { DetectedTech } from './github.types';

const tech = (
  canonicalTitle: string,
  repoCount: number,
  prerequisites: string[] = [],
): DetectedTech => ({
  tech: canonicalTitle,
  canonicalTitle,
  category: 'backend',
  icon: 'dns',
  prerequisites,
  repos: Array.from({ length: repoCount }, (_, index) => ({
    name: `${canonicalTitle.toLowerCase()}-${index + 1}`,
    url: `https://github.com/alice/${canonicalTitle.toLowerCase()}-${index + 1}`,
    evidence: 'package.json',
  })),
  lastSeen: '2026-06-11T00:00:00Z',
});

describe('collectConnectedSkills', () => {
  it('keeps a Python chain even when the foundation skill only appears in one repo', () => {
    const result = collectConnectedSkills([
      tech('Python', 1),
      tech('FastAPI', 1, ['Python']),
      tech('aiogram', 1, ['Python']),
      tech('httpx', 1),
    ]);

    expect(result.map((item) => item.canonicalTitle)).toEqual(
      expect.arrayContaining(['Python', 'FastAPI', 'aiogram']),
    );
    expect(result).toHaveLength(3);
  });

  it('keeps a JavaScript frontend chain even when each skill is low-signal', () => {
    const result = collectConnectedSkills([
      tech('JavaScript', 1),
      tech('TypeScript', 1, ['JavaScript']),
      tech('React', 1, ['TypeScript', 'JavaScript']),
      tech('Next.js', 1, ['React', 'TypeScript']),
    ]);

    expect(result.map((item) => item.canonicalTitle)).toEqual(
      expect.arrayContaining(['JavaScript', 'TypeScript', 'React', 'Next.js']),
    );
    expect(result).toHaveLength(4);
  });
});
