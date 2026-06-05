import { SkillNode } from '../../nodes.service';
import { RoleProfile, SkillRequirement, SKILL_PREREQUISITES } from './role-profiles';

export interface SlotResult {
  label: string;
  matched: string | null;
  repoCount: number;
  strength: 'strong' | 'medium' | 'weak' | 'missing';
}

export interface GapAnalysis {
  role: RoleProfile;
  core: SlotResult[];
  recommended: SlotResult[];
  emerging: SlotResult[];
  readinessPercent: number;
}

export interface NearReadyHint {
  title: string;
  prereqs: string[];
}

export interface TopProject {
  repo: string;
  skills: string[];
}

/** One concrete "learn next" suggestion with a reason. */
export interface NextStep {
  title: string;
  reason: string;
  kind: 'core' | 'deepen' | 'recommended' | 'near-ready';
}

const slotLabel = (slot: SkillRequirement): string =>
  typeof slot === 'string' ? slot : slot.label;

const matchSlot = (slot: SkillRequirement, verified: string[]): string | null =>
  typeof slot === 'string'
    ? (verified.includes(slot) ? slot : null)
    : (slot.any.find((s) => verified.includes(s)) ?? null);

/** repo → set of verified skill titles proven in that repo. */
export function buildRepoSkillsMap(nodes: SkillNode[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const node of nodes) {
    const verified = node.verified === true || node.source === 'github';
    if (!verified || !node.parentId) continue;
    const evidence = (node.evidence as Array<Record<string, unknown>> | null | undefined) ?? [];
    for (const ev of evidence) {
      const repo = ev['repo'] as string | undefined;
      if (!repo) continue;
      if (!map.has(repo)) map.set(repo, new Set());
      map.get(repo)!.add(node.title);
    }
  }
  return map;
}

export function verifiedSkillTitles(nodes: SkillNode[]): string[] {
  return nodes
    .filter((n) => n.parentId && (n.verified === true || n.source === 'github'))
    .map((n) => n.title);
}

function coOccurrenceStrength(
  title: string,
  otherCoreMatches: string[],
  repoMap: Map<string, Set<string>>
): { strength: 'strong' | 'medium' | 'weak'; repoCount: number } {
  let maxCoOccurring = 0;
  let repoCount = 0;
  for (const [, skills] of repoMap) {
    if (!skills.has(title)) continue;
    repoCount++;
    const n = otherCoreMatches.filter((s) => s !== title && skills.has(s)).length;
    if (n > maxCoOccurring) maxCoOccurring = n;
  }
  const strength = maxCoOccurring >= 2 ? 'strong' : maxCoOccurring >= 1 ? 'medium' : 'weak';
  return { strength, repoCount };
}

function repoCountFor(title: string, repoMap: Map<string, Set<string>>): number {
  let n = 0;
  for (const skills of repoMap.values()) if (skills.has(title)) n++;
  return n;
}

/**
 * Strength-weighted role readiness: a core skill only "counts" fully when it
 * shows up alongside other role skills in real repos (strong), partially if
 * isolated (weak). Mirrors the public profile's Role Readiness.
 */
export function computeGapAnalysis(
  role: RoleProfile,
  verified: string[],
  repoMap: Map<string, Set<string>>
): GapAnalysis {
  const coreMatches = role.core.map((s) => matchSlot(s, verified)).filter(Boolean) as string[];

  const core: SlotResult[] = role.core.map((slot) => {
    const matched = matchSlot(slot, verified);
    if (!matched) return { label: slotLabel(slot), matched: null, repoCount: 0, strength: 'missing' };
    const { strength, repoCount } = coOccurrenceStrength(matched, coreMatches, repoMap);
    return { label: slotLabel(slot), matched, repoCount, strength };
  });

  const recommended: SlotResult[] = role.recommended.map((slot) => {
    const matched = matchSlot(slot, verified);
    const rc = matched ? repoCountFor(matched, repoMap) : 0;
    return { label: slotLabel(slot), matched, repoCount: rc, strength: matched ? 'medium' : 'missing' };
  });

  const emerging: SlotResult[] = role.emerging.map((s) => ({
    label: s,
    matched: verified.includes(s) ? s : null,
    repoCount: verified.includes(s) ? repoCountFor(s, repoMap) : 0,
    strength: (verified.includes(s) ? 'medium' : 'missing') as 'medium' | 'missing',
  }));

  const strengthScore = (s: SlotResult['strength']) =>
    ({ strong: 1.0, medium: 0.7, weak: 0.4, missing: 0 })[s];

  const coreScore = core.length === 0 ? 1
    : core.reduce((sum, s) => sum + strengthScore(s.strength), 0) / core.length;
  const recScore = recommended.length === 0 ? 1
    : recommended.filter((s) => s.matched).length / recommended.length;
  const emgScore = emerging.length === 0 ? 1
    : emerging.filter((s) => s.matched).length / emerging.length;

  const readinessPercent = Math.round((coreScore * 0.6 + recScore * 0.3 + emgScore * 0.1) * 100);

  return { role, core, recommended, emerging, readinessPercent };
}

export function computeNearReadyHints(analysis: GapAnalysis, verified: string[]): NearReadyHint[] {
  const missing = [
    ...analysis.core.filter((s) => !s.matched).map((s) => s.label),
    ...analysis.recommended.filter((s) => !s.matched).map((s) => s.label),
  ];
  return missing
    .filter((skill) => {
      const prereqs = SKILL_PREREQUISITES[skill];
      return prereqs?.length && prereqs.every((p) => verified.includes(p));
    })
    .slice(0, 3)
    .map((skill) => ({ title: skill, prereqs: SKILL_PREREQUISITES[skill] }));
}

/**
 * An ordered "what to learn next" list. Missing core skills first (they block
 * the role), then weakly-held core skills to deepen, then near-ready skills
 * (prereqs already met), then recommended gaps.
 */
export function computeNextSteps(analysis: GapAnalysis, verified: string[]): NextStep[] {
  const steps: NextStep[] = [];
  const nearReady = new Set(computeNearReadyHints(analysis, verified).map((h) => h.title));

  for (const s of analysis.core) {
    if (!s.matched) {
      steps.push({
        title: s.label,
        reason: nearReady.has(s.label) ? 'core gap · prerequisites already met' : 'core requirement — not yet verified',
        kind: nearReady.has(s.label) ? 'near-ready' : 'core',
      });
    }
  }
  for (const s of analysis.core) {
    if (s.matched && s.strength === 'weak') {
      steps.push({
        title: s.matched,
        reason: 'used in isolation — ship it alongside your other core skills',
        kind: 'deepen',
      });
    }
  }
  for (const s of analysis.recommended) {
    if (!s.matched) {
      steps.push({
        title: s.label,
        reason: nearReady.has(s.label) ? 'recommended · prerequisites already met' : 'recommended for this role',
        kind: nearReady.has(s.label) ? 'near-ready' : 'recommended',
      });
    }
  }
  return steps.slice(0, 4);
}

export function computeTopProject(analysis: GapAnalysis, repoMap: Map<string, Set<string>>): TopProject | null {
  const coreMatched = analysis.core.filter((s) => s.matched).map((s) => s.matched!);
  let best: TopProject | null = null;
  for (const [repo, skills] of repoMap) {
    const covered = coreMatched.filter((s) => skills.has(s));
    if (covered.length >= 2 && (!best || covered.length > best.skills.length)) {
      best = { repo, skills: covered };
    }
  }
  return best;
}
