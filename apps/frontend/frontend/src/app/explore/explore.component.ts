import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TreesService, ExploreProfile } from '../trees.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreComponent implements OnInit {
  private readonly treesService = inject(TreesService);
  private readonly cdr = inject(ChangeDetectorRef);

  profiles: ExploreProfile[] = [];
  loading = true;

  ngOnInit() {
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
