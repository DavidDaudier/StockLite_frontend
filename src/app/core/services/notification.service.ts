import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  userId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Signal pour le compteur de notifications non lues (mise à jour automatique du badge)
  unreadCount = signal<number>(0);

  // Signal pour déclencher les mises à jour (incrémenté à chaque chargement)
  lastUpdate = signal<number>(0);

  constructor(private http: HttpClient) {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.http.get<Notification[]>(this.apiUrl).subscribe({
      next: (notifications) => {
        this.notificationsSubject.next(notifications);
        // Mettre à jour le signal du compteur
        const unread = notifications.filter(n => !n.read).length;
        this.unreadCount.set(unread);
        // Incrémenter le signal de mise à jour pour déclencher les recalculs
        this.lastUpdate.update(v => v + 1);
      },
      error: (error) => {
        console.error('[NotificationService] Erreur lors du chargement:', error);
      }
    });
  }

  getUnreadNotifications(): Notification[] {
    return this.notificationsSubject.value.filter(n => !n.read);
  }

  getAllNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  markAsRead(notificationId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      tap(() => this.loadNotifications())
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(`${this.apiUrl}/mark-all-read`, {}).pipe(
      tap(() => this.loadNotifications())
    );
  }

  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }

  deleteNotification(notificationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${notificationId}`);
  }

  checkStockLevel(productId: string, productName: string, currentStock: number, minStockLevel: number): void {
    if (currentStock <= minStockLevel) {
      const notification: Partial<Notification> = {
        title: 'Stock faible',
        message: `Le produit "${productName}" a atteint un niveau de stock faible (${currentStock} restant${currentStock > 1 ? 's' : ''})`,
        type: 'warning',
        read: false
      };

      this.createNotification(notification).subscribe({
        next: () => {
          this.loadNotifications();
        },
        error: (error) => {
          console.error('[NotificationService] Erreur lors de la création de notification:', error);
        }
      });
    }
  }
}
