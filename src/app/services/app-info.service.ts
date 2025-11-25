import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AppInfo, CreateAppInfoDto, UpdateAppInfoDto } from '../models/app-info.model';
import { DEFAULT_APP_INFO } from '../constants/app-defaults';

@Injectable({
  providedIn: 'root'
})
export class AppInfoService {
  private apiUrl = `${environment.apiUrl}/app-info`;
  
  // Signal réactif pour les infos de l'app
  appInfo = signal<AppInfo>(DEFAULT_APP_INFO);

  constructor(private http: HttpClient) {
    // Charger les infos au démarrage
    this.loadAppInfo();
  }

  /**
   * Charge les informations de l'application
   */
  private loadAppInfo(): void {
    this.getAppInfo().subscribe({
      next: (data) => {
        this.appInfo.set(data);
      },
      error: (err) => {
        console.warn('Could not load app info:', err);
      }
    });
  }

  /**
   * Récupère les informations de l'application
   * Retourne les valeurs par défaut en cas d'erreur
   */
  getAppInfo(): Observable<AppInfo> {
    return this.http.get<AppInfo>(this.apiUrl).pipe(
      tap(appInfo => console.log('App info loaded from API:', appInfo)),
      catchError(error => {
        console.warn('Failed to load app info from API, using defaults:', error);
        return of(DEFAULT_APP_INFO);
      })
    );
  }

  create(dto: CreateAppInfoDto): Observable<AppInfo> {
    return this.http.post<AppInfo>(this.apiUrl, dto).pipe(
      tap(data => {
        // Mettre à jour le signal après création
        this.appInfo.set(data);
      })
    );
  }

  update(id: string, dto: UpdateAppInfoDto): Observable<AppInfo> {
    return this.http.patch<AppInfo>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(data => {
        // Mettre à jour le signal après mise à jour
        this.appInfo.set(data);
      })
    );
  }
}
