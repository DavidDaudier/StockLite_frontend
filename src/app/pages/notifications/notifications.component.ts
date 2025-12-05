import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { NotificationService, Notification } from '../../core/services/notification.service';
import { NotificationSoundService } from '../../core/services/notification-sound.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeNotification02,
  hugeCheckmarkCircle02,
  hugeInformationCircle,
  hugeAlert02,
  hugeEye,
  hugeViewOff,
  hugeCheckmarkCircle04,
  hugeDelete02,
  hugeVolumeOff,
  hugeVolumeHigh
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgIcon,
    SidebarComponent,
    PosHeaderComponent
  ],
  viewProviders: [
    provideIcons({
      hugeNotification02,
      hugeCheckmarkCircle02,
      hugeInformationCircle,
      hugeAlert02,
      hugeEye,
      hugeViewOff,
      hugeCheckmarkCircle04,
      hugeDelete02,
      hugeVolumeOff,
      hugeVolumeHigh
    })
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private notificationSoundService = inject(NotificationSoundService);
  private destroy$ = new Subject<void>();

  notifications = signal<Notification[]>([]);
  filteredNotifications = signal<Notification[]>([]);
  loading = signal(false);
  selectedFilter: 'all' | 'read' | 'unread' = 'all';
  showStats = signal<boolean>(true);
  isSoundMuted = signal<boolean>(false);

  get unreadCount(): number {
    return this.notifications().filter(n => !n.read).length;
  }

  constructor() {
    // Charger l'état du son depuis localStorage
    const mutedState = localStorage.getItem('notificationSoundMuted');
    this.isSoundMuted.set(mutedState === 'true');
  }

  ngOnInit(): void {
    this.loadNotifications();

    // S'abonner aux changements
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications) => {
        this.notifications.set(notifications);
        this.applyFilter();
      });
  }

  filterNotifications(filter: 'all' | 'read' | 'unread'): void {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  private applyFilter(): void {
    const allNotifications = this.notifications();

    switch (this.selectedFilter) {
      case 'read':
        this.filteredNotifications.set(allNotifications.filter(n => n.read));
        break;
      case 'unread':
        this.filteredNotifications.set(allNotifications.filter(n => !n.read));
        break;
      default:
        this.filteredNotifications.set(allNotifications);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationService.loadNotifications();
    this.loading.set(false);
  }

  markAsRead(notification: Notification): void {
    if (notification.read) return;

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notificationService.loadNotifications();
      },
      error: (error) => {
        console.error('Erreur lors du marquage comme lu:', error);
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notificationService.loadNotifications();
        alert('Toutes les notifications ont été marquées comme lues');
      },
      error: (error) => {
        console.error('Erreur:', error);
        alert('Erreur lors du marquage des notifications');
      }
    });
  }

  deleteNotification(notification: Notification): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
      return;
    }

    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notificationService.loadNotifications();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la notification');
      }
    });
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'info': 'hugeInformationCircle',
      'warning': 'hugeAlert02',
      'error': 'hugeAlert02',
      'success': 'hugeCheckmarkCircle02'
    };
    return icons[type] || 'hugeNotification02';
  }

  getNotificationClass(type: string): string {
    const classes: Record<string, string> = {
      'info': 'bg-blue-50 border-blue-200',
      'warning': 'bg-yellow-50 border-yellow-200',
      'error': 'bg-red-50 border-red-200',
      'success': 'bg-green-50 border-green-200'
    };
    return classes[type] || 'bg-gray-50 border-gray-200';
  }

  getIconClass(type: string): string {
    const classes: Record<string, string> = {
      'info': 'text-blue-600',
      'warning': 'text-yellow-600',
      'error': 'text-red-600',
      'success': 'text-green-600'
    };
    return classes[type] || 'text-gray-600';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toggleMuteSound(): void {
    const newMutedState = !this.isSoundMuted();
    this.isSoundMuted.set(newMutedState);
    localStorage.setItem('notificationSoundMuted', String(newMutedState));
    this.notificationSoundService.setMuted(newMutedState);

    if (!newMutedState) {
      // Jouer un son de test pour confirmer
      this.notificationSoundService.playNotificationSound();
    }
  }

  deleteAllNotifications(): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications ?')) {
      return;
    }

    const deleteObservables = this.notifications().map(notification =>
      this.notificationService.deleteNotification(notification.id)
    );

    if (deleteObservables.length === 0) {
      return;
    }

    forkJoin(deleteObservables).subscribe({
      next: () => {
        this.notificationService.loadNotifications();
        alert('Toutes les notifications ont été supprimées');
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression des notifications');
      }
    });
  }
}
