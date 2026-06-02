import { Injectable } from '@angular/core';
import { SkillNode } from '../../nodes.service';
import { I18nService } from '../../shared/services/i18n.service';

export interface FocusActionItem {
  title: string;
  meta: string;
  progressPercent: number;
}

export interface FocusAction {
  title: string;
  description: string;
  items: FocusActionItem[];
}

type NodeStatusClass = 'status-not-started' | 'status-in-progress' | 'status-completed';

const DEFAULT_MAX_LEVEL = 3;

@Injectable({ providedIn: 'root' })
export class CanvasFocusService {

  getNodeStatusClass(node: Pick<SkillNode, 'level' | 'maxLevel'>): NodeStatusClass {
    const level = Math.max(0, Number(node.level) || 0);
    const maxLevel = Number(node.maxLevel) > 0 ? Number(node.maxLevel) : DEFAULT_MAX_LEVEL;
    if (level <= 0) return 'status-not-started';
    if (level >= maxLevel) return 'status-completed';
    return 'status-in-progress';
  }

  getNodeLevel(node: Pick<SkillNode, 'level'>): number {
    return Math.max(0, Number(node.level) || 0);
  }

  getNodeMaxLevel(node: Pick<SkillNode, 'maxLevel'>): number {
    const maxLevel = Number(node.maxLevel) || DEFAULT_MAX_LEVEL;
    return maxLevel > 0 ? maxLevel : DEFAULT_MAX_LEVEL;
  }

  getRemainingLevels(node: Pick<SkillNode, 'level' | 'maxLevel'>): number {
    return Math.max(0, this.getNodeMaxLevel(node) - this.getNodeLevel(node));
  }

  getNodeProgressPercent(node: Pick<SkillNode, 'level' | 'maxLevel'>): number {
    const maxLevel = this.getNodeMaxLevel(node);
    return maxLevel === 0 ? 0 : Math.round((this.getNodeLevel(node) / maxLevel) * 100);
  }

  isNodeUnlocked(node: SkillNode, getParent: (id: string) => SkillNode | undefined): boolean {
    if (!node.parentId) return true;
    const parent = getParent(node.parentId);
    return !!parent && this.getNodeStatusClass(parent) === 'status-completed';
  }

  compareFocusNodes(a: SkillNode, b: SkillNode): number {
    const remainingDelta = this.getRemainingLevels(a) - this.getRemainingLevels(b);
    if (remainingDelta !== 0) return remainingDelta;
    const levelDelta = this.getNodeLevel(b) - this.getNodeLevel(a);
    if (levelDelta !== 0) return levelDelta;
    return a.title.localeCompare(b.title);
  }

  computeNextFocus(
    nodes: SkillNode[],
    i18n: I18nService,
    getParent: (id: string) => SkillNode | undefined,
  ): FocusAction {
    if (!nodes.length) {
      return {
        title: i18n.t('canvas.closestGoalEmptyTitle'),
        description: i18n.t('canvas.closestGoalEmptyText'),
        items: [],
      };
    }

    const incompleteNodes = nodes.filter(node => this.getNodeStatusClass(node) !== 'status-completed');
    if (!incompleteNodes.length) {
      return {
        title: i18n.t('canvas.closestGoalDoneTitle'),
        description: i18n.t('canvas.closestGoalDoneText'),
        items: [],
      };
    }

    const activeNodes = incompleteNodes
      .filter(node => this.getNodeStatusClass(node) === 'status-in-progress')
      .sort((a, b) => this.compareFocusNodes(a, b));

    if (activeNodes.length) {
      const items = activeNodes.slice(0, 3);
      return {
        title: i18n.t('canvas.closestGoalActiveTitle', { count: items.length }),
        description: i18n.t('canvas.closestGoalActiveText'),
        items: items.map(node => ({
          title: node.title,
          meta: i18n.t('canvas.closestGoalItemLevels', { count: this.getRemainingLevels(node) }),
          progressPercent: this.getNodeProgressPercent(node),
        })),
      };
    }

    const readyNodes = incompleteNodes
      .filter(node => this.getNodeStatusClass(node) === 'status-not-started' && this.isNodeUnlocked(node, getParent))
      .sort((a, b) => this.compareFocusNodes(a, b));

    if (readyNodes.length) {
      const items = readyNodes.slice(0, 3);
      return {
        title: i18n.t('canvas.closestGoalReadyTitle', { count: items.length }),
        description: i18n.t('canvas.closestGoalReadyText'),
        items: items.map(node => ({
          title: node.title,
          meta: i18n.t('canvas.closestGoalItemStart'),
          progressPercent: 0,
        })),
      };
    }

    const lockedNodes = incompleteNodes.sort((a, b) => this.compareFocusNodes(a, b)).slice(0, 3);
    return {
      title: i18n.t('canvas.closestGoalLockedTitle'),
      description: i18n.t('canvas.closestGoalLockedText'),
      items: lockedNodes.map(node => {
        const parent = getParent(node.parentId || '');
        return {
          title: node.title,
          meta: i18n.t('canvas.closestGoalItemUnlockAfter', {
            title: parent?.title ?? i18n.t('canvas.closestGoalParentFallback'),
          }),
          progressPercent: parent ? this.getNodeProgressPercent(parent) : 0,
        };
      }),
    };
  }

  computeStreak(activities: Array<{ date: string | Date; count: number }>): number {
    const activeDays = this.buildActivityDayKeys(activities);
    if (!activeDays.size) return 0;

    const today = this.startOfDay(new Date());
    const startDate = activeDays.has(this.toDayKey(today))
      ? today
      : this.startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));

    let streak = 0;
    const cursor = new Date(startDate);
    while (activeDays.has(this.toDayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  computeActiveDaysThisMonth(activities: Array<{ date: string | Date; count: number }>): number {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const uniqueDays = new Set(
      activities
        .filter(a => a.count > 0)
        .map(a => this.startOfDay(new Date(a.date)))
        .filter(d => d.getFullYear() === year && d.getMonth() === month)
        .map(d => this.toDayKey(d))
    );
    return uniqueDays.size;
  }

  computeActiveDaysLast7(activities: Array<{ date: string | Date; count: number }>): number {
    const activeDays = this.buildActivityDayKeys(activities);
    if (!activeDays.size) return 0;
    const today = this.startOfDay(new Date());
    let count = 0;
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      if (activeDays.has(this.toDayKey(date))) count++;
    }
    return count;
  }

  private buildActivityDayKeys(activities: Array<{ date: string | Date; count: number }>): Set<string> {
    return new Set(
      activities.filter(a => a.count > 0).map(a => this.toDayKey(a.date))
    );
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private toDayKey(value: string | Date): string {
    const date = this.startOfDay(new Date(value));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
