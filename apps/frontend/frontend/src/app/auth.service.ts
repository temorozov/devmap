import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = '/api/auth';

  private authStatus = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  authStatus$ = this.authStatus.asObservable();

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
    this.router.navigate(['/login']);
  }

  private setToken(token: string) {
    localStorage.setItem('token', token);
    this.authStatus.next(true);
  }
}
