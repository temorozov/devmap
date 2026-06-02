import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TreesService, PublicProfile } from '../../trees.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private treesService = inject(TreesService);
  private cdr = inject(ChangeDetectorRef);

  profile: PublicProfile | null = null;
  loading = true;
  error = '';

  ngOnInit() {
    const handle = this.route.snapshot.paramMap.get('handle') ?? '';
    this.treesService.getPublicProfile(handle).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loading = false;
        this.cdr.markForCheck();
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
    if (!this.profile || !this.profile.totalSkills) return 0;
    return Math.round((this.profile.verifiedSkills / this.profile.totalSkills) * 100);
  }
}
