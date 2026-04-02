import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// Removed forms imports
import { AuthService } from '../../auth.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  // Removed loginForm

  loading = false;
  error = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.authService.handleOAuthToken(token);
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
        this.error = 'Guest login failed';
      }
    });
  }

  loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  loginWithDiscord() {
    window.location.href = '/api/auth/discord';
  }
}
