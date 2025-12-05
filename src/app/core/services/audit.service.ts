import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Service for Audit Logs

/**
 * Audit log entry interface
 */
export interface AuditLog {
  id: number;
  username: string;
  role: string; // seller | admin | superadmin
  action: string; // login, logout, add, update, delete, sale, export, etc.
  module: string; // Stock, Vente, Paramètres, Produits, etc.
  subject?: string; // Description of what was done (e.g., "Suppression vente #123")
  browser?: string; // Browser used (e.g., "Chrome 120", "Firefox 115")
  details?: any; // optional before/after data
  timestamp: string; // ISO date string
}

export interface AuditLogFilters {
  userId?: string;
  role?: string;
  action?: string;
  module?: string;
  date?: string;
}

/**
 * Service that provides audit logs from the backend API.
 */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/audit-logs`;

  /**
   * Returns an observable of audit logs with optional filters.
   */
  getLogs(filters?: AuditLogFilters): Observable<AuditLog[]> {
    let params = new HttpParams();
    
    if (filters?.userId) {
      params = params.set('userId', filters.userId);
    }
    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    if (filters?.action) {
      params = params.set('action', filters.action);
    }
    if (filters?.module) {
      params = params.set('module', filters.module);
    }
    if (filters?.date) {
      params = params.set('date', filters.date);
    }

    return this.http.get<AuditLog[]>(this.apiUrl, { params });
  }

  /**
   * Get a single audit log by ID
   */
  getLog(id: number): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.apiUrl}/${id}`);
  }

  /**
   * Delete an audit log (Super Admin only)
   */
  deleteLog(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
