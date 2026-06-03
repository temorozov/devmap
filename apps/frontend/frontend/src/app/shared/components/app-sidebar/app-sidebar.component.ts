import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfileViewStats } from '../../../trees.service';

export type SidebarKey = 'profile' | 'skillmap' | 'career' | 'explore' | 'compare';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  /** Currently active destination — drives highlight. */
  @Input() active: SidebarKey = 'profile';
  @Input() isGuest = true;
  @Input() handle: string | null = null;
  @Input() githubUsername: string | null = null;
  @Input() viewStats: ProfileViewStats | null = null;
  @Input() syncing = false;

  @Output() sync = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  readonly mobileOpen = signal(false);

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  get avatarUrl(): string {
    return this.githubUsername
      ? `https://avatars.githubusercontent.com/${this.githubUsername}`
      : '';
  }
}
