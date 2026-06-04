import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { appRuntimeConfig } from '../../app-config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  error = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.authService.handleOAuthToken(token);
        return;
      }
      if (this.authService.hasValidToken()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  continueAsGuest() {
    this.loading = true;
    this.authService.guestLogin().subscribe({
      next: () => { this.loading = false; },
      error: () => {
        this.loading = false;
        this.error = 'Failed to start guest session. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  loginWithGitHub() {
    window.location.href = `${appRuntimeConfig.apiUrl}/auth/github`;
  }
}
