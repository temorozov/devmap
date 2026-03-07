import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './confirm-email.component.html',
  styleUrl: './confirm-email.component.scss',
})
export class ConfirmEmailComponent implements OnInit {
  authService = inject(AuthService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  loading = true;
  error = '';
  success = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.confirmEmail(token);
      } else {
        this.error = 'Invalid or missing confirmation token.';
        this.loading = false;
      }
    });
  }

  confirmEmail(token: string) {
    this.authService.confirmEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to confirm email. The token might have expired.';
      }
    });
  }
}
