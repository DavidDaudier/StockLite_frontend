import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../services/sidebar/sidebar.service';
import { NotificationService } from '../../core/services/notification.service';
import { DeletionRequestService } from '../../core/services/deletion-request.service';
import { User } from '../../core/models/user.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeSearch01, hugeNotification02, hugeMailAtSign01, hugeCalendar03, hugeClock01, hugeMenu01, hugeSidebarLeft01, hugeSidebarRight01, hugeClock05 } from '@ng-icons/huge-icons';

@Component({
  selector: 'app-pos-header',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, RouterModule],
  viewProviders: [
    provideIcons({
      hugeSearch01,
      hugeNotification02,
      hugeMailAtSign01,
      hugeCalendar03,
      hugeClock01,
      hugeMenu01,
      hugeSidebarLeft01,
      hugeSidebarRight01,
      hugeClock05
    })
  ],
  templateUrl: './pos-header.component.html',
  styleUrl: './pos-header.component.css'
})
export class PosHeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  sidebarService = inject(SidebarService);
  notificationService = inject(NotificationService);
  deletionRequestService = inject(DeletionRequestService);

  searchTerm = signal('');
  currentUser: User | null = null;
  currentDate = signal('');
  currentTime = signal('');
  private timeInterval?: number;

  // Computed pour le badge de notifications
  notificationBadge = computed(() => {
    const notifications = this.notificationService.getUnreadNotifications();
    return {
      count: notifications.length,
      hasUnread: notifications.length > 0
    };
  });

  // Tooltip pour les notifications
  notificationTooltip = computed(() => {
    const unreadNotifications = this.notificationService.getUnreadNotifications();
    if (unreadNotifications.length === 0) {
      return 'Aucune notification';
    }
    const latestNotification = unreadNotifications[0];
    return latestNotification.title + ': ' + latestNotification.message;
  });

  // Computed pour le badge de messages (demandes en attente)
  messagesBadge = computed(() => {
    const pendingRequests = this.deletionRequestService.getPendingRequests();
    return {
      count: pendingRequests.length,
      hasPending: pendingRequests.length > 0
    };
  });

  // Tooltip pour les messages
  messagesTooltip = computed(() => {
    const pendingRequests = this.deletionRequestService.getPendingRequests();
    if (pendingRequests.length === 0) {
      return 'Aucune demande en attente';
    }
    return `${pendingRequests.length} demande(s) de suppression en attente`;
  });

  // Computed pour le badge de mes messages (pour les sellers)
  myMessagesBadge = computed(() => {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return { count: 0, hasPending: false };
    }
    const allRequests = this.deletionRequestService.getAllRequests();
    const myRequests = allRequests.filter(req => req.sellerId === currentUser.id);
    const myPendingRequests = myRequests.filter(req => req.status === 'pending');
    return {
      count: myPendingRequests.length,
      hasPending: myPendingRequests.length > 0
    };
  });

  // Tooltip pour mes messages (pour les sellers)
  myMessagesTooltip = computed(() => {
    const badge = this.myMessagesBadge();
    if (badge.count === 0) {
      return 'Voir mes demandes de suppression';
    }
    return `${badge.count} demande(s) en attente`;
  });

  constructor() {
    this.currentUser = this.authService.getCurrentUser();
    this.updateDateTime();
  }

  // Méthode publique pour vérifier si l'utilisateur est super admin
  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  ngOnInit(): void {
    // Charger les demandes de suppression depuis l'API pour le badge
    // (Pour super admin et pour sellers)
    this.deletionRequestService.loadRequests();

    // Mettre à jour l'heure toutes les secondes
    this.timeInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateDateTime(): void {
    const now = new Date();

    // Format date: "mer. 29 mai 2024"
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    this.currentDate.set(now.toLocaleDateString('fr-FR', dateOptions));

    // Format time: "07:59 AM"
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    this.currentTime.set(now.toLocaleTimeString('en-US', timeOptions));
  }

  onSearch(): void {
    const term = this.searchTerm();
    if (term.trim()) {
      console.log('Recherche:', term);
      // Vous pouvez émettre un événement ou utiliser un service de recherche ici
    }
  }

  showNotifications(): void {
    // Navigation vers la page de notifications (super admin uniquement)
    this.router.navigate(['/admin/notifications']);
  }

  showMessages(): void {
    // Navigation vers la page de messages (super admin uniquement)
    console.log('[PosHeader] showMessages() appelé - navigation vers /admin/messages');
    this.router.navigate(['/admin/messages']).then(
      success => console.log('[PosHeader] Navigation réussie:', success),
      error => console.error('[PosHeader] Erreur navigation:', error)
    );
  }

  showMyMessages(): void {
    // Navigation vers la page d'historique des messages (seller uniquement)
    console.log('[PosHeader] showMyMessages() appelé - navigation vers /seller/my-messages');
    this.router.navigate(['/seller/my-messages']).then(
      success => console.log('[PosHeader] Navigation vers mes messages réussie:', success),
      error => console.error('[PosHeader] Erreur navigation vers mes messages:', error)
    );
  }
}
