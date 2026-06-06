import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  TreesService,
  ExploreProfile,
  GuestScanResult,
  CompareResult,
} from '../trees.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreComponent implements OnInit {
  private readonly treesService = inject(TreesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  members: ExploreProfile[] = [];
  membersLoading = true;

  searchHandle = '';
  scanLoading = false;
  scanResult: GuestScanResult | null = null;
  scanError = '';

  compareLoading = false;
  compareResult: CompareResult | null = null;
  compareError = '';

  readonly isGuest$ = this.authService.isGuest$;
  readonly handle$ = this.authService.handle$;
  readonly githubUsername$ = this.authService.githubUsername$;

  ngOnInit() {
    this.authService.loadMe().subscribe(() => this.cdr.markForCheck());
    this.treesService.getExploreProfiles().subscribe({
      next: (members) => {
        this.members = members;
        this.membersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.membersLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  search() {
    const h = this.searchHandle.trim().replace(/^@/, '');
    if (!h || this.scanLoading) return;
    this.scanLoading = true;
    this.scanResult = null;
    this.compareResult = null;
    this.scanError = '';
    this.compareError = '';
    this.cdr.markForCheck();

    this.treesService.scanUser(h).subscribe({
      next: (result) => {
        this.scanResult = result;
        this.scanLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.scanError = err?.error?.message ?? `Could not find @${h} on GitHub.`;
        this.scanLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  searchMember(handle: string) {
    this.searchHandle = handle;
    this.search();
  }

  compareWithMe() {
    const myHandle = this.currentHandle();
    if (!myHandle || !this.scanResult) return;
    this.compareLoading = true;
    this.compareError = '';
    this.cdr.markForCheck();

    this.treesService.compareUsers(myHandle, this.scanResult.handle).subscribe({
      next: (result) => {
        this.compareResult = result;
        this.compareLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.compareError = err?.error?.message ?? 'Could not compare stacks.';
        this.compareLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  clearScan() {
    this.scanResult = null;
    this.compareResult = null;
    this.scanError = '';
    this.compareError = '';
    this.searchHandle = '';
    this.cdr.markForCheck();
  }

  logout() {
    this.authService.logout();
  }

  private currentHandle(): string {
    const u = (
      this.authService as unknown as {
        user: { getValue(): { handle?: string | null; githubUsername?: string | null } | null };
      }
    ).user.getValue();
    return u?.handle ?? u?.githubUsername ?? '';
  }
}
