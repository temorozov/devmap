import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, map, of } from 'rxjs';
import { Router } from '@angular/router';
import { appRuntimeConfig } from './app-config';

interface AuthTokenPayload {
  exp?: number;
  isGuest?: boolean;
  handle?: string | null;
  githubUsername?: string | null;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  isGuest: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${appRuntimeConfig.apiUrl}/auth`;
  private readonly initialToken = localStorage.getItem('token');

  private authStatus = new BehaviorSubject<boolean>(this.hasValidToken(this.initialToken));
  authStatus$ = this.authStatus.asObservable();

  private user = new BehaviorSubject<AuthTokenPayload | null>(this.decodeToken(this.initialToken));
  user$ = this.user.asObservable();

  isGuest$ = this.user$.pipe(
    map(user => !!user?.isGuest)
  );

  handle$ = this.user$.pipe(
    map(user => user?.handle ?? null)
  );

  githubUsername$ = this.user$.pipe(
    map(user => user?.githubUsername ?? null)
  );

  // Fetch fresh user data from server (handle, githubUsername may not be in old JWTs)
  loadMe() {
    if (!this.hasValidToken()) {
      return of(null as null);
    }
    return this.http.get<{ id: string; name: string | null; handle: string | null; githubUsername: string | null; email: string | null; isGuest: boolean }>(
      `${this.apiUrl}/me`
    ).pipe(
      tap(me => {
        if (me) {
          const current = this.user.getValue();
          this.user.next({ ...current, handle: me.handle, githubUsername: me.githubUsername });
        }
      }),
      map(() => null as null)
    );
  }

  hasValidToken(token = localStorage.getItem('token')): boolean {
    const decoded = this.decodeToken(token);

    if (!decoded) {
      return false;
    }

    if (typeof decoded.exp !== 'number') {
      return true;
    }

    return decoded.exp * 1000 > Date.now();
  }

  handleOAuthToken(token: string) {
    this.setToken(token);
    this.router.navigate(['/dashboard']);
  }

  guestLogin() {
    return this.http.post<{ access_token: string, user: AuthUser }>(`${this.apiUrl}/guest`, {})
      .pipe(
        tap(response => {
          if (response.access_token) {
            this.setToken(response.access_token);
            this.router.navigate(['/dashboard']);
          }
        })
      );
  }

  logout() {
    localStorage.removeItem('token');
    this.authStatus.next(false);
    this.user.next(null);
    this.router.navigate(['/']);
  }

  private setToken(token: string) {
    localStorage.setItem('token', token);
    this.authStatus.next(this.hasValidToken(token));
    this.user.next(this.decodeToken(token));
  }

  private decodeToken(token: string | null): AuthTokenPayload | null {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload)) as AuthTokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }
}
