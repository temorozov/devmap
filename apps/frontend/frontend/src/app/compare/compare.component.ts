import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { appRuntimeConfig } from '../app-config';
import { AuthService } from '../auth.service';
import { AppSidebarComponent } from '../shared/components/app-sidebar/app-sidebar.component';

interface CompareProfile {
  handle: string;
  name: string | null;
  githubUsername: string | null;
  skillCount: number;
}

interface CompareResult {
  a: CompareProfile;
  b: CompareProfile;
  inCommon: string[];
  onlyA: string[];
  onlyB: string[];
}

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AppSidebarComponent],
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  handleA = '';
  handleB = '';
  result: CompareResult | null = null;
  loading = false;
  error = '';

  readonly isGuest$ = this.authService.isGuest$;
  readonly handle$ = this.authService.handle$;
  readonly githubUsername$ = this.authService.githubUsername$;

  onSync() {
    this.router.navigate(['/dashboard'], { queryParams: { scan: 1 } });
  }

  onLogout() {
    this.authService.logout();
  }

  ngOnInit() {
    this.authService.loadMe().subscribe(() => this.cdr.markForCheck());
    this.route.paramMap.subscribe(params => {
      const a = params.get('handleA') ?? '';
      const b = params.get('handleB') ?? '';
      if (a) this.handleA = a;
      if (b) this.handleB = b;
      if (a && b) this.load(a, b);
      this.cdr.markForCheck();
    });
  }

  compare() {
    const a = this.handleA.trim().replace(/^@/, '');
    const b = this.handleB.trim().replace(/^@/, '');
    if (!a || !b) return;
    this.router.navigate(['/compare', a, b]);
  }

  private load(a: string, b: string) {
    this.loading = true;
    this.error = '';
    this.result = null;
    this.cdr.markForCheck();

    this.http.get<CompareResult>(`${appRuntimeConfig.apiUrl}/trees/compare/${a}/${b}`).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Could not load comparison.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  avatarUrl(githubUsername: string | null): string {
    return githubUsername ? `https://avatars.githubusercontent.com/${githubUsername}` : '';
  }

  shareUrl(): string {
    return window.location.href;
  }

  copyShareUrl() {
    navigator.clipboard.writeText(this.shareUrl());
  }
}
