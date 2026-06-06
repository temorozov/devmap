import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { DEMO_GRAPH_NODES } from '../../shared/data/demo-graph';
import { SkillGraphComponent } from '../../shared/components/skill-graph/skill-graph.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, SkillGraphComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly authService = inject(AuthService);
  readonly graphNodes = DEMO_GRAPH_NODES;

  get isLoggedIn(): boolean {
    return this.authService.hasValidToken();
  }

  get authEntryRoute(): string {
    return this.isLoggedIn ? '/dashboard' : '/login';
  }
}
