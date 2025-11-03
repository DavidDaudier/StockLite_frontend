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

  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.isSuperAdmin === true;
  }

  // Vérifier si l'utilisateur a accès à une page
  hasPageAccess(page: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Super Admin a accès à tout
    if (user.isSuperAdmin) return true;

    // Si pas de permissions définies, pas d'accès
    if (!user.permissions) return false;

    const permissions = user.permissions as any;

    // Pour les vendeurs: permissions simples (boolean)
    if (user.role === 'seller') {
      return permissions[page] === true;
    }

    // Pour les admins: permissions granulaires (object)
    if (user.role === 'admin') {
      return permissions[page] !== undefined && permissions[page] !== false;
    }

    return false;
  }

  // Vérifier si l'utilisateur peut effectuer une action sur une page (pour admins)
  hasPermission(page: string, action: 'create' | 'read' | 'update' | 'delete'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Super Admin peut tout faire
    if (user.isSuperAdmin) return true;

    // Vendeurs n'ont pas de permissions granulaires
    if (user.role === 'seller') {
      return this.hasPageAccess(page);
    }

    // Pour les admins
    if (user.role === 'admin' && user.permissions) {
      const permissions = user.permissions as any;
      const pagePerms = permissions[page];

      if (!pagePerms || typeof pagePerms === 'boolean') {
        return pagePerms === true;
      }

      // Vérifier l'action spécifique
      return pagePerms[action] === true;
    }

    return false;
  }

  // Obtenir les pages accessibles pour l'utilisateur
  getAccessiblePages(): string[] {
    const user = this.getCurrentUser();
    if (!user) return [];

    // SEULEMENT le Super Admin a accès à toutes les pages par défaut
    if (user.isSuperAdmin) {
      return [
        'dashboard',
        'products',
        'pos',
        'stocks',
        'stock-tracking',
        'history',
        'reports',
        'report-vendor',
        'inventories',
        'zoom',
        'users',
        'profile',
        'pos-printer',
        'settings'
      ];
    }

    // Pour les admins réguliers et vendeurs : vérifier les permissions
    if (!user.permissions) {
      console.log('Aucune permission trouvée pour user:', user.username, 'role:', user.role);
      // Si aucune permission définie, retourner uniquement les pages de base
      if (user.role === 'admin') {
        return []; // Admin sans permissions = pas d'accès
      } else {
        // Vendeur par défaut : 5 pages de base
        return ['dashboard', 'pos', 'history', 'reports', 'profile'];
      }
    }

    console.log('Permissions trouvées pour', user.username, ':', JSON.stringify(user.permissions, null, 2));

    const permissions = user.permissions as any;
    const pages: string[] = [];

    // Parcourir les permissions et ajouter les pages accessibles
    for (const page in permissions) {
      const permission = permissions[page];

      // Pour les admins : vérifier qu'au moins une action est autorisée (create, read, update, delete)
      if (user.role === 'admin' && typeof permission === 'object') {
        const hasAccess = permission.create || permission.read || permission.update || permission.delete;
        console.log(`Page ${page}:`, permission, '=> hasAccess:', hasAccess);
        if (hasAccess) {
          pages.push(page);
        }
      }
      // Pour les vendeurs : permission simple (boolean)
      else if (permission === true) {
        pages.push(page);
      }
    }

    console.log('Pages accessibles calculées:', pages);
    return pages;
  }

  // Vérifier si l'utilisateur peut créer sur une page
  canCreate(page: string): boolean {
    return this.hasPermission(page, 'create');
  }

  // Vérifier si l'utilisateur peut lire/voir les détails sur une page
  canRead(page: string): boolean {
    return this.hasPermission(page, 'read');
  }

  // Vérifier si l'utilisateur peut modifier sur une page
  canUpdate(page: string): boolean {
    return this.hasPermission(page, 'update');
  }

  // Vérifier si l'utilisateur peut supprimer sur une page
  canDelete(page: string): boolean {
    return this.hasPermission(page, 'delete');
  }
}
