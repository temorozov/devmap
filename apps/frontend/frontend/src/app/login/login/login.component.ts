import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  email = '';
  password = '';
  loading = false;
  error = '';

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Invalid credentials';
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
}
