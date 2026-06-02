import { SkillNode } from '../../nodes.service';

export type SkillNodeStatus = 'not-started' | 'in-progress' | 'completed';

export interface SkillNodeUiModel {
  status: SkillNodeStatus;
  statusLabelKey: string;
  level: number;
  maxLevel: number;
  progressPercent: number;
}

export function getNodeMaxLevel(node: Pick<SkillNode, 'maxLevel'>, defaultMaxLevel: number): number {
  return node.maxLevel && node.maxLevel > 0 ? node.maxLevel : defaultMaxLevel;
}

export function getNodeLevel(node: Pick<SkillNode, 'level'>): number {
  return Math.max(0, node.level || 0);
}

export function getNodeStatus(
  node: Pick<SkillNode, 'level' | 'maxLevel'>,
  defaultMaxLevel: number
): SkillNodeStatus {
  const level = getNodeLevel(node);
  const maxLevel = getNodeMaxLevel(node, defaultMaxLevel);

  if (level <= 0) {
    return 'not-started';
  }

  if (level >= maxLevel) {
    return 'completed';
  }

  return 'in-progress';
}

export function getNodeProgressPercent(
  node: Pick<SkillNode, 'level' | 'maxLevel'>,
  defaultMaxLevel: number
): number {
  const maxLevel = getNodeMaxLevel(node, defaultMaxLevel);
  const level = Math.min(getNodeLevel(node), maxLevel);
  return Math.round((level / maxLevel) * 100);
}

export function getNodeStatusLabelKey(status: SkillNodeStatus): string {
  switch (status) {
    case 'completed':
      return 'canvas.statusCompleted';
    case 'in-progress':
      return 'canvas.statusInProgress';
    default:
      return 'canvas.statusNotStarted';
  }
}

export function getNodeUiModel(
  node: Pick<SkillNode, 'level' | 'maxLevel'>,
  defaultMaxLevel: number
): SkillNodeUiModel {
  const status = getNodeStatus(node, defaultMaxLevel);

  return {
    status,
    statusLabelKey: getNodeStatusLabelKey(status),
    level: getNodeLevel(node),
    maxLevel: getNodeMaxLevel(node, defaultMaxLevel),
    progressPercent: getNodeProgressPercent(node, defaultMaxLevel),
  };
}

export function formatUnlocksSummary(unlocks: Array<Pick<SkillNode, 'title'>>, maxVisible = 2): string {
  if (!unlocks.length) {
    return '';
  }

  const visibleUnlocks = unlocks.slice(0, maxVisible).map((unlock) => unlock.title);
  const hiddenCount = unlocks.length - visibleUnlocks.length;

  return hiddenCount > 0
    ? `${visibleUnlocks.join(', ')} +${hiddenCount} more`
    : visibleUnlocks.join(', ');
}
