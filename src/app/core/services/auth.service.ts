import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { WebSocketService } from './websocket.service';
import { User, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenKey = 'stocklite_token';
  private userKey = 'stocklite_user';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    private wsService: WebSocketService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    if (!this.isBrowser) return;

    const userJson = localStorage.getItem(this.userKey);
    if (userJson) {
      const user = JSON.parse(userJson);
      this.currentUserSubject.next(user);
    }
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      username,
      password
    }).pipe(
      tap(response => {
        this.setSession(response);
        this.wsService.connect(response.user.id, response.user.role);
      })
    );
  }

  register(userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role?: 'admin' | 'seller';
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, userData);
  }

  private setSession(authResult: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(this.tokenKey, authResult.access_token);
      localStorage.setItem(this.userKey, JSON.stringify(authResult.user));
    }
    this.currentUserSubject.next(authResult.user);
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.currentUserSubject.next(null);
    this.wsService.disconnect();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isSeller(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'seller';
  }
}
