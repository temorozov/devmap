import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TreesService, PublicProfile } from '../../trees.service';
import { NodeEvidence, SkillNode } from '../../nodes.service';
import { ROLE_PROFILES, RoleProfile } from '../../shared/data/role-profiles';
import { SkillGraphComponent, SkillGraphNode } from '../../shared/components/skill-graph/skill-graph.component';
import { skillNodesToGraph } from '../../shared/components/skill-graph/skill-graph.mapper';
import {
  GapAnalysis, NearReadyHint, TopProject,
  buildRepoSkillsMap, computeGapAnalysis, computeNearReadyHints, computeTopProject, verifiedSkillTitles,
} from '../../shared/data/skill-gap';

const CATEGORY_META: Record<string, { label: string; icon: string; order: number }> = {
  language: { label: 'Languages',  icon: 'code',           order: 1 },
  frontend: { label: 'Frontend',   icon: 'web',            order: 2 },
  backend:  { label: 'Backend',    icon: 'dns',            order: 3 },
  database: { label: 'Databases',  icon: 'storage',        order: 4 },
  devops:   { label: 'DevOps',     icon: 'cloud',          order: 5 },
  mobile:   { label: 'Mobile',     icon: 'smartphone',     order: 6 },
  testing:  { label: 'Testing',    icon: 'science',        order: 7 },
  ml:       { label: 'ML / AI',    icon: 'psychology',     order: 8 },
  tooling:  { label: 'Tooling',    icon: 'settings',       order: 9 },
};

interface SkillGroup {
  category: string;
  label: string;
  icon: string;
  skills: Array<{
    title: string;
    verified: boolean;
    evidence: NodeEvidence[] | null | undefined;
    repoCount: number;
    proficiency: 'core' | 'familiar' | 'exposure' | null;
    lastSeen: string | null;
  }>;
}


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, SkillGraphComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly treesService = inject(TreesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  profile: PublicProfile | null = null;
  loading = true;
  error = '';
  skillGroups: SkillGroup[] = [];
  linkCopied = false;

  ngOnInit() {
    const handle = this.route.snapshot.paramMap.get('handle') ?? '';
    this.treesService.getPublicProfile(handle).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.skillGroups = this.buildSkillGroups(profile);
        this.graphNodes = skillNodesToGraph(profile.devMap?.nodes ?? []);
        this.loading = false;
        this.cdr.markForCheck();
        this.updateMeta(profile);
      },
      error: () => {
        this.error = 'Profile not found';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get githubUrl(): string {
    return this.profile?.githubUsername
      ? `https://github.com/${this.profile.githubUsername}`
      : '';
  }

  /** Real skill counts derived from the grouped skills (excludes the structural root). */
  get totalSkillCount(): number {
    return this.skillGroups.reduce((n, g) => n + g.skills.length, 0);
  }

  get verifiedSkillCount(): number {
    return this.skillGroups.reduce((n, g) => n + g.skills.filter(s => s.verified).length, 0);
  }

  get verifiedPercent(): number {
    const total = this.totalSkillCount;
    if (!total) return 0;
    return Math.round((this.verifiedSkillCount / total) * 100);
  }

  get memberSinceYear(): string {
    if (!this.profile?.memberSince) return '—';
    return new Date(this.profile.memberSince).getFullYear().toString();
  }

  get targetRoleProfile(): RoleProfile | null {
    return this.profile?.targetRole ? (ROLE_PROFILES[this.profile.targetRole] ?? null) : null;
  }

  private get devMapNodes(): SkillNode[] {
    return this.profile?.devMap?.nodes ?? [];
  }

  get verifiedSkillTitles(): string[] {
    return verifiedSkillTitles(this.devMapNodes);
  }

  /**
   * Skills mapped into the live force-graph — built from the real tree nodes
   * (same source as the dashboard/canvas) so the map is identical everywhere.
   * Cached so the @Input reference stays stable across change detection.
   */
  graphNodes: SkillGraphNode[] = [];

  get hasGraph(): boolean {
    return this.graphNodes.length >= 3;
  }

  get gapAnalysis(): GapAnalysis | null {
    const role = this.targetRoleProfile;
    if (!role) return null;
    return computeGapAnalysis(role, this.verifiedSkillTitles, buildRepoSkillsMap(this.devMapNodes));
  }

  get topProject(): TopProject | null {
    const gap = this.gapAnalysis;
    return gap ? computeTopProject(gap, buildRepoSkillsMap(this.devMapNodes)) : null;
  }

  get nearReadyHints(): NearReadyHint[] {
    const gap = this.gapAnalysis;
    return gap ? computeNearReadyHints(gap, this.verifiedSkillTitles) : [];
  }

  ngOnDestroy() {
    this.titleService.setTitle('DevMap');
    this.meta.removeTag('name="description"');
    this.meta.removeTag('property="og:title"');
    this.meta.removeTag('property="og:description"');
    this.meta.removeTag('property="og:image"');
    this.meta.removeTag('property="og:url"');
    this.meta.removeTag('property="og:type"');
    this.meta.removeTag('name="twitter:card"');
    this.meta.removeTag('name="twitter:title"');
    this.meta.removeTag('name="twitter:description"');
    this.meta.removeTag('name="twitter:image"');
  }

  private updateMeta(profile: PublicProfile) {
    const topSkills = this.skillGroups
      .flatMap(g => g.skills.filter(s => s.verified).map(s => s.title))
      .slice(0, 5)
      .join(', ');
    const title = `@${profile.handle} — ${profile.verifiedSkills} GitHub-verified skills | DevMap`;
    const description = topSkills
      ? `${topSkills}${profile.verifiedSkills > 5 ? ` +${profile.verifiedSkills - 5} more` : ''} · verified from GitHub repos`
      : `${profile.verifiedSkills} GitHub-verified developer skills on DevMap.`;
    const origin = window.location.origin;
    const cardUrl = `${origin}/api/badge/${profile.handle}?theme=dark`;
    const url = window.location.href;

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: cardUrl });
    this.meta.updateTag({ property: 'og:image:width', content: '495' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'profile' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: cardUrl });
  }

  copyProfileLink() {
    navigator.clipboard.writeText(window.location.href);
    this.linkCopied = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.linkCopied = false; this.cdr.markForCheck(); }, 2000);
  }

  getEvidenceLabel(evidence: NodeEvidence[] | null | undefined): string {
    if (!evidence || evidence.length === 0) return '';
    const repos = [...new Set(evidence.map(e => e.repo).filter(Boolean))];
    return repos.length === 1
      ? `in ${repos[0]}`
      : `in ${repos.length} repos`;
  }

  private buildSkillGroups(profile: PublicProfile): SkillGroup[] {
    const nodes: SkillNode[] = profile.devMap?.nodes ?? [];
    const categoryMap = new Map<string, SkillGroup>();

    for (const node of nodes) {
      // Skip the structural root ("Dev Skills"); only real skills have a parent.
      if (!node.parentId) continue;
      const category = this.inferCategory(node);
      const meta = CATEGORY_META[category] ?? { label: 'Other', icon: 'star', order: 99 };

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { category, label: meta.label, icon: meta.icon, skills: [] });
      }

      const isVerified = node.verified === true || node.source === 'github';
      const evidenceArr = (node.evidence as Array<Record<string, unknown>> | null) ?? [];
      const metaEntry = evidenceArr.find(e => e['_meta']);
      const repoCount = metaEntry
        ? (metaEntry['repoCount'] as number ?? 0)
        : evidenceArr.filter(e => !e['_meta']).length;
      const lastSeen = metaEntry ? (metaEntry['lastSeen'] as string | null) : null;
      const proficiency: 'core' | 'familiar' | 'exposure' | null = isVerified
        ? (repoCount >= 5 ? 'core' : repoCount >= 2 ? 'familiar' : 'exposure')
        : null;

      categoryMap.get(category)!.skills.push({
        title: node.title,
        verified: isVerified,
        evidence: node.evidence,
        repoCount,
        proficiency,
        lastSeen,
      });
    }

    return Array.from(categoryMap.values()).sort((a, b) => {
      const ao = CATEGORY_META[a.category]?.order ?? 99;
      const bo = CATEGORY_META[b.category]?.order ?? 99;
      return ao - bo;
    });
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
}
