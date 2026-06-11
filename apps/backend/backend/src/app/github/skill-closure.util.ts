import { DetectedTech } from './github.types';

/**
 * Keep the connected skill component around the meaningful stack roots.
 *
 * We keep:
 * - anything seen in `minRepoCount`+ repos
 * - anything directly connected to those skills through prerequisite edges
 *
 * That preserves chains like `Python -> FastAPI -> aiogram` and
 * `JavaScript -> TypeScript -> React -> Next.js` even when the foundation
 * skill only appears in one repo.
 */
export function collectConnectedSkills(
  detected: DetectedTech[],
  minRepoCount = 2,
): DetectedTech[] {
  const byTitle = new Map(detected.map((tech) => [tech.canonicalTitle, tech]));

  const prereqsByTitle = new Map<string, string[]>();
  const dependentsByTitle = new Map<string, string[]>();

  for (const tech of detected) {
    const prereqs = (tech.prerequisites ?? []).filter(
      (prereq) => prereq !== tech.canonicalTitle && byTitle.has(prereq),
    );
    prereqsByTitle.set(tech.canonicalTitle, prereqs);

    for (const prereq of prereqs) {
      const dependents = dependentsByTitle.get(prereq) ?? [];
      dependents.push(tech.canonicalTitle);
      dependentsByTitle.set(prereq, dependents);
    }
  }

  const seedTitles = new Set(
    detected
      .filter((tech) => tech.repos.length >= minRepoCount || (dependentsByTitle.get(tech.canonicalTitle)?.length ?? 0) > 0)
      .map((tech) => tech.canonicalTitle),
  );

  const queue = [...seedTitles];
  const kept = new Map<string, DetectedTech>();

  const enqueue = (title: string) => {
    if (!byTitle.has(title) || kept.has(title)) return;
    const tech = byTitle.get(title);
    if (!tech) return;
    kept.set(title, tech);
    queue.push(title);
  };

  for (const title of seedTitles) {
    enqueue(title);
  }

  while (queue.length > 0) {
    const title = queue.shift();
    if (!title) continue;
    const prereqs = prereqsByTitle.get(title) ?? [];
    const dependents = dependentsByTitle.get(title) ?? [];

    for (const prereq of prereqs) enqueue(prereq);
    for (const dependent of dependents) enqueue(dependent);
  }

  return [...kept.values()].sort(
    (a, b) => b.repos.length - a.repos.length || a.canonicalTitle.localeCompare(b.canonicalTitle),
  );
}
