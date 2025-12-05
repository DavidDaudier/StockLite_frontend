import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { DeletionRequestService } from '../../core/services/deletion-request.service';
import { DeletionRequest, DeletionRequestStatus } from '../../core/models/deletion-request.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeMessageDelay02,
  hugeCheckmarkCircle02,
  hugeCancel02,
  hugeArrowDown02,
  hugeArrowRightDouble,
  hugeCancel01
} from '@ng-icons/huge-icons';

/**
 * 📋 COMPOSANT: Gestion des Demandes de Suppression
 *
 * Ce composant gère l'interface de gestion des demandes de suppression de ventes
 * soumises par les vendeurs. Il permet aux administrateurs de:
 *
 * ✅ Approuver: Supprimer la vente de l'historique et archiver la demande
 * ❌ Rejeter: Conserver la vente et notifier le vendeur avec justification
 *
 * Architecture:
 * - Filtres avec badges pour visualiser les statistiques
 * - Tableau déroulable style Reports pour voir les détails
 * - Modale complète avec deux actions: Approuver et Rejeter
 */

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIcon,
    SidebarComponent,
    PosHeaderComponent
  ],
  viewProviders: [
    provideIcons({
      hugeMessageDelay02,
      hugeCheckmarkCircle02,
      hugeCancel02,
      hugeArrowDown02,
      hugeArrowRightDouble,
      hugeCancel01
    })
  ],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, OnDestroy {
  // Services injectés
  private deletionRequestService = inject(DeletionRequestService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // État des données
  requests = signal<DeletionRequest[]>([]);
  filteredRequests = signal<DeletionRequest[]>([]);
  selectedRequest = signal<DeletionRequest | null>(null);
  selectedStatus = signal<string>('all'); // Changed default to 'all'
  loading = signal(false);

  // Filtres
  startDate = '';
  endDate = '';
  selectedSellerId = 'all';
  sellers = signal<any[]>([]);

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  // État de l'interface
  expandedRequestId = signal<string | null>(null); // Pour les lignes déroulables

  // État de la modale
  showModal = signal(false);
  modalAction = signal<'approve' | 'reject' | null>(null);
  responseDescription = ''; // Pour la textarea dans la modale
  submitting = signal(false);

  readonly DeletionRequestStatus = DeletionRequestStatus;

  // 📊 COMPUTED PROPERTIES - Statistiques pour les badges

  /** Nombre total de demandes */
  totalCount = computed(() => this.requests().length);

  /** Nombre de demandes en attente */
  pendingCount = computed(() =>
    this.requests().filter(r => r.status === DeletionRequestStatus.PENDING).length
  );

  /** Nombre de demandes approuvées */
  approvedCount = computed(() =>
    this.requests().filter(r => r.status === DeletionRequestStatus.APPROVED).length
  );

  /** Nombre de demandes rejetées */
  rejectedCount = computed(() =>
    this.requests().filter(r => r.status === DeletionRequestStatus.REJECTED).length
  );

  /** Pagination info */
  paginationInfo = computed(() => {
    const total = this.filteredRequests().length;
    const totalPages = Math.ceil(total / this.itemsPerPage) || 1;
    const currentPage = Math.min(this.currentPage(), totalPages);
    const startIndex = total === 0 ? 0 : (currentPage - 1) * this.itemsPerPage + 1;
    const endIndex = Math.min(currentPage * this.itemsPerPage, total);

    return {
      total,
      totalPages,
      currentPage,
      startIndex,
      endIndex
    };
  });

  /** Demandes paginées */
  paginatedRequests = computed(() => {
    const start = (this.paginationInfo().currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredRequests().slice(start, end);
  });

  ngOnInit(): void {
    this.loadSellers();
    this.loadRequests();

    // S'abonner aux changements en temps réel
    this.deletionRequestService.requests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadRequests();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔄 GESTION DES DONNÉES

  /**
   * Charge toutes les demandes depuis le service
   */
  loadRequests(): void {
    this.loading.set(true);
    this.deletionRequestService.loadRequests();
    const allRequests = this.deletionRequestService.getAllRequests();
    this.requests.set(allRequests);
    this.loadSellers(); // Mettre à jour la liste des vendeurs
    this.filterRequests();
    this.loading.set(false);
  }

  /**
   * Filtre les demandes selon le statut, dates et vendeur sélectionnés
   */
  filterRequests(): void {
    const status = this.selectedStatus();
    let filtered = this.requests();

    // Filtre par statut
    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    // Filtre par vendeur
    if (this.selectedSellerId !== 'all') {
      filtered = filtered.filter(r => r.sellerId === this.selectedSellerId);
    }

    // Filtre par plage de dates
    if (this.startDate) {
      const startDateTime = new Date(this.startDate).getTime();
      filtered = filtered.filter(r => {
        const requestDate = new Date(r.createdAt).getTime();
        return requestDate >= startDateTime;
      });
    }

    if (this.endDate) {
      const endDateTime = new Date(this.endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        const requestDate = new Date(r.createdAt).getTime();
        return requestDate <= endDateTime;
      });
    }

    // Trier par date (plus récent en premier)
    filtered = filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.filteredRequests.set(filtered);
  }

  /**
   * Change le filtre de statut (appelé par les boutons avec badges)
   * @param status - 'all' | 'pending' | 'approved' | 'rejected'
   */
  filterByStatus(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1); // Reset pagination
    this.filterRequests();
  }

  // 🎯 GESTION DE L'INTERFACE

  /**
   * Déplie/replie une ligne du tableau pour afficher les détails
   * @param requestId - ID de la demande à dérouler
   */
  toggleRequestDetails(requestId: string): void {
    if (this.expandedRequestId() === requestId) {
      this.expandedRequestId.set(null); // Fermer si déjà ouvert
    } else {
      this.expandedRequestId.set(requestId); // Ouvrir
    }
  }

  /**
   * Ouvre la modale de réponse avec les informations de la demande
   * @param request - La demande sélectionnée
   */
  openResponseModal(request: DeletionRequest): void {
    this.selectedRequest.set(request);
    this.responseDescription = ''; // Réinitialiser la description
    this.modalAction.set(null);
    this.showModal.set(true);
  }

  /**
   * Ferme la modale et réinitialise l'état
   */
  closeModal(): void {
    this.showModal.set(false);
    this.modalAction.set(null);
    this.responseDescription = '';
    this.selectedRequest.set(null);
  }

  // 📊 CHARGEMENT DES VENDEURS

  loadSellers(): void {
    // TODO: Charger la liste des vendeurs depuis le backend
    // Pour l'instant, on extrait les vendeurs uniques des demandes
    const uniqueSellers = new Map<string, any>();
    this.requests().forEach(request => {
      if (request.sellerId && !uniqueSellers.has(request.sellerId)) {
        uniqueSellers.set(request.sellerId, {
          id: request.sellerId,
          fullName: request.sellerName,
          username: request.sellerName
        });
      }
    });
    this.sellers.set(Array.from(uniqueSellers.values()));
  }

  // 🔍 MÉTHODES DE FILTRAGE

  onDateRangeChange(): void {
    this.filterRequests();
    this.currentPage.set(1);
  }

  onSellerFilterChange(): void {
    this.filterRequests();
    this.currentPage.set(1);
  }

  onItemsPerPageChange(): void {
    this.currentPage.set(1);
  }

  // 📄 MÉTHODES DE PAGINATION

  getPageNumbers(): number[] {
    const totalPages = this.paginationInfo().totalPages;
    const currentPage = this.paginationInfo().currentPage;
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      }
    }

    return pages;
  }

  firstPage(): void {
    this.currentPage.set(1);
  }

  previousPage(): void {
    if (this.paginationInfo().currentPage > 1) {
      this.currentPage.set(this.paginationInfo().currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.paginationInfo().currentPage < this.paginationInfo().totalPages) {
      this.currentPage.set(this.paginationInfo().currentPage + 1);
    }
  }

  lastPage(): void {
    this.currentPage.set(this.paginationInfo().totalPages);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  // 🎬 ACTIONS SUR LES DEMANDES

  /**
   * ✅ APPROUVER UNE DEMANDE
   *
   * Logique:
   * 1. Supprime la vente de l'historique (seller, admin, super admin)
   * 2. Archive la demande dans la table demandes du super admin
   * 3. Met à jour le statut à 'approved'
   * 4. Notifie le vendeur de l'approbation
   */
  handleApprove(): void {
    const request = this.selectedRequest();
    if (!request || request.status !== DeletionRequestStatus.PENDING) {
      alert('Cette demande ne peut pas être approuvée');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir approuver cette demande?\n\nCette action supprimera la vente #${request.saleTicketNo} de l'historique.`)) {
      return;
    }

    this.submitting.set(true);
    this.modalAction.set('approve');

    this.deletionRequestService.approveRequest(request.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        alert('✅ Demande approuvée avec succès.\n\nLa vente a été supprimée de l\'historique.');
        this.loadRequests(); // Recharger la liste
      },
      error: (error) => {
        this.submitting.set(false);
        console.error('Erreur lors de l\'approbation:', error);
        alert('❌ Erreur lors de l\'approbation: ' + (error.error?.message || error.message));
      }
    });
  }

  /**
   * ❌ REJETER UNE DEMANDE
   *
   * Logique:
   * 1. Conserve la vente dans l'historique
   * 2. Met à jour le statut à 'rejected'
   * 3. Enregistre la raison du rejet (optionnelle)
   * 4. Notifie le vendeur du rejet avec justification
   */
  handleReject(): void {
    const request = this.selectedRequest();
    if (!request || request.status !== DeletionRequestStatus.PENDING) {
      alert('Cette demande ne peut pas être rejetée');
      return;
    }

    // La description est optionnelle pour le rejet
    const reason = this.responseDescription.trim() || 'Aucune raison spécifiée';

    if (!confirm(`Êtes-vous sûr de vouloir rejeter cette demande?\n\nLa vente #${request.saleTicketNo} restera dans l'historique.`)) {
      return;
    }

    this.submitting.set(true);
    this.modalAction.set('reject');

    this.deletionRequestService.rejectRequest(request.id, reason).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        alert('❌ Demande rejetée.\n\nLe vendeur a été notifié.');
        this.loadRequests(); // Recharger la liste
      },
      error: (error) => {
        this.submitting.set(false);
        console.error('Erreur lors du rejet:', error);
        alert('❌ Erreur lors du rejet: ' + (error.error?.message || error.message));
      }
    });
  }

  // 🎨 MÉTHODES D'AFFICHAGE

  /**
   * Retourne le label fr du statut
   */
  getStatusLabel(status: DeletionRequestStatus | string): string {
    const labels: Record<string, string> = {
      [DeletionRequestStatus.PENDING]: 'En attente',
      [DeletionRequestStatus.APPROVED]: 'Approuvée',
      [DeletionRequestStatus.REJECTED]: 'Rejetée',
      [DeletionRequestStatus.CANCELLED]: 'Annulée'
    };
    return labels[status] || status;
  }

  /**
   * Retourne les classes Tailwind pour le badge de statut
   */
  getStatusClass(status: DeletionRequestStatus | string): string {
    const classes: Record<string, string> = {
      [DeletionRequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [DeletionRequestStatus.APPROVED]: 'bg-green-100 text-green-800',
      [DeletionRequestStatus.REJECTED]: 'bg-red-100 text-red-800',
      [DeletionRequestStatus.CANCELLED]: 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Formate une date ISO en format fr-FR
   */
  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Retourne le label français du motif de suppression
   */
  getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      'WRONG_PRODUCT': 'Mauvais produit',
      'WRONG_QUANTITY': 'Mauvaise quantité',
      'WRONG_PRICE': 'Mauvais prix',
      'WRONG_CUSTOMER': 'Mauvais client',
      'DUPLICATE': 'Vente en double',
      'PAYMENT_ISSUE': 'Problème de paiement',
      'OTHER': 'Autre'
    };
    return labels[reason] || reason;
  }
}
