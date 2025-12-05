import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { DeletionRequestService } from '../../../core/services/deletion-request.service';
import { AuthService } from '../../../core/services/auth.service';
import { DeletionRequest, DeletionRequestStatus } from '../../../core/models/deletion-request.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeMessageDelay02,
  hugeSent,
  hugeCancel01,
  hugeCheckmarkCircle02,
  hugeCancel02,
  hugeEye,
  hugeViewOff,
  hugeArrowDown02,
  hugeArrowRightDouble
} from '@ng-icons/huge-icons';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-seller-message-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NgIcon,
    SidebarComponent,
    PosHeaderComponent
  ],
  viewProviders: [
    provideIcons({
      hugeMessageDelay02,
      hugeSent,
      hugeCancel01,
      hugeCheckmarkCircle02,
      hugeCancel02,
      hugeEye,
      hugeViewOff,
      hugeArrowDown02,
      hugeArrowRightDouble
    })
  ],
  templateUrl: './seller-message-history.component.html',
  styleUrl: './seller-message-history.component.css'
})
export class SellerMessageHistoryComponent implements OnInit, OnDestroy {
  private deletionRequestService = inject(DeletionRequestService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  requests = signal<DeletionRequest[]>([]);
  filteredRequests = signal<DeletionRequest[]>([]);
  selectedStatus = signal<string>('all');
  loading = signal(false);
  showStats = signal<boolean>(false);
  expandedRequestId = signal<string | null>(null);

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 10;
  startDate = '';
  endDate = '';

  readonly DeletionRequestStatus = DeletionRequestStatus;

  // Computed pour le nombre total
  totalCount = computed(() => this.requests().length);

  // Computed pour les statistiques
  pendingCount = computed(() =>
    this.requests().filter(r => r.status === DeletionRequestStatus.PENDING).length
  );

  approvedCount = computed(() =>
    this.requests().filter(r => r.status === DeletionRequestStatus.APPROVED).length
  );

  rejectedCount = computed(() =>
    this.requests().filter(r => r.status === DeletionRequestStatus.REJECTED).length
  );

  ngOnInit(): void {
    this.loadMyRequests();

    // S'abonner aux changements
    this.deletionRequestService.requests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadMyRequests();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyRequests(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const allRequests = this.deletionRequestService.getAllRequests();
    const myRequests = allRequests.filter(r => r.sellerId === currentUser.id);
    this.requests.set(myRequests);
    this.filterRequests();
  }

  filterRequests(): void {
    const status = this.selectedStatus();
    let filtered = this.requests();

    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    // Trier par date (plus récent en premier)
    filtered = filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.filteredRequests.set(filtered);
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus.set(status);
    this.filterRequests();
  }

  getStatusLabel(status: DeletionRequestStatus): string {
    const labels: Record<DeletionRequestStatus, string> = {
      [DeletionRequestStatus.PENDING]: 'En attente',
      [DeletionRequestStatus.APPROVED]: 'Approuvée',
      [DeletionRequestStatus.REJECTED]: 'Rejetée',
      [DeletionRequestStatus.CANCELLED]: 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: DeletionRequestStatus): string {
    const icons: Record<DeletionRequestStatus, string> = {
      [DeletionRequestStatus.PENDING]: 'hugeMessageDelay02',
      [DeletionRequestStatus.APPROVED]: 'hugeCheckmarkCircle02',
      [DeletionRequestStatus.REJECTED]: 'hugeCancel02',
      [DeletionRequestStatus.CANCELLED]: 'hugeCancel01'
    };
    return icons[status] || 'hugeMessageDelay02';
  }

  getStatusClass(status: DeletionRequestStatus): string {
    const classes: Record<DeletionRequestStatus, string> = {
      [DeletionRequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [DeletionRequestStatus.APPROVED]: 'bg-green-100 text-green-800',
      [DeletionRequestStatus.REJECTED]: 'bg-red-100 text-red-800',
      [DeletionRequestStatus.CANCELLED]: 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
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

  toggleRequestDetails(requestId: string): void {
    if (this.expandedRequestId() === requestId) {
      this.expandedRequestId.set(null);
    } else {
      this.expandedRequestId.set(requestId);
    }
  }

  // Pagination methods
  paginatedRequests = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredRequests().slice(start, end);
  });

  paginationInfo = computed(() => {
    const total = this.filteredRequests().length;
    const totalPages = Math.ceil(total / this.itemsPerPage);
    const startIndex = total === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage + 1;
    const endIndex = Math.min(this.currentPage() * this.itemsPerPage, total);

    return {
      total,
      totalPages,
      currentPage: this.currentPage(),
      startIndex,
      endIndex
    };
  });

  nextPage(): void {
    if (this.currentPage() < this.paginationInfo().totalPages) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  firstPage(): void {
    this.currentPage.set(1);
  }

  lastPage(): void {
    this.currentPage.set(this.paginationInfo().totalPages);
  }

  getPageNumbers(): number[] {
    const totalPages = this.paginationInfo().totalPages;
    const current = this.currentPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      }
    }

    return pages;
  }

  onItemsPerPageChange(): void {
    this.currentPage.set(1);
  }

  filterByStatus(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.filterRequests();
  }

  onDateRangeChange(): void {
    this.currentPage.set(1);
    this.filterRequests();
  }
}
