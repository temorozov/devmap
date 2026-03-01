import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

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

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Invalid credentials';
      }
    });
  }

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
}
