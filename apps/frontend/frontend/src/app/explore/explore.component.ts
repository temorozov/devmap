import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TreesService, ExploreProfile } from '../trees.service';
import { AuthService } from '../auth.service';
import { AppSidebarComponent } from '../shared/components/app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterModule, AppSidebarComponent],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreComponent implements OnInit {
  private readonly treesService = inject(TreesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  profiles: ExploreProfile[] = [];
  loading = true;

  readonly isGuest$ = this.authService.isGuest$;
  readonly handle$ = this.authService.handle$;
  readonly githubUsername$ = this.authService.githubUsername$;

  onSync() {
    this.router.navigate(['/dashboard'], { queryParams: { scan: 1 } });
  }

  onLogout() {
    this.authService.logout();
  }

  ngOnInit() {
    this.authService.loadMe().subscribe(() => this.cdr.markForCheck());
    this.treesService.getExploreProfiles().subscribe({
      next: (profiles) => {
        this.profiles = profiles;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  avatarUrl(profile: ExploreProfile): string {
    return profile.githubUsername
      ? `https://avatars.githubusercontent.com/${profile.githubUsername}`
      : '';
  }
}
