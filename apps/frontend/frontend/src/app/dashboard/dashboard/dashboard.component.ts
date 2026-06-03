import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TreesService, Tree, ProfileViewStats } from '../../trees.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { DEMO_TREE_ID } from '../../shared/data/demo-sample';
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
  showCreateModal = false;
  newTreeTitle = '';
  syncSuccess = false;
  syncedProfileUrl = '';
  viewStats: ProfileViewStats | null = null;

  // Skill gap
  readonly roleProfileKeys = ROLE_PROFILE_KEYS;
  readonly roleProfiles = ROLE_PROFILES;
  targetRoleKey = localStorage.getItem('devmap_target_role') ?? '';
  myVerifiedSkills: string[] = [];
  get targetRole(): RoleProfile | null { return this.roleProfiles[this.targetRoleKey] ?? null; }
  get requiredHave(): string[] { return (this.targetRole?.required ?? []).filter(s => this.myVerifiedSkills.includes(s)); }
  get requiredMissing(): string[] { return (this.targetRole?.required ?? []).filter(s => !this.myVerifiedSkills.includes(s)); }
  get gapPercent(): number {
    const total = this.targetRole?.required.length ?? 0;
    return total ? Math.round((this.requiredHave.length / total) * 100) : 0;
  }

  isGuest$ = this.authService.isGuest$;
  handle$ = this.authService.handle$;
  githubUsername$ = this.authService.githubUsername$;
  readonly demoTreeId = DEMO_TREE_ID;

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

  openCreateModal() {
    this.newTreeTitle = '';
    this.showCreateModal = true;
  }

  createTree() {
    const title = this.newTreeTitle.trim();
    if (!title) return;
    this.treesService.createTree(title).subscribe({
      next: (tree) => {
        this.trees.unshift(this.toViewModel(tree));
        this.showCreateModal = false;
        this.newTreeTitle = '';
        this.cdr.markForCheck();
        this.router.navigate(['/tree', tree.id], { queryParams: { aiPrompt: title, openAi: '1' } });
      },
    });
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

  openDemoTree() {
    this.router.navigate(['/tree', this.demoTreeId]);
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
