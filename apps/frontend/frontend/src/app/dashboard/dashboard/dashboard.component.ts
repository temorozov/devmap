import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { TreesService, Tree } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { SkillGraphComponent, SkillGraphNode } from '../../shared/components/skill-graph/skill-graph.component';
import { skillNodesToGraph, skillRepoCount } from '../../shared/components/skill-graph/skill-graph.mapper';

const DEV_MAP_TITLE = 'My Dev Map';
const STACK_ROOT_TITLE = 'Dev Skills';

/** Order matters: mobile before frontend (React Native contains "react"). */
const CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/react[\s.]?native|expo\b|flutter|swiftui|jetpack[\s.]?compose/i, 'mobile'],
  [/^(javascript|typescript|python|go|golang|rust|java|kotlin|swift|c#|csharp|ruby|php|dart|elixir|scala|c\+\+|haskell|lua|perl|zig|shell|bash|clojure|ocaml|julia|groovy|assembly)$/i, 'language'],
  [/\bangular\b|react\b|vue[\s.]?js|svelte|next[\s.]?js|nuxt|sveltekit|remix|astro|tailwind|vite\b|webpack\b|storybook/i, 'frontend'],
  [/node[\s.]?js|express[\s.]?js?|fastify|nest[\s.]?js|hono\b|koa\b|trpc|apollo[\s.]?server|django|fastapi|flask|celery|gin\b|echo\b|fiber\b|spring[\s.]?boot|rails|laravel|phoenix|grpc/i, 'backend'],
  [/postgres|mysql|mongodb|redis|sqlite|elasticsearch|supabase|firebase|dynamodb|cassandra|clickhouse/i, 'database'],
  [/docker|kubernetes|k8s|helm\b|terraform|github[\s.]?actions|aws\b|gcp\b|azure|nginx|argocd|ansible|jenkins|gitlab[\s.]?ci/i, 'devops'],
  [/jest\b|vitest|playwright|cypress|pytest|testing[\s.]?library|selenium|mocha\b|chai\b/i, 'testing'],
  [/pytorch|tensorflow|keras|scikit|sklearn|pandas|numpy|jupyter|langchain|openai|hugging[\s.]?face|mlflow|torch\b/i, 'ml'],
];

function detectCategoryFromTitle(name: string): string | null {
  const n = name.trim();
  if (!n) return null;
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(n)) return category;
  }
  return null;
}

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
  clearing = false;
  tree: Tree | null = null;
  rootId: string | null = null;
  groups: StackGroup[] = [];
  graphNodes: SkillGraphNode[] = [];

  linkCopied = false;
  badgeCopied = false;

  // Add-skill form
  newTitle = '';
  newCategory = 'language';
  categoryAutoDetected = false;
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
  /** Split a raw input into distinct skill titles ("Figma, Kubernetes" → two). */
  private parseTitles(raw: string): string[] {
    const seen = new Set<string>();
    return raw
      .split(/[,\n]+/)
      .map((t) => t.trim())
      .filter((t) => {
        if (!t) return false;
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  /** How many skills the current input will add (drives the button label). */
  get pendingCount(): number {
    return this.parseTitles(this.newTitle).length;
  }

  onNameChange(name: string) {
    this.newTitle = name;
    const titles = this.parseTitles(name);
    // The category picker only applies when a single skill is entered; a
    // comma-separated batch auto-detects each skill independently.
    const detected = titles.length === 1 ? detectCategoryFromTitle(titles[0]) : null;
    if (detected) {
      this.newCategory = detected;
      this.categoryAutoDetected = true;
    } else {
      this.categoryAutoDetected = false;
    }
  }

  levelCssClass(skill: StackSkill): string {
    const label = this.levelLabel(skill);
    if (label === 'core' || label === 'strong') return 'level-strong';
    if (label === 'familiar' || label === 'comfortable') return 'level-comfortable';
    return 'level-exposure';
  }

  addSkill() {
    const titles = this.parseTitles(this.newTitle);
    if (!titles.length || this.adding) return;
    this.adding = true;
    this.cdr.markForCheck();

    this.ensureRoot()
      .pipe(
        switchMap(({ treeId, rootId }) =>
          forkJoin(
            titles.map((title) => {
              // Auto-bucket each skill; fall back to the picked category.
              const key = detectCategoryFromTitle(title) ?? this.newCategory;
              const meta = CATEGORY_BY_KEY.get(key) ?? CATEGORIES[0];
              return this.nodesService.createNode({
                treeId,
                parentId: rootId,
                title,
                icon: meta.nodeIcon,
                positionX: 0,
                positionY: 0,
                level: 1,
                maxLevel: 3,
              });
            }),
          ),
        ),
      )
      .subscribe({
        next: () => {
          this.newTitle = '';
          this.categoryAutoDetected = false;
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

  /** Instant removal — no confirmation, removal is cheap and reversible by re-adding. */
  removeSkill(skill: StackSkill) {
    // Optimistic: drop it from the UI immediately, then persist.
    this.groups = this.groups
      .map((g) => ({ ...g, skills: g.skills.filter((s) => s.id !== skill.id) }))
      .filter((g) => g.skills.length > 0);
    this.graphNodes = this.graphNodes.filter((n) => n.id !== skill.id);
    this.cdr.markForCheck();
    this.nodesService.deleteNode(skill.id).subscribe({
      error: () => {
        this.dialogService.alert('Could not remove skill.');
        this.loadStack();
      },
    });
  }

  /** Remove every skill from the stack at once (keeps the empty map ready to refill). */
  async clearStack() {
    if (!this.totalSkills || this.clearing) return;
    if (!(await this.dialogService.confirm(`Remove all ${this.totalSkills} skills from your stack?`))) return;
    const ids = this.groups.flatMap((g) => g.skills.map((s) => s.id));
    this.clearing = true;
    this.cdr.markForCheck();
    forkJoin(ids.map((id) => this.nodesService.deleteNode(id))).subscribe({
      next: () => {
        this.clearing = false;
        this.loadStack();
      },
      error: () => {
        this.clearing = false;
        this.dialogService.alert('Could not clear the stack.');
        this.loadStack();
      },
    });
  }

  /** Cycle any skill through proficiency levels 1 → 2 → 3; recolours its map node live. */
  cycleLevel(skill: StackSkill) {
    const level = (skill.level % 3) + 1;
    this.nodesService.updateNode(skill.id, { level }).subscribe({
      next: () => {
        skill.level = level;
        const tier: SkillGraphNode['tier'] = level >= 3 ? 'core' : level >= 2 ? 'familiar' : 'exposure';
        // New array reference so the graph's OnPush change detection re-runs.
        this.graphNodes = this.graphNodes.map((n) => (n.id === skill.id ? { ...n, tier } : n));
        this.cdr.markForCheck();
      },
    });
  }

  levelLabel(skill: StackSkill): string {
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
