import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { BehaviorSubject, tap, map } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  private authStatus = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  authStatus$ = this.authStatus.asObservable();

  private user = new BehaviorSubject<any>(this.decodeToken(localStorage.getItem('token')));
  user$ = this.user.asObservable();

  isGuest$ = this.user$.pipe(
    map(user => !!user?.isGuest)
  );

  login(credentials: { email: string; password: string }) {
    return this.http.post<{ access_token: string, user: any }>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.access_token) {
            this.setToken(response.access_token);
          }
        })
      );
  }

  register(credentials: { email: string; password: string }) {
    return this.http.post<{ access_token?: string, user?: any, message?: string }>(`${this.apiUrl}/register`, credentials)
      .pipe(
        tap(response => {
          if (response.access_token) {
            this.setToken(response.access_token);
          }
        })
      );
  }

  confirmEmail(token: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/confirm-email`, { token });
  }

  handleOAuthToken(token: string) {
    this.setToken(token);
    this.router.navigate(['/dashboard']);
  }

  guestLogin() {
    return this.http.post<{ access_token: string, user: any, treeId: string }>(`${this.apiUrl}/guest`, {})
      .pipe(
        tap(response => {
          if (response.access_token) {
            this.setToken(response.access_token);
            this.router.navigate(['/tree', response.treeId]);
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
