import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom, forkJoin, of, switchMap } from 'rxjs';
import { TreesService, Tree, GuestScanSkill } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { SkillGraphComponent, SkillGraphNode } from '../../shared/components/skill-graph/skill-graph.component';
import { skillNodesToGraph, skillRepoCount } from '../../shared/components/skill-graph/skill-graph.mapper';

const DEV_MAP_TITLE = 'My Dev Map';
const STACK_ROOT_TITLE = 'Dev Skills';

// ── Skill name normalization ──────────────────────────────────────────────────

interface SkillEntry { aliases: string[]; canonical: string }

/** Canonical forms + common aliases/typos for popular technologies. */
const SKILL_NAMES: SkillEntry[] = [
  { aliases: ['nestjs', 'nest js', 'nest.js', 'netsjs', 'nets js'], canonical: 'Nest.js' },
  { aliases: ['nextjs', 'next js', 'next.js', 'nex tjs', 'nxtjs'], canonical: 'Next.js' },
  { aliases: ['reactjs', 'react js', 'react.js', 'reacts'], canonical: 'React' },
  { aliases: ['vuejs', 'vue js', 'vue.js', 'vuej'], canonical: 'Vue.js' },
  { aliases: ['nodejs', 'node js', 'node.js', 'ndoejs', 'nod ejs'], canonical: 'Node.js' },
  { aliases: ['expressjs', 'express js', 'express.js', 'expresjs', 'expres js'], canonical: 'Express.js' },
  { aliases: ['sveltejs', 'svelte js', 'svelte.js', 'svelt'], canonical: 'Svelte' },
  { aliases: ['sveltekit', 'svelte kit', 'sveltkit', 'sveltekt'], canonical: 'SvelteKit' },
  { aliases: ['nuxtjs', 'nuxt js', 'nuxt.js', 'nuxtj'], canonical: 'Nuxt.js' },
  { aliases: ['angularjs', 'angluar', 'anglar', 'anglr'], canonical: 'Angular' },
  { aliases: ['tailwindcss', 'tailwind css', 'tailwindcss', 'tailwnd', 'talwind'], canonical: 'Tailwind CSS' },
  { aliases: ['vitejs', 'vite js', 'vite.js', 'viet'], canonical: 'Vite' },
  { aliases: ['webpck', 'web pack', 'webpak'], canonical: 'Webpack' },
  { aliases: ['graphql', 'grapql', 'graphqll', 'grphql'], canonical: 'GraphQL' },
  { aliases: ['trpc', 'trpcc', 't rpc'], canonical: 'tRPC' },
  { aliases: ['golang', 'go lang', 'golng', 'golan'], canonical: 'Go' },
  { aliases: ['kubernetes', 'k8s', 'kuberentes', 'kubernets', 'kubernetis', 'kubernete'], canonical: 'Kubernetes' },
  { aliases: ['docker', 'dokcer', 'dockr', 'docekr'], canonical: 'Docker' },
  { aliases: ['postgresql', 'postgrsql', 'posgresql', 'postgesql', 'postgressql', 'postgress'], canonical: 'PostgreSQL' },
  { aliases: ['mongodb', 'mongo db', 'mongod', 'mangodb', 'moondb'], canonical: 'MongoDB' },
  { aliases: ['redis', 'reddis', 'readis', 'rediss'], canonical: 'Redis' },
  { aliases: ['mysql', 'my sql', 'mysq', 'mysqll'], canonical: 'MySQL' },
  { aliases: ['sqlite', 'sq lite', 'sqllite', 'sqllite'], canonical: 'SQLite' },
  { aliases: ['elasticsearch', 'elastic search', 'elasticserch', 'elasticsrch'], canonical: 'Elasticsearch' },
  { aliases: ['supabase', 'supabse', 'supabas', 'suapbase'], canonical: 'Supabase' },
  { aliases: ['firebase', 'firebse', 'frebase', 'firebas'], canonical: 'Firebase' },
  { aliases: ['openai', 'openaii', 'open ai', 'opanai', 'openal', 'opneai'], canonical: 'OpenAI' },
  { aliases: ['openai sdk', 'openaii sdk', 'open ai sdk', 'opanai sdk', 'openal sdk'], canonical: 'OpenAI SDK' },
  { aliases: ['langchain', 'lang chain', 'langchan', 'langchin'], canonical: 'LangChain' },
  { aliases: ['huggingface', 'hugging face', 'hugingface', 'huggin face'], canonical: 'Hugging Face' },
  { aliases: ['tensorflow', 'tensorfow', 'tensrflow', 'tensoflow'], canonical: 'TensorFlow' },
  { aliases: ['pytorch', 'pytoch', 'pytroch', 'pytorchh'], canonical: 'PyTorch' },
  { aliases: ['scikit-learn', 'scikit learn', 'sklearn', 'scikitlearn'], canonical: 'scikit-learn' },
  { aliases: ['pandas', 'pandaas', 'pandass', 'pandsa'], canonical: 'Pandas' },
  { aliases: ['numpy', 'numpay', 'nmpy', 'numpyy'], canonical: 'NumPy' },
  { aliases: ['fastapi', 'fast api', 'fstapi', 'fasatpi'], canonical: 'FastAPI' },
  { aliases: ['django', 'djano', 'djagno', 'djangoo'], canonical: 'Django' },
  { aliases: ['flask', 'fask', 'flsk', 'flaask'], canonical: 'Flask' },
  { aliases: ['spring boot', 'springboot', 'spring-boot', 'sprngboot'], canonical: 'Spring Boot' },
  { aliases: ['rails', 'ruby on rails', 'ror', 'rubyon rails'], canonical: 'Rails' },
  { aliases: ['laravel', 'laraavel', 'larravel', 'laravell'], canonical: 'Laravel' },
  { aliases: ['github actions', 'gh actions', 'githubactions', 'github action'], canonical: 'GitHub Actions' },
  { aliases: ['gitlab ci', 'gitlab-ci', 'gitlabci', 'gitlab ci/cd'], canonical: 'GitLab CI' },
  { aliases: ['terraform', 'teraform', 'terrafrom', 'terrafrm', 'terraformd'], canonical: 'Terraform' },
  { aliases: ['ansible', 'ansibel', 'anisble', 'ansibe'], canonical: 'Ansible' },
  { aliases: ['argocd', 'argo cd', 'argo-cd', 'argood'], canonical: 'ArgoCD' },
  { aliases: ['jenkins', 'jenkns', 'jenkis', 'jenkin'], canonical: 'Jenkins' },
  { aliases: ['nginx', 'ngix', 'ngnix', 'ngnx', 'ngnix'], canonical: 'Nginx' },
  { aliases: ['react native', 'reactnative', 'react-native', 'react natve'], canonical: 'React Native' },
  { aliases: ['flutter', 'fluutter', 'flottr', 'fluter'], canonical: 'Flutter' },
  { aliases: ['swiftui', 'swift ui', 'swiftui'], canonical: 'SwiftUI' },
  { aliases: ['kotlin', 'kotln', 'kotin', 'kotlinn'], canonical: 'Kotlin' },
  { aliases: ['typescript', 'typscript', 'typscrpt', 'typescirpt'], canonical: 'TypeScript' },
  { aliases: ['javascript', 'javascrip', 'javascrit', 'javacsript'], canonical: 'JavaScript' },
  { aliases: ['fastify', 'fstify', 'fastif', 'fstify'], canonical: 'Fastify' },
  { aliases: ['prisma', 'prismaorm', 'prismaa', 'prism orm'], canonical: 'Prisma' },
  { aliases: ['clickhouse', 'click house', 'clckhouse', 'clicckhouse'], canonical: 'ClickHouse' },
  { aliases: ['cassandra', 'casandra', 'cassndra', 'casssandra'], canonical: 'Cassandra' },
  { aliases: ['kafka', 'kafak', 'kafaka', 'kakfa'], canonical: 'Kafka' },
  { aliases: ['rabbitmq', 'rabbit mq', 'rabitmq', 'rabbitq'], canonical: 'RabbitMQ' },
  { aliases: ['playwright', 'playwrght', 'playwriht', 'playwrigh'], canonical: 'Playwright' },
  { aliases: ['cypress', 'cypres', 'cyprss', 'cpress'], canonical: 'Cypress' },
  { aliases: ['vitest', 'vitset', 'vtest', 'vi test'], canonical: 'Vitest' },
  { aliases: ['storybook', 'storybok', 'stroybook', 'storbook'], canonical: 'Storybook' },
  { aliases: ['figma', 'figm', 'fimga', 'figgma'], canonical: 'Figma' },
  { aliases: ['remix', 'remixjs', 'remix.js', 'rmix'], canonical: 'Remix' },
  { aliases: ['astrojs', 'astro js', 'astro.js', 'astoo'], canonical: 'Astro' },
  { aliases: ['grpc', 'grpcc', 'g rpc', 'grpv'], canonical: 'gRPC' },
  { aliases: ['apollo', 'apollographql', 'apollo graphql', 'apolllo'], canonical: 'Apollo' },
  { aliases: ['hono', 'honoo', 'honno'], canonical: 'Hono' },
  { aliases: ['dynamo db', 'dynamodb', 'dynamo', 'dynamobd'], canonical: 'DynamoDB' },
  { aliases: ['stripe', 'strpe', 'stipe', 'stripee'], canonical: 'Stripe' },
  { aliases: ['deno', 'denoo', 'deno.js', 'de no'], canonical: 'Deno' },
  { aliases: ['bunjs', 'bun.js', 'bun js', 'bun.sh'], canonical: 'Bun' },
  { aliases: ['websocket', 'websockets', 'web socket', 'web sockets'], canonical: 'WebSockets' },
];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/**
 * Returns the canonical form of a skill name if the input is a known alias or
 * close typo. Returns null when the input is already canonical or has no match.
 */
function normalizeSkillTitle(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (!lower) return null;

  // Exact alias match
  for (const { aliases, canonical } of SKILL_NAMES) {
    if (aliases.includes(lower)) return canonical;
  }

  // Input already matches canonical (case-insensitive) — no correction needed
  for (const { canonical } of SKILL_NAMES) {
    if (canonical.toLowerCase() === lower) return null;
  }

  // Fuzzy match — only for inputs ≥ 5 chars to avoid false positives
  if (lower.length >= 5) {
    let best: string | null = null;
    let bestDist = Infinity;
    for (const { aliases, canonical } of SKILL_NAMES) {
      for (const alias of [...aliases, canonical.toLowerCase()]) {
        if (alias.length < 4) continue;
        const dist = levenshtein(lower, alias);
        const threshold = Math.min(2, Math.floor(Math.max(lower.length, alias.length) * 0.25));
        if (dist > 0 && dist <= threshold && dist < bestDist) {
          bestDist = dist;
          best = canonical;
        }
      }
    }
    return best;
  }

  return null;
}

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
  previewing = false;
  clearing = false;

  showImportPreview = false;
  previewSkills: Array<GuestScanSkill & { selected: boolean }> = [];

  /** Raw nodes from the last load — kept around so bulk deletes can respect parent/child order. */
  private currentNodes: SkillNode[] = [];
  tree: Tree | null = null;
  rootId: string | null = null;
  groups: StackGroup[] = [];
  graphNodes: SkillGraphNode[] = [];

  linkCopied = false;
  badgeCopied = false;
  showBadgeModal = false;
  badgePreviewBust = Date.now();

  // Add-skill form
  newTitle = '';
  newCategory = 'language';
  categoryAutoDetected = false;
  correction: string | null = null;
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
    this.currentNodes = nodes;
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
      const group = byKey.get(key);
      if (!group) continue;
      group.skills.push({
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
    this.previewing = true;
    this.cdr.markForCheck();
    this.treesService.previewGitHub().subscribe({
      next: (skills) => {
        this.previewing = false;
        if (!skills.length) { this.doSync(); return; }
        this.previewSkills = skills.map((s) => ({ ...s, selected: true }));
        this.showImportPreview = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.previewing = false;
        this.dialogService.alert('GitHub refresh failed. Make sure your GitHub account is connected.');
        this.cdr.markForCheck();
      },
    });
  }

  confirmImport() {
    const selected = this.previewSkills.filter((s) => s.selected).map((s) => s.title);
    const skip = this.previewSkills.filter((s) => !s.selected).map((s) => s.title);
    this.showImportPreview = false;
    // Persist the choice so a later webhook-triggered re-sync respects it too —
    // unchecking here previously only skipped this one sync. Must finish before
    // doSync runs, otherwise the sync filters by the stale excludedSkills list
    // and hides skills the user just re-checked.
    const persist = [
      ...skip.map((title) => this.treesService.excludeGithubSkill(title)),
      ...selected.map((title) => this.treesService.allowGithubSkill(title)),
    ];
    if (!persist.length) { this.doSync(skip); return; }
    forkJoin(persist).subscribe({
      next: () => this.doSync(skip),
      error: () => this.doSync(skip),
    });
  }

  cancelImport() {
    this.showImportPreview = false;
    this.previewSkills = [];
  }

  get selectedPreviewCount(): number {
    return this.previewSkills.filter((s) => s.selected).length;
  }

  private doSync(skip: string[] = []) {
    this.refreshing = true;
    this.cdr.markForCheck();
    this.treesService.syncGitHub(skip).subscribe({
      next: () => { this.refreshing = false; this.loadStack(); },
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
    // Typo / alias correction hint for a single skill
    if (titles.length === 1) {
      const norm = normalizeSkillTitle(titles[0]);
      this.correction = norm && norm !== titles[0] ? norm : null;
    } else {
      this.correction = null;
    }
  }

  acceptCorrection() {
    if (!this.correction) return;
    const corrected = this.correction;
    this.correction = null;
    this.newTitle = corrected;
    const detected = detectCategoryFromTitle(corrected);
    if (detected) {
      this.newCategory = detected;
      this.categoryAutoDetected = true;
    } else {
      this.categoryAutoDetected = false;
    }
    this.cdr.markForCheck();
  }

  levelCssClass(skill: StackSkill): string {
    const label = this.levelLabel(skill);
    if (label === 'core' || label === 'strong') return 'level-strong';
    if (label === 'familiar' || label === 'comfortable') return 'level-comfortable';
    return 'level-exposure';
  }

  addSkill() {
    const titles = this.parseTitles(this.newTitle).map((t) => normalizeSkillTitle(t) ?? t);
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
          // Un-blacklist each manually-added title so a future GitHub sync
          // can restore it if the user added it back intentionally.
          for (const title of titles) {
            this.treesService.allowGithubSkill(title).subscribe();
          }
          this.newTitle = '';
          this.categoryAutoDetected = false;
          this.correction = null;
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
    this.clearing = true;
    this.cdr.markForCheck();
    try {
      // Delete leaves first, then work upward. The DB rejects removing a node
      // while any child still exists, so bulk clear must peel the tree level by
      // level instead of firing the whole stack in parallel. Include roots too,
      // otherwise structural/orphan nodes survive as "ghosts".
      for (const ids of this.skillIdsByDepthDescending()) {
        if (ids.length) await firstValueFrom(forkJoin(ids.map((id) => this.nodesService.deleteNode(id))));
      }
      this.clearing = false;
      this.loadStack();
    } catch {
      this.clearing = false;
      this.dialogService.alert('Could not clear the stack.');
      this.loadStack();
    }
  }

  /**
   * Group node ids from leaves upward so bulk deletion can safely remove
   * children before their parents, regardless of API response order.
   */
  private skillIdsByDepthDescending(): string[][] {
    const nodes = this.currentNodes;
    if (!nodes.length) return [];

    const parentById = new Map(nodes.map((node) => [node.id, node.parentId ?? null]));
    const childCount = new Map<string, number>(nodes.map((node) => [node.id, 0]));

    for (const node of nodes) {
      const parentId = node.parentId;
      if (!parentId || !childCount.has(parentId)) continue;
      childCount.set(parentId, (childCount.get(parentId) ?? 0) + 1);
    }

    const remaining = new Set(nodes.map((node) => node.id));
    const orderedIds = nodes.map((node) => node.id);
    const layers: string[][] = [];

    while (remaining.size) {
      const layer = orderedIds.filter((id) => remaining.has(id) && (childCount.get(id) ?? 0) === 0);

      if (!layer.length) {
        // Defensive fallback for a corrupted cycle or orphaned subgraph:
        // delete whatever remains in a deterministic order rather than spin.
        layers.push([...remaining]);
        break;
      }

      layers.push(layer);
      for (const id of layer) {
        remaining.delete(id);
        const parentId = parentById.get(id);
        if (!parentId || !remaining.has(parentId)) continue;
        childCount.set(parentId, Math.max(0, (childCount.get(parentId) ?? 0) - 1));
      }
    }

    return layers;
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

  get badgeSnippet(): string {
    const h = this.currentHandle();
    if (!h) return '';
    const origin = window.location.origin;
    return `[![DevMap](${origin}/api/trees/badge/${h})](${origin}/u/${h})`;
  }

  get badgeImageUrl(): string {
    const h = this.currentHandle();
    if (!h) return '';
    // Cache-bust the in-app preview so it always reflects the current stack
    // (the badge route is cached, and a stale empty version must not stick).
    return `${window.location.origin}/api/trees/badge/${h}?v=${this.badgePreviewBust}`;
  }

  openBadgePreview() {
    this.badgePreviewBust = Date.now();
    this.showBadgeModal = true;
    this.cdr.markForCheck();
  }

  closeBadgeModal() {
    this.showBadgeModal = false;
    this.badgeCopied = false;
    this.cdr.markForCheck();
  }

  copyBadgeSnippet() {
    const snippet = this.badgeSnippet;
    if (!snippet) return;
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
