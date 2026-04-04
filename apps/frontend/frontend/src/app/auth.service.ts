import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import { appRuntimeConfig } from './app-config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${appRuntimeConfig.apiUrl}/auth`;

  private authStatus = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  authStatus$ = this.authStatus.asObservable();

  private user = new BehaviorSubject<any>(this.decodeToken(localStorage.getItem('token')));
  user$ = this.user.asObservable();

  isGuest$ = this.user$.pipe(
    map(user => !!user?.isGuest)
  );

  // Removed basic login, register, confirmEmail

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
    this.router.navigate(['/login']);
  }

  private setToken(token: string) {
    localStorage.setItem('token', token);
    this.authStatus.next(true);
    this.user.next(this.decodeToken(token));
  }

  private decodeToken(token: string | null) {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      return null;
    }
  }
}
