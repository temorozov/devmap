import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { DEMO_TREE_ID } from '../../shared/data/demo-sample';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly authService = inject(AuthService);
  readonly demoTreeUrl = `/tree/${DEMO_TREE_ID}`;

  get authEntryRoute(): string {
    return this.authService.hasValidToken() ? '/dashboard' : '/login';
  }
}
