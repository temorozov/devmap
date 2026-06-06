import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { TreesService, Tree } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { SkillGraphComponent, SkillGraphNode } from '../../shared/components/skill-graph/skill-graph.component';
import { skillNodesToGraph, skillRepoCount } from '../../shared/components/skill-graph/skill-graph.mapper';

const DEV_MAP_TITLE = 'My Dev Map';
const STACK_ROOT_TITLE = 'Dev Skills';

/** Category metadata + the icon written onto a node so the profile can re-bucket it. */
const CATEGORIES: Array<{ key: string; label: string; icon: string; nodeIcon: string }> = [
  { key: 'language', label: 'Languages', icon: 'code', nodeIcon: 'code' },
  { key: 'frontend', label: 'Frontend', icon: 'web', nodeIcon: 'web' },
  { key: 'backend', label: 'Backend', icon: 'dns', nodeIcon: 'dns' },
  { key: 'database', label: 'Databases', icon: 'storage', nodeIcon: 'storage' },
  { key: 'devops', label: 'DevOps', icon: 'cloud', nodeIcon: 'cloud' },
  { key: 'mobile', label: 'Mobile', icon: 'smartphone', nodeIcon: 'smartphone' },
  { key: 'testing', label: 'Testing', icon: 'science', nodeIcon: 'science' },
  { key: 'ml', label: 'ML / AI', icon: 'psychology', nodeIcon: 'psychology' },
  { key: 'tooling', label: 'Tooling', icon: 'settings', nodeIcon: 'settings' },
];
const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

interface StackSkill {
  id: string;
  title: string;
  source: 'manual' | 'github' | 'ai';
  verified: boolean;
  repoCount: number;
  level: number;
  tier: 'core' | 'familiar' | 'exposure';
}

interface StackGroup {
  key: string;
  label: string;
  icon: string;
  skills: StackSkill[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SkillGraphComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly treesService = inject(TreesService);
  private readonly nodesService = inject(NodesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly categories = CATEGORIES;

  loading = true;
  refreshing = false;
  tree: Tree | null = null;
  rootId: string | null = null;
  groups: StackGroup[] = [];
  graphNodes: SkillGraphNode[] = [];

  linkCopied = false;
  badgeCopied = false;

  // Add-skill form
  newTitle = '';
  newCategory = 'language';
  adding = false;

  isGuest$ = this.authService.isGuest$;
  handle$ = this.authService.handle$;
  githubUsername$ = this.authService.githubUsername$;

  ngOnInit() {
    this.authService.loadMe().subscribe(() => this.cdr.markForCheck());
    this.loadStack();
  }

  private currentHandle(): string {
    const u = (
      this.authService as unknown as {
        user: { getValue(): { handle?: string | null; githubUsername?: string | null } | null };
      }
    ).user.getValue();
    return u?.handle ?? u?.githubUsername ?? '';
  }

  get profileUrl(): string {
    const h = this.currentHandle();
    return h ? `${window.location.origin}/u/${h}` : '';
  }

  get totalSkills(): number {
    return this.groups.reduce((n, g) => n + g.skills.length, 0);
  }

  get hasGraph(): boolean {
    return this.graphNodes.length >= 3;
  }

  // ── Loading ────────────────────────────────────────────────────────────
  loadStack() {
    this.loading = true;
    this.treesService.getTrees().subscribe({
      next: (trees) => {
        this.tree = trees.find((t) => t.title === DEV_MAP_TITLE) ?? null;
        if (!this.tree) {
          this.groups = [];
          this.graphNodes = [];
          this.rootId = null;
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.nodesService.getNodesByTree(this.tree.id).subscribe({
          next: (nodes) => {
            this.applyNodes(nodes);
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private applyNodes(nodes: SkillNode[]) {
    this.rootId = nodes.find((n) => !n.parentId)?.id ?? null;
    this.graphNodes = skillNodesToGraph(nodes);
    this.groups = this.buildGroups(nodes);
  }

  private buildGroups(nodes: SkillNode[]): StackGroup[] {
    const byKey = new Map<string, StackGroup>();
    for (const node of nodes) {
      if (!node.parentId) continue; // skip structural root
      const key = this.inferCategory(node);
      const meta = CATEGORY_BY_KEY.get(key) ?? { label: 'Other', icon: 'star' };
      if (!byKey.has(key)) byKey.set(key, { key, label: meta.label, icon: meta.icon, skills: [] });
      const repoCount = skillRepoCount(node);
      const verified = node.verified === true || node.source === 'github';
      const tier: StackSkill['tier'] = verified
        ? repoCount >= 5
          ? 'core'
          : repoCount >= 2
            ? 'familiar'
            : 'exposure'
        : 'exposure';
      byKey.get(key)!.skills.push({
        id: node.id,
        title: node.title,
        source: (node.source as StackSkill['source']) ?? 'manual',
        verified,
        repoCount,
        level: node.level ?? 1,
        tier,
      });
    }
    return CATEGORIES.map((c) => byKey.get(c.key)).filter((g): g is StackGroup => !!g && g.skills.length > 0);
  }

  private inferCategory(node: SkillNode): string {
    const icon = node.icon ?? '';
    if (icon === 'code') return 'language';
    if (icon === 'web' || icon === 'style') return 'frontend';
    if (icon === 'dns' || icon === 'api') return 'backend';
    if (icon === 'storage') return 'database';
    if (icon === 'cloud' || icon === 'settings_suggest') return 'devops';
    if (icon === 'smartphone') return 'mobile';
    if (icon === 'science') return 'testing';
    if (icon === 'psychology') return 'ml';
    return 'tooling';
  }

  // ── GitHub refresh (manual, replaces the old webhook auto-sync) ──────────
  refreshFromGitHub() {
    this.refreshing = true;
    this.cdr.markForCheck();
    this.treesService.syncGitHub().subscribe({
      next: () => {
        this.refreshing = false;
        this.loadStack();
      },
      error: () => {
        this.refreshing = false;
        this.dialogService.alert('GitHub refresh failed. Make sure your GitHub account is connected.');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Manual editing ──────────────────────────────────────────────────────
  addSkill() {
    const title = this.newTitle.trim();
    if (!title || this.adding) return;
    const meta = CATEGORY_BY_KEY.get(this.newCategory) ?? CATEGORIES[0];
    this.adding = true;
    this.cdr.markForCheck();

    this.ensureRoot()
      .pipe(
        switchMap(({ treeId, rootId }) =>
          this.nodesService.createNode({
            treeId,
            parentId: rootId,
            title,
            icon: meta.nodeIcon,
            positionX: 0,
            positionY: 0,
            level: 1,
            maxLevel: 3,
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.newTitle = '';
          this.adding = false;
          this.loadStack();
        },
        error: () => {
          this.adding = false;
          this.dialogService.alert('Could not add skill. Please try again.');
          this.cdr.markForCheck();
        },
      });
  }

  /** Ensure a dev-map tree with a structural root exists, returning their ids. */
  private ensureRoot() {
    if (this.tree && this.rootId) {
      return of({ treeId: this.tree.id, rootId: this.rootId });
    }
    if (this.tree) {
      return this.createRoot(this.tree.id);
    }
    return this.treesService.createTree(DEV_MAP_TITLE).pipe(
      switchMap((tree) => {
        this.tree = tree;
        return this.createRoot(tree.id);
      }),
    );
  }

  private createRoot(treeId: string) {
    return this.nodesService
      .createNode({ treeId, title: STACK_ROOT_TITLE, icon: 'account_tree', positionX: 0, positionY: 0 })
      .pipe(
        switchMap((root) => {
          this.rootId = root.id;
          return of({ treeId, rootId: root.id });
        }),
      );
  }

  async removeSkill(skill: StackSkill) {
    if (!(await this.dialogService.confirm(`Remove ${skill.title} from your stack?`))) return;
    this.nodesService.deleteNode(skill.id).subscribe({
      next: () => {
        this.groups = this.groups
          .map((g) => ({ ...g, skills: g.skills.filter((s) => s.id !== skill.id) }))
          .filter((g) => g.skills.length > 0);
        this.graphNodes = this.graphNodes.filter((n) => n.id !== skill.id);
        this.cdr.markForCheck();
      },
      error: () => this.dialogService.alert('Could not remove skill.'),
    });
  }

  /** Cycle a manually-added skill through proficiency levels 1 → 2 → 3. */
  cycleLevel(skill: StackSkill) {
    if (skill.source === 'github') return; // github tiers are derived from repos
    const level = (skill.level % 3) + 1;
    this.nodesService.updateNode(skill.id, { level }).subscribe({
      next: () => {
        skill.level = level;
        this.cdr.markForCheck();
      },
    });
  }

  levelLabel(skill: StackSkill): string {
    if (skill.source === 'github') return skill.tier;
    return ['', 'beginner', 'comfortable', 'strong'][skill.level] ?? 'beginner';
  }

  // ── Share ────────────────────────────────────────────────────────────────
  copyProfileLink() {
    if (!this.profileUrl) return;
    navigator.clipboard.writeText(this.profileUrl);
    this.linkCopied = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.linkCopied = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  copyBadgeSnippet() {
    const h = this.currentHandle();
    if (!h) return;
    const origin = window.location.origin;
    const snippet = `[![DevMap](${origin}/api/trees/badge/${h})](${origin}/u/${h})`;
    navigator.clipboard.writeText(snippet);
    this.badgeCopied = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.badgeCopied = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  openProfile() {
    const h = this.currentHandle();
    if (h) this.router.navigate(['/u', h]);
  }

  logout() {
    this.authService.logout();
  }

  trackByGroup(_i: number, g: StackGroup) {
    return g.key;
  }
  trackBySkill(_i: number, s: StackSkill) {
    return s.id;
  }
}
