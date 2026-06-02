import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TreesService, Tree } from '../../trees.service';
import { AuthService } from '../../auth.service';
import { ActivityCalendarComponent } from '../../canvas/activity-calendar/activity-calendar.component';
import { DialogService } from '../../shared/services/dialog.service';
import { DEMO_TREE_ID } from '../../shared/data/demo-sample';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ActivityCalendarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  readonly treesService = inject(TreesService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  trees: TreeViewModel[] = [];
  loading = true;
  syncing = false;
  showCreateModal = false;
  newTreeTitle = '';

  isGuest$ = this.authService.isGuest$;
  readonly demoTreeId = DEMO_TREE_ID;

  ngOnInit() {
    this.loadTrees();
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
    this.cdr.markForCheck();
    this.treesService.syncGitHub().subscribe({
      next: (result) => {
        this.syncing = false;
        this.loadTrees();
        this.dialogService.alert(
          `Sync complete — ${result.verifiedCount} verified skills detected across ${result.nodeCount} nodes.`
        );
      },
      error: () => {
        this.syncing = false;
        this.dialogService.alert('GitHub sync failed. Please try again.');
        this.cdr.markForCheck();
      },
    });
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
