import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import { appRuntimeConfig } from './app-config';

interface AuthTokenPayload {
  exp?: number;
  isGuest?: boolean;
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

  // Removed basic login, register, confirmEmail

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
    return this.http.post<{ access_token: string, user: any }>(`${this.apiUrl}/guest`, {})
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
