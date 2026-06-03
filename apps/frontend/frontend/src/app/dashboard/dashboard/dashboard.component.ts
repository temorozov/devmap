import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TreesService, Tree, ProfileViewStats } from '../../trees.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { ROLE_PROFILES, ROLE_PROFILE_KEYS, RoleProfile } from '../../shared/data/role-profiles';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  readonly treesService = inject(TreesService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  trees: TreeViewModel[] = [];
  loading = true;
  syncing = false;
  syncSuccess = false;
  syncedProfileUrl = '';
  viewStats: ProfileViewStats | null = null;
  showBadgeModal = false;

  // Skill gap
  readonly roleProfileKeys = ROLE_PROFILE_KEYS;
  readonly roleProfiles = ROLE_PROFILES;
  targetRoleKey = localStorage.getItem('devmap_target_role') ?? '';
  myVerifiedSkills: string[] = [];
  get targetRole(): RoleProfile | null { return this.roleProfiles[this.targetRoleKey] ?? null; }

  get devMap(): TreeViewModel | null { return this.trees.find(t => t.title === 'My Dev Map') ?? null; }
  get otherMaps(): TreeViewModel[] { return this.trees.filter(t => t.title !== 'My Dev Map'); }
  get topSkillsPreview(): string[] { return this.myVerifiedSkills.slice(0, 6); }

  private resolveSlot(slot: import('../../shared/data/role-profiles').SkillRequirement): { label: string; matched: string | null } {
    if (typeof slot === 'string') {
      return { label: slot, matched: this.myVerifiedSkills.includes(slot) ? slot : null };
    }
    const hit = slot.any.find(s => this.myVerifiedSkills.includes(s)) ?? null;
    return { label: slot.label, matched: hit };
  }

  get coreSlots(): { label: string; matched: string | null }[] {
    return (this.targetRole?.core ?? []).map(s => this.resolveSlot(s));
  }

  get recommendedSlots(): { label: string; matched: string | null }[] {
    return (this.targetRole?.recommended ?? []).map(s => this.resolveSlot(s));
  }

  get requiredHave(): string[] { return this.coreSlots.filter(s => s.matched).map(s => s.matched!); }
  get requiredMissing(): string[] { return this.coreSlots.filter(s => !s.matched).map(s => s.label); }

  get gapPercent(): number {
    const total = this.coreSlots.length;
    return total ? Math.round((this.requiredHave.length / total) * 100) : 0;
  }

  isGuest$ = this.authService.isGuest$;
  handle$ = this.authService.handle$;
  githubUsername$ = this.authService.githubUsername$;

  ngOnInit() {
    // Load fresh user data (handle/githubUsername may not be in old JWT)
    this.authService.loadMe().subscribe(() => this.cdr.markForCheck());

    this.loadTrees();
    this.loadViewStats();
    this.loadMySkills();

    // Auto-trigger GitHub scan after GitHub OAuth redirect
    this.route.queryParams.subscribe(params => {
      if (params['scan'] === '1') {
        this.router.navigate([], { replaceUrl: true, queryParams: {} });
        this.isGuest$.subscribe(isGuest => {
          if (!isGuest) this.syncGitHub();
        }).unsubscribe();
      }
    });
  }

  loadMySkills() {
    this.isGuest$.subscribe(isGuest => {
      if (!isGuest) {
        this.treesService.getMySkills().subscribe({
          next: (skills) => { this.myVerifiedSkills = skills; this.cdr.markForCheck(); },
        });
      }
    }).unsubscribe();
  }

  setTargetRole(key: string) {
    this.targetRoleKey = key;
    localStorage.setItem('devmap_target_role', key);
    this.treesService.saveTargetRole(key).subscribe();
    this.cdr.markForCheck();
  }

  loadViewStats() {
    this.isGuest$.subscribe(isGuest => {
      if (!isGuest) {
        this.treesService.getViewStats().subscribe({
          next: (stats) => { this.viewStats = stats; this.cdr.markForCheck(); },
        });
      }
    }).unsubscribe();
  }

  loadTrees() {
    this.loading = true;
    this.treesService.getTrees().subscribe({
      next: (data) => {
        this.trees = data.map(t => this.toViewModel(t));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openTree(id: string) {
    this.router.navigate(['/tree', id]);
  }

  async deleteTree(event: Event, id: string) {
    event.stopPropagation();
    if (await this.dialogService.confirm('Delete this skill map? This cannot be undone.')) {
      this.treesService.deleteTree(id).subscribe({
        next: () => {
          this.trees = this.trees.filter(t => t.id !== id);
          this.cdr.markForCheck();
        },
      });
    }
  }

  logout() {
    this.authService.logout();
  }

  copyShareLink(event: Event, token: string) {
    event.stopPropagation();
    const url = `${window.location.origin}/tree/${token}`;
    navigator.clipboard.writeText(url);
    this.dialogService.alert('Share link copied to clipboard.');
  }

  syncGitHub() {
    this.syncing = true;
    this.syncSuccess = false;
    this.cdr.markForCheck();
    this.treesService.syncGitHub().subscribe({
      next: () => {
        this.syncing = false;
        this.loadTrees();
        // Show inline success state with profile URL
        const handle = this.authService['user'].getValue()?.handle
          ?? this.authService['user'].getValue()?.githubUsername;
        this.syncSuccess = true;
        this.syncedProfileUrl = handle ? `${window.location.origin}/u/${handle}` : '';
        this.cdr.markForCheck();
      },
      error: () => {
        this.syncing = false;
        this.dialogService.alert('GitHub sync failed. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }

  copyProfileUrl() {
    navigator.clipboard.writeText(this.syncedProfileUrl);
    this.dialogService.alert('Profile link copied to clipboard!');
  }

  badgeMarkdown(): string {
    const handle = this.authService['user'].getValue()?.handle
      ?? this.authService['user'].getValue()?.githubUsername
      ?? '';
    const origin = window.location.origin;
    return `[![DevMap](${origin}/api/badge/${handle})](${origin}/u/${handle})`;
  }

  copyBadgeMarkdown() {
    navigator.clipboard.writeText(this.badgeMarkdown());
    this.dialogService.alert('Badge markdown copied!');
  }

  trackByTreeId(_index: number, tree: TreeViewModel) {
    return tree.id;
  }

  private toViewModel(tree: Tree): TreeViewModel {
    const d = new Date(tree.updatedAt);
    const formatted = d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    return { ...tree, updatedLabel: formatted };
  }
}

type TreeViewModel = Tree & { updatedLabel: string };
