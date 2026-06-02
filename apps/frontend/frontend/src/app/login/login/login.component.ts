import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// Removed forms imports
import { AuthService } from '../../auth.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { appRuntimeConfig } from '../../app-config';
import { I18nService } from '../../shared/services/i18n.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSwitcherComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  // Removed loginForm

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

  // Removed onSubmit

  continueAsGuest() {
    this.loading = true;
    this.authService.guestLogin().subscribe({
      next: () => {
        this.loading = false;
        // Navigation is handled inside authService.guestLogin
      },
      error: () => {
        this.loading = false;
        this.error = this.i18n.t('login.guestError');
        this.cdr.markForCheck();
      }
    });
  }

  loginWithGoogle() {
    window.location.href = `${appRuntimeConfig.apiUrl}/auth/google`;
  }

  loginWithDiscord() {
    window.location.href = `${appRuntimeConfig.apiUrl}/auth/discord`;
  }

  loginWithGitHub() {
    window.location.href = `${appRuntimeConfig.apiUrl}/auth/github`;
  }
}
