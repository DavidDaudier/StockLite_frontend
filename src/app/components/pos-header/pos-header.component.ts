import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../services/sidebar/sidebar.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationSoundService } from '../../core/services/notification-sound.service';
import { LowStockMonitorService } from '../../core/services/low-stock-monitor.service';
import { DeletionRequestService } from '../../core/services/deletion-request.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { User } from '../../core/models/user.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeSearch01, hugeNotification02, hugeMailAtSign01, hugeCalendar03, hugeClock01, hugeMenu01, hugeSidebarLeft01, hugeSidebarRight01, hugeClock05, hugeRefresh } from '@ng-icons/huge-icons';

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
      hugeClock05,
      hugeRefresh
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
  notificationSoundService = inject(NotificationSoundService);
  lowStockMonitorService = inject(LowStockMonitorService);
  deletionRequestService = inject(DeletionRequestService);
  offlineSyncService = inject(OfflineSyncService);
  private destroy$ = new Subject<void>();

  searchTerm = signal('');
  currentUser: User | null = null;
  currentDate = signal('');
  currentTime = signal('');
  private timeInterval?: number;
  private previousLowStockCount = 0;
  private previousDeletionRequestCount = 0;
  syncInProgress = signal(false);
  unsyncedCount = signal(0);
  networkStatus = signal(true);
  autoRefreshEnabled = false;
  private autoRefreshInterval?: number;

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

    // Charger l'état auto-refresh depuis localStorage
    const autoRefreshState = localStorage.getItem('autoRefreshEnabled');
    if (autoRefreshState === 'true') {
      this.autoRefreshEnabled = true;
      // Démarrer l'auto-refresh après un court délai pour laisser le composant s'initialiser
      setTimeout(() => {
        if (this.autoRefreshEnabled) {
          this.startAutoRefresh();
        }
      }, 1000);
    }
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

    // S'abonner aux changements de demandes de suppression
    this.deletionRequestService.requests$
      .pipe(takeUntil(this.destroy$))
      .subscribe((requests) => {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) return;

        // Pour super admin: surveiller les nouvelles demandes en attente
        if (currentUser.isSuperAdmin) {
          const pendingCount = requests.filter(r => r.status === 'pending').length;

          if (pendingCount > this.previousDeletionRequestCount && pendingCount > 0) {
            console.log(`[PosHeader] 🔔 Nouvelle demande de suppression`);
            this.notificationSoundService.playDeletionRequestAlert();
          }

          this.previousDeletionRequestCount = pendingCount;
        }
        // Pour sellers: surveiller les réponses à leurs demandes
        else {
          const myRequests = requests.filter(r => r.sellerId === currentUser.id);
          const respondedCount = myRequests.filter(r => r.status !== 'pending').length;

          // Stocker le compteur précédent dans localStorage pour persister entre sessions
          const previousKey = `previousRespondedCount_${currentUser.id}`;
          const previousResponded = parseInt(localStorage.getItem(previousKey) || '0', 10);

          if (respondedCount > previousResponded) {
            console.log(`[PosHeader] 🔔 Réponse à votre demande de suppression`);
            this.notificationSoundService.playDeletionRequestAlert();
          }

          localStorage.setItem(previousKey, String(respondedCount));
        }
      });

    // Démarrer la surveillance du stock faible
    this.lowStockMonitorService.startMonitoring();

    // S'abonner aux changements de stock faible
    this.lowStockMonitorService.getLowStockItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe((lowStockItems) => {
        const currentCount = lowStockItems.length;

        // Si de nouveaux produits en stock faible sont détectés, jouer le son
        if (currentCount > this.previousLowStockCount && currentCount > 0) {
          console.log(`[PosHeader] 🔔 Alerte: ${currentCount} produit(s) en stock faible`);
          this.notificationSoundService.playLowStockAlert();

          // Créer une notification pour chaque nouveau produit
          lowStockItems.slice(this.previousLowStockCount).forEach((item) => {
            this.notificationService.checkStockLevel(
              item.id,
              item.name,
              item.currentStock,
              item.minStockLevel
            );
          });
        }

        this.previousLowStockCount = currentCount;
      });

    // S'abonner au statut de synchronisation
    this.offlineSyncService.getSyncStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((inProgress) => {
        this.syncInProgress.set(inProgress);
      });

    // S'abonner au statut réseau
    this.offlineSyncService.getOnlineStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((online) => {
        this.networkStatus.set(online);
      });

    // Charger le nombre d'éléments non synchronisés
    this.loadUnsyncedCount();

    // Mettre à jour l'heure toutes les secondes
    this.timeInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  async loadUnsyncedCount(): Promise<void> {
    try {
      const status = await this.offlineSyncService.getQueueStatus();
      this.unsyncedCount.set(status.pending);
    } catch (error) {
      console.error('[PosHeader] Erreur lors du chargement du statut sync:', error);
    }
  }

  async forceSync(): Promise<void> {
    if (!this.isOnline()) {
      alert('Impossible de synchroniser: pas de connexion réseau');
      return;
    }
    await this.offlineSyncService.forceSync();
    await this.loadUnsyncedCount();
  }

  isOnline(): boolean {
    return this.networkStatus();
  }

  syncTooltip = computed(() => {
    if (!this.networkStatus()) {
      return 'Pas de connexion réseau';
    }
    if (this.syncInProgress()) {
      return 'Synchronisation en cours...';
    }
    const count = this.unsyncedCount();
    if (count > 0) {
      return `${count} élément(s) à synchroniser`;
    }
    return 'Forcer la synchronisation';
  });

  toggleAutoRefresh(): void {
    // Sauvegarder l'état dans localStorage
    localStorage.setItem('autoRefreshEnabled', String(this.autoRefreshEnabled));

    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    // Arrêter l'ancien intervalle s'il existe
    this.stopAutoRefresh();

    // Démarrer l'auto-refresh avec un intervalle de 30 secondes au lieu de 5
    this.autoRefreshInterval = window.setInterval(() => {
      // Recharger les données importantes
      this.deletionRequestService.loadRequests();
      this.loadUnsyncedCount();
      console.log('[PosHeader] Auto-refresh: données rechargées');
    }, 30000); // 30 secondes au lieu de 5
    console.log('[PosHeader] Auto-refresh activé (30s)');
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = undefined;
      console.log('[PosHeader] Auto-refresh désactivé');
    }
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }

    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    // Arrêter la surveillance du stock faible
    this.lowStockMonitorService.stopMonitoring();

    // Compléter les subscriptions
    this.destroy$.next();
    this.destroy$.complete();
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
