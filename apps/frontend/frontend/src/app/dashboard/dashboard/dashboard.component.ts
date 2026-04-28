import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TreesService, Tree } from '../../trees.service';
import { AuthService } from '../../auth.service';
import { ActivityCalendarComponent } from '../../canvas/activity-calendar/activity-calendar.component';
import { DialogService } from '../../shared/services/dialog.service';
import { I18nService } from '../../shared/services/i18n.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { DEMO_TREE_ID } from '../../shared/data/demo-sample';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ActivityCalendarComponent, LanguageSwitcherComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  treesService = inject(TreesService);
  authService = inject(AuthService);
  router = inject(Router);
  dialogService = inject(DialogService);
  i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  trees: TreeViewModel[] = [];
  loading = true;
  showCreateModal = false;
  newTreeTitle = '';
  isGuest$ = this.authService.isGuest$;
  readonly demoTreeId = DEMO_TREE_ID;
  private readonly syncTreeLabelsWithLanguage = effect(() => {
    this.i18n.currentLanguage();
    this.trees = this.trees.map(tree => this.toViewModel(tree));
    this.cdr.markForCheck();
  });

  ngOnInit() {
    this.loadTrees();
  }

  loadTrees() {
    this.loading = true;
    this.treesService.getTrees().subscribe({
      next: (data) => {
        this.trees = data.map(tree => this.toViewModel(tree));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openTree(id: string) {
    this.router.navigate(['/tree', id]);
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
        this.router.navigate(['/tree', tree.id], {
          queryParams: {
            aiPrompt: title,
            openAi: '1',
          },
        });
      }
    });
  }

  async deleteTree(event: Event, id: string) {
    event.stopPropagation();
    if (await this.dialogService.confirm(this.i18n.t('dashboard.confirmDeleteTree'))) {
      this.treesService.deleteTree(id).subscribe({
        next: () => {
          this.trees = this.trees.filter(t => t.id !== id);
          this.cdr.markForCheck();
        }
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
    this.dialogService.alert(this.i18n.t('dashboard.shareCopied'));
  }

  openDemoTree() {
    this.router.navigate(['/tree', this.demoTreeId]);
  }

  trackByTreeId(_index: number, tree: TreeViewModel) {
    return tree.id;
  }

  openCreateModal() {
    this.newTreeTitle = '';
    this.showCreateModal = true;
  }

  private toViewModel(tree: Tree): TreeViewModel {
    const formattedDate = new Date(tree.updatedAt).toLocaleDateString(this.i18n.currentLanguage());
    return {
      ...tree,
      updatedLabel: this.i18n.t('dashboard.cardUpdated', { date: formattedDate }),
    };
  }
}

type TreeViewModel = Tree & {
  updatedLabel: string;
};
