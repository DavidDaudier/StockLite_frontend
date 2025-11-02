import { Injectable } from '@angular/core';
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

  constructor(private http: HttpClient) {}

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
    return this.http.post<AppInfo>(this.apiUrl, dto);
  }

  update(id: string, dto: UpdateAppInfoDto): Observable<AppInfo> {
    return this.http.patch<AppInfo>(`${this.apiUrl}/${id}`, dto);
  }
}
