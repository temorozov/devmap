import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TreesService, Tree } from '../../trees.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  treesService = inject(TreesService);
  authService = inject(AuthService);
  router = inject(Router);

  trees: Tree[] = [];
  loading = true;
  showCreateModal = false;
  newTreeTitle = '';
  isGuest$ = this.authService.isGuest$;

  ngOnInit() {
    this.loadTrees();
  }

  loadTrees() {
    this.loading = true;
    this.treesService.getTrees().subscribe({
      next: (data) => {
        this.trees = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openTree(id: string) {
    this.router.navigate(['/tree', id]);
  }

  createTree() {
    if (!this.newTreeTitle.trim()) return;
    this.treesService.createTree(this.newTreeTitle).subscribe({
      next: (tree) => {
        this.trees.unshift(tree);
        this.showCreateModal = false;
        this.newTreeTitle = '';
        this.openTree(tree.id);
      }
    });
  }

  deleteTree(event: Event, id: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this tree?')) {
      this.treesService.deleteTree(id).subscribe({
        next: () => {
          this.trees = this.trees.filter(t => t.id !== id);
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
    alert('Share link copied to clipboard!');
  }
}
