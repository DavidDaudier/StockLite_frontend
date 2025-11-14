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
  private sessionKey = 'stocklite_session';
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
    if (!this.isBrowser) {
      console.log('⚠️ [AuthService] Not in browser, skipping localStorage load');
      return;
    }

    console.log('🔄 [AuthService] Loading user from localStorage...');

    const token = localStorage.getItem(this.tokenKey);
    const userJson = localStorage.getItem(this.userKey);
    const sessionId = localStorage.getItem(this.sessionKey);

    console.log('📦 [AuthService] localStorage contents:');
    console.log('  - token:', token ? 'présent' : 'absent');
    console.log('  - user:', userJson ? 'présent' : 'absent');
    console.log('  - sessionId:', sessionId ? 'présent' : 'absent');

    if (userJson && token) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
        console.log('✅ [AuthService] User loaded:', user.username);
        console.log('  - Role:', user.role);
        console.log('  - isSuperAdmin:', user.isSuperAdmin);
      } catch (error) {
        console.error('❌ [AuthService] Error parsing user from localStorage:', error);
        this.clearStorage();
      }
    } else {
      console.log('⚠️ [AuthService] No valid session found in localStorage');
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    console.log('🗑️ [AuthService] clearStorage appelé');
    console.trace('📍 Stack trace de clearStorage:');
    if (!this.isBrowser) return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.sessionKey);
    this.currentUserSubject.next(null);
    console.log('✅ [AuthService] localStorage vidé');
  }

  login(username: string, password: string, locationData?: any): Observable<AuthResponse> {
    console.log('🔐 [AuthService] Tentative de connexion pour:', username);
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      username,
      password,
      ...locationData
    }).pipe(
      tap(response => {
        console.log('✅ [AuthService] Réponse du serveur reçue:', {
          user: response.user.username,
          role: response.user.role,
          hasToken: !!response.access_token,
          hasSessionId: !!response.sessionId
        });
        this.setSession(response);
        this.wsService.connect(response.user.id, response.user.role);
        console.log('🔌 [AuthService] WebSocket connecté');
      })
    );
  }

  async loginWithGeolocation(username: string, password: string): Promise<Observable<AuthResponse>> {
    console.log('🔍 Début de la récupération de la géolocalisation...');
    // Get geolocation data with timeout (10 seconds)
    const locationData = await this.getGeolocationWithTimeout(10000);
    console.log('📍 Données de géolocalisation récupérées:', locationData);
    return this.login(username, password, locationData);
  }

  private async getGeolocationWithTimeout(timeout: number): Promise<any> {
    try {
      const result = await Promise.race([
        this.getGeolocation(),
        new Promise((resolve) => setTimeout(() => resolve({}), timeout))
      ]);
      return result;
    } catch (error) {
      console.warn('Geolocation timeout or error:', error);
      return {};
    }
  }

  private async getGeolocation(): Promise<any> {
    console.log('🌍 Tentative de récupération de la géolocalisation...');

    if (!this.isBrowser || !navigator.geolocation) {
      console.warn('⚠️ Géolocalisation non disponible (navigateur ou API)');
      return {};
    }

    try {
      console.log('📡 Demande de position au navigateur...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { timeout: 8000, enableHighAccuracy: false }
        );
      });

      const { latitude, longitude } = position.coords;
      console.log(`✅ Position obtenue: ${latitude}, ${longitude}`);

      // Préparer les données de base (toujours retournées)
      const baseData = {
        latitude,
        longitude,
        city: '',
        country: '',
        location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      };

      // Try to get location name using reverse geocoding (OpenStreetMap Nominatim)
      try {
        console.log('🗺️ Récupération du nom de la ville via OpenStreetMap...');
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await response.json();

        const city = data.address?.city || data.address?.town || data.address?.village || '';
        const country = data.address?.country || '';
        const location = city && country ? `${city}, ${country}` : country || baseData.location;

        console.log(`✅ Localisation trouvée: ${location}`);
        return {
          latitude,
          longitude,
          city,
          country,
          location
        };
      } catch (error) {
        console.warn('⚠️ Reverse geocoding échoué, utilisation des coordonnées:', error);
        return baseData;
      }
    } catch (error: any) {
      console.error('❌ Erreur géolocalisation:', error.message, error);
      return {};
    }
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
    console.log('💾 [AuthService] Début de setSession...');
    console.log('  - isBrowser:', this.isBrowser);
    console.log('  - access_token présent:', !!authResult.access_token);
    console.log('  - user présent:', !!authResult.user);
    console.log('  - sessionId présent:', !!authResult.sessionId);

    if (this.isBrowser) {
      try {
        console.log('💾 [AuthService] Sauvegarde dans localStorage...');
        localStorage.setItem(this.tokenKey, authResult.access_token);
        console.log('  ✅ Token sauvegardé');

        localStorage.setItem(this.userKey, JSON.stringify(authResult.user));
        console.log('  ✅ User sauvegardé:', authResult.user.username);

        if (authResult.sessionId) {
          localStorage.setItem(this.sessionKey, authResult.sessionId);
          console.log('  ✅ SessionId sauvegardé:', authResult.sessionId);
        }

        // Vérification immédiate
        const savedToken = localStorage.getItem(this.tokenKey);
        const savedUser = localStorage.getItem(this.userKey);
        console.log('🔍 [AuthService] Vérification immédiate après sauvegarde:');
        console.log('  - Token dans localStorage:', savedToken ? 'présent' : 'ABSENT!');
        console.log('  - User dans localStorage:', savedUser ? 'présent' : 'ABSENT!');
      } catch (error) {
        console.error('❌ [AuthService] Erreur lors de la sauvegarde dans localStorage:', error);
      }
    } else {
      console.warn('⚠️ [AuthService] Pas dans le navigateur, localStorage non disponible');
    }

    this.currentUserSubject.next(authResult.user);
    console.log('✅ [AuthService] currentUserSubject mis à jour');
  }

  logout(): void {
    console.log('👋 [AuthService] Logout appelé');
    console.trace('📍 Stack trace de logout:');
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.sessionKey);
      console.log('✅ [AuthService] localStorage vidé lors du logout');
    }
    this.currentUserSubject.next(null);
    this.wsService.disconnect();
    console.log('🔌 [AuthService] WebSocket déconnecté');
    this.router.navigate(['/login']);
    console.log('🔄 [AuthService] Redirection vers /login');
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  getSessionId(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.sessionKey);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateCurrentUser(user: User): void {
    if (this.isBrowser) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
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

    // IMPORTANT: L'historique dépend du POS
    // Si l'utilisateur n'a pas accès au POS, retirer l'historique
    if (pages.includes('history') && !pages.includes('pos')) {
      const index = pages.indexOf('history');
      pages.splice(index, 1);
      console.log('⚠️ Historique retiré car pas d\'accès au POS');
    }

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
