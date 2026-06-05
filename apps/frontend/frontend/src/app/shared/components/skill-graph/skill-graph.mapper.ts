import { SkillNode } from '../../../nodes.service';
import { SkillGraphNode, SkillTier } from './skill-graph.component';

/** Repo count backing a skill, from its evidence (`_meta.repoCount` or entry count). */
export function skillRepoCount(node: Pick<SkillNode, 'evidence'>): number {
  const ev = (node.evidence as Array<Record<string, unknown>> | null | undefined) ?? [];
  const meta = ev.find((e) => e['_meta']);
  return meta ? ((meta['repoCount'] as number) ?? 0) : ev.filter((e) => !e['_meta']).length;
}

function tierFor(node: Pick<SkillNode, 'verified' | 'evidence'>): SkillTier {
  if (!node.verified) return 'exposure';
  const r = skillRepoCount(node);
  return r >= 5 ? 'core' : r >= 2 ? 'familiar' : 'exposure';
}

/**
 * Single source of truth for turning tree skill nodes into graph nodes, so the
 * map looks identical everywhere it appears (canvas, dashboard, profile).
 *
 * Edges come from the real `parentId` prerequisite chain. A lone structural
 * root (one parent-less node) is treated as scaffolding and dropped.
 */
export function skillNodesToGraph(nodes: SkillNode[]): SkillGraphNode[] {
  const roots = nodes.filter((n) => !n.parentId);
  const skills = roots.length === 1 ? nodes.filter((n) => n.parentId) : nodes;
  const ids = new Set(skills.map((n) => n.id));
  return skills.map((node) => {
    const parent = node.parentId && ids.has(node.parentId) ? node.parentId : undefined;
    const repos = skillRepoCount(node);
    return {
      id: node.id,
      label: node.title,
      tier: tierFor(node),
      // manual/tutorial nodes have no evidence — size by level so they stay visible
      repos: repos > 0 ? repos : Math.max(2, (node.level ?? 0) + 2),
      deps: parent ? [parent] : [],
    };
  });
}
