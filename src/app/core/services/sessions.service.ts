import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Session {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  userRole: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastActivity: string;
  startTime?: string; // When the session started
  endTime?: string; // When the session ended
  status?: string; // Session status (active, expired, etc.)
  location?: string; // User location
  os?: string; // Operating system
  browser?: string; // Browser type
  createdAt: string;
  expiresAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionsService {
  private apiUrl = `${environment.apiUrl}/sessions`;

  constructor(private http: HttpClient) {}

  // Get all sessions
  getAllSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(this.apiUrl);
  }

  // Get active sessions
  getActiveSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/active`);
  }

  // Get sessions by user ID
  getUserSessions(userId: string): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/user/${userId}`);
  }

  // Get sessions by date range
  getByDateRange(startDate: string, endDate: string): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/date-range`, {
      params: { startDate, endDate }
    });
  }

  // End a specific session
  endSession(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${sessionId}/end`, {});
  }

  // End all sessions for a user
  endAllUserSessions(userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/user/${userId}/end`, {});
  }

  // Check if a session is active
  checkSession(sessionId: string): Observable<{ isActive: boolean; session: Session | null }> {
    return this.http.get<{ isActive: boolean; session: Session | null }>(`${this.apiUrl}/check/${sessionId}`);
  }

  // Legacy method names for backward compatibility
  revokeSession(sessionId: string): Observable<void> {
    return this.endSession(sessionId);
  }

  revokeAllUserSessions(userId: string): Observable<void> {
    return this.endAllUserSessions(userId);
  }
}
