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
  tooling:  { label: 'Tooling',    icon: 'settings',       order: 8 },
};

interface SkillGroup {
  category: string;
  label: string;
  icon: string;
  skills: Array<{ title: string; verified: boolean; evidence: NodeEvidence[] | null | undefined }>;
}

interface SlotResult {
  label: string;
  matched: string | null;
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

  get gapAnalysis(): GapAnalysis | null {
    const role = this.targetRoleProfile;
    if (!role) return null;
    const verified = this.verifiedSkillTitles;

    const resolveSlots = (slots: SkillRequirement[]): SlotResult[] =>
      slots.map(slot => {
        if (typeof slot === 'string') {
          return { label: slot, matched: verified.includes(slot) ? slot : null };
        }
        const hit = slot.any.find(s => verified.includes(s)) ?? null;
        return { label: slot.label, matched: hit };
      });

    const core        = resolveSlots(role.core);
    const recommended = resolveSlots(role.recommended);
    const emerging    = role.emerging.map(s => ({ label: s, matched: verified.includes(s) ? s : null }));

    const score = (slots: SlotResult[]) =>
      slots.length === 0 ? 1 : slots.filter(s => s.matched).length / slots.length;

    const readinessPercent = Math.round(
      (score(core) * 0.6 + score(recommended) * 0.3 + score(emerging) * 0.1) * 100
    );

    return { role, core, recommended, emerging, readinessPercent };
  }

  get nearReadyHints(): NearReadyHint[] {
    const analysis = this.gapAnalysis;
    if (!analysis) return [];
    const verified = this.verifiedSkillTitles;

    const missingSkills = [
      ...analysis.core.filter(s => !s.matched).map(s => s.label),
      ...analysis.recommended.filter(s => !s.matched).map(s => s.label),
    ];

    return missingSkills
      .filter(skill => {
        const prereqs = SKILL_PREREQUISITES[skill];
        return prereqs && prereqs.length > 0 && prereqs.every(p => verified.includes(p));
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
    const title = `@${profile.handle} | DevMap — ${profile.verifiedSkills} verified skills`;
    const description = topSkills
      ? `${topSkills} and more — ${profile.verifiedSkills} skills verified from GitHub repos.`
      : `${profile.verifiedSkills} GitHub-verified developer skills on DevMap.`;
    const image = profile.githubUsername
      ? `https://avatars.githubusercontent.com/${profile.githubUsername}`
      : '';
    const url = window.location.href;

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'profile' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  copyProfileLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  getEvidenceLabel(evidence: NodeEvidence[] | null | undefined): string {
    if (!evidence || evidence.length === 0) return '';
    const repos = [...new Set(evidence.map(e => e.repo))];
    return repos.length === 1
      ? `in ${repos[0]}`
      : `in ${repos.length} repos`;
  }

  private buildSkillGroups(profile: PublicProfile): SkillGroup[] {
    const nodes: SkillNode[] = profile.devMap?.nodes ?? [];
    const categoryMap = new Map<string, SkillGroup>();

    for (const node of nodes) {
      const category = this.inferCategory(node);
      const meta = CATEGORY_META[category] ?? { label: 'Other', icon: 'star', order: 99 };

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { category, label: meta.label, icon: meta.icon, skills: [] });
      }

      categoryMap.get(category)!.skills.push({
        title: node.title,
        verified: node.verified === true || node.source === 'github',
        evidence: node.evidence,
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
    if (icon === 'dns') return 'backend';
    if (icon === 'storage') return 'database';
    if (icon === 'cloud' || icon === 'settings_suggest') return 'devops';
    if (icon === 'smartphone') return 'mobile';
    if (icon === 'science') return 'testing';
    return 'tooling';
  }
}
