import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TreesService, PublicProfile } from '../../trees.service';
import { NodeEvidence, SkillNode } from '../../nodes.service';
import { ROLE_PROFILES, RoleProfile, SkillRequirement, SKILL_PREREQUISITES } from '../../shared/data/role-profiles';

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

interface SlotResult {
  label: string;
  matched: string | null;
  repoCount: number;
  strength: 'strong' | 'medium' | 'weak' | 'missing';
}

interface GapAnalysis {
  role: RoleProfile;
  core: SlotResult[];
  recommended: SlotResult[];
  emerging: SlotResult[];
  readinessPercent: number;
}

interface NearReadyHint {
  title: string;
  prereqs: string[];
}

interface TopProject {
  repo: string;
  skills: string[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  get verifiedPercent(): number {
    if (!this.profile?.totalSkills) return 0;
    return Math.round((this.profile.verifiedSkills / this.profile.totalSkills) * 100);
  }

  get memberSinceYear(): string {
    if (!this.profile?.memberSince) return '—';
    return new Date(this.profile.memberSince).getFullYear().toString();
  }

  get targetRoleProfile(): RoleProfile | null {
    return this.profile?.targetRole ? (ROLE_PROFILES[this.profile.targetRole] ?? null) : null;
  }

  get verifiedSkillTitles(): string[] {
    return this.skillGroups.flatMap(g => g.skills.filter(s => s.verified).map(s => s.title));
  }

  private buildRepoSkillsMap(): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const group of this.skillGroups) {
      for (const skill of group.skills) {
        if (!skill.verified || !skill.evidence?.length) continue;
        for (const ev of skill.evidence) {
          if (!ev.repo) continue;
          if (!map.has(ev.repo)) map.set(ev.repo, new Set());
          map.get(ev.repo)!.add(skill.title);
        }
      }
    }
    return map;
  }

  private coOccurrenceStrength(
    title: string,
    otherCoreMatches: string[],
    repoMap: Map<string, Set<string>>
  ): { strength: 'strong' | 'medium' | 'weak'; repoCount: number } {
    let maxCoOccurring = 0;
    let repoCount = 0;
    for (const [, skills] of repoMap) {
      if (!skills.has(title)) continue;
      repoCount++;
      const n = otherCoreMatches.filter(s => s !== title && skills.has(s)).length;
      if (n > maxCoOccurring) maxCoOccurring = n;
    }
    const strength = maxCoOccurring >= 2 ? 'strong' : maxCoOccurring >= 1 ? 'medium' : 'weak';
    return { strength, repoCount };
  }

  private repoCount(title: string, repoMap: Map<string, Set<string>>): number {
    let n = 0;
    for (const skills of repoMap.values()) if (skills.has(title)) n++;
    return n;
  }

  get gapAnalysis(): GapAnalysis | null {
    const role = this.targetRoleProfile;
    if (!role) return null;
    const verified = this.verifiedSkillTitles;
    const repoMap = this.buildRepoSkillsMap();

    const matchTitle = (slot: SkillRequirement): string | null =>
      typeof slot === 'string'
        ? (verified.includes(slot) ? slot : null)
        : (slot.any.find(s => verified.includes(s)) ?? null);

    const slotLabel = (slot: SkillRequirement): string =>
      typeof slot === 'string' ? slot : slot.label;

    const coreMatches = role.core.map(matchTitle).filter(Boolean) as string[];

    const core: SlotResult[] = role.core.map(slot => {
      const matched = matchTitle(slot);
      if (!matched) return { label: slotLabel(slot), matched: null, repoCount: 0, strength: 'missing' };
      const { strength, repoCount } = this.coOccurrenceStrength(matched, coreMatches, repoMap);
      return { label: slotLabel(slot), matched, repoCount, strength };
    });

    const recommended: SlotResult[] = role.recommended.map(slot => {
      const matched = matchTitle(slot);
      const rc = matched ? this.repoCount(matched, repoMap) : 0;
      return { label: slotLabel(slot), matched, repoCount: rc, strength: matched ? 'medium' : 'missing' };
    });

    const emerging: SlotResult[] = role.emerging.map(s => ({
      label: s, matched: verified.includes(s) ? s : null,
      repoCount: verified.includes(s) ? this.repoCount(s, repoMap) : 0,
      strength: (verified.includes(s) ? 'medium' : 'missing') as 'medium' | 'missing',
    }));

    const strengthScore = (s: SlotResult['strength']) =>
      ({ strong: 1.0, medium: 0.7, weak: 0.4, missing: 0 })[s];

    const coreScore = core.length === 0 ? 1
      : core.reduce((sum, s) => sum + strengthScore(s.strength), 0) / core.length;
    const recScore  = recommended.length === 0 ? 1
      : recommended.filter(s => s.matched).length / recommended.length;
    const emgScore  = emerging.length === 0 ? 1
      : emerging.filter(s => s.matched).length / emerging.length;

    const readinessPercent = Math.round((coreScore * 0.6 + recScore * 0.3 + emgScore * 0.1) * 100);

    return { role, core, recommended, emerging, readinessPercent };
  }

  get topProject(): TopProject | null {
    const gap = this.gapAnalysis;
    if (!gap) return null;
    const repoMap = this.buildRepoSkillsMap();
    const coreMatched = gap.core.filter(s => s.matched).map(s => s.matched!);
    let best: TopProject | null = null;
    for (const [repo, skills] of repoMap) {
      const covered = coreMatched.filter(s => skills.has(s));
      if (covered.length >= 2 && (!best || covered.length > best.skills.length)) {
        best = { repo, skills: covered };
      }
    }
    return best;
  }

  get nearReadyHints(): NearReadyHint[] {
    const analysis = this.gapAnalysis;
    if (!analysis) return [];
    const verified = this.verifiedSkillTitles;
    const missing = [
      ...analysis.core.filter(s => !s.matched).map(s => s.label),
      ...analysis.recommended.filter(s => !s.matched).map(s => s.label),
    ];
    return missing
      .filter(skill => {
        const prereqs = SKILL_PREREQUISITES[skill];
        return prereqs?.length && prereqs.every(p => verified.includes(p));
      })
      .slice(0, 2)
      .map(skill => ({ title: skill, prereqs: SKILL_PREREQUISITES[skill] }));
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
