import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { AuthService } from '../../../core/services/auth.service';
import { AppInfoService } from '../../../services/app-info.service';
import { AppInfo } from '../../../models/app-info.model';
import { DEFAULT_APP_INFO } from '../../../constants/app-defaults';
import { GdesCurrencyPipe } from '../../../pipes/currency/currency.pipe';
import { DeletionRequestService } from '../../../core/services/deletion-request.service';
import { DeletionReason, CreateDeletionRequestDto } from '../../../core/models/deletion-request.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeInvoice01,
  hugeSearch01,
  hugeArrowDownDouble,
  hugeArrowRightDouble,
  hugeDelete03,
  hugeCsv01,
  hugePdf01,
  hugeXls01,
  hugeGitCompare,
  hugeArrowUp02,
  hugeArrowDown02,
  hugeMessageDelay02,
  hugeCancel01,
  hugeSent
} from '@ng-icons/huge-icons';

interface Sale {
  id: string;
  saleNumber: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items?: any[];
  seller?: {
    id: string;
    fullName: string;
    username: string;
    isSuperAdmin?: boolean;
  };
}

interface UserForFilter {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent, GdesCurrencyPipe],
  viewProviders: [
    provideIcons({
      hugeInvoice01,
      hugeSearch01,
      hugeArrowDownDouble,
      hugeArrowRightDouble,
      hugeDelete03,
      hugeCsv01,
      hugePdf01,
      hugeXls01,
      hugeGitCompare,
      hugeArrowUp02,
      hugeArrowDown02,
      hugeMessageDelay02,
      hugeCancel01,
      hugeSent
    })
  ],
  templateUrl: './sales-history.component.html',
  styleUrl: './sales-history.component.css'
})
export class SalesHistoryComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  authService = inject(AuthService);
  private appInfoService = inject(AppInfoService);
  private deletionRequestService = inject(DeletionRequestService);
  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}/sales`;
  private usersApiUrl = `${environment.apiUrl}/users`;

  sales = signal<Sale[]>([]);
  filteredSales = signal<Sale[]>([]);
  searchTerm = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  loading = signal<boolean>(false);
  expandedSaleId = signal<string | null>(null);
  reportType = signal<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');

  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);
  paginatedSales = signal<Sale[]>([]);

  // Selection mode
  selectionMode = signal<boolean>(false);
  selectedSaleIds = signal<Set<string>>(new Set());

  // Filter by seller/user
  selectedUserId = signal<string>('all');
  users = signal<UserForFilter[]>([]);
  currentUser = this.authService.getCurrentUser();
  isAdmin = this.currentUser?.role === 'admin' || this.currentUser?.isSuperAdmin;

  // App info for exports
  appInfo = signal<AppInfo | null>(DEFAULT_APP_INFO);

  // Deletion request feature
  showDeletionRequestModal = signal(false);
  selectedSaleForDeletion: Sale | null = null;
  deletionReasons = signal<Set<DeletionReason>>(new Set());
  deletionDescription = signal('');
  submittingDeletionRequest = signal(false);
  deletionRequestError = signal('');
  deletionRequestSuccess = signal('');

  // Available reasons enum
  readonly DeletionReason = DeletionReason;
  readonly availableReasons = [
    { value: DeletionReason.WRONG_PRODUCT, label: 'Mauvais produit' },
    { value: DeletionReason.WRONG_QUANTITY, label: 'Mauvaise quantité' },
    { value: DeletionReason.WRONG_PRICE, label: 'Mauvais prix' },
    { value: DeletionReason.WRONG_CUSTOMER, label: 'Mauvais client' },
    { value: DeletionReason.DUPLICATE, label: 'Vente en double' },
    { value: DeletionReason.PAYMENT_ISSUE, label: 'Problème de paiement' },
    { value: DeletionReason.OTHER, label: 'Autre' }
  ];

  // Comparison feature
  showComparisonModal = signal(false);
  comparisonDate = '';
  comparisonSeller1Id = '';
  comparisonSeller2Id = '';
  comparisonData1 = signal<any>(null);
  comparisonData2 = signal<any>(null);
  comparisonResults = computed(() => {
    const data1 = this.comparisonData1();
    const data2 = this.comparisonData2();

    if (!data1 || !data2) return null;

    // Calculate average sale values
    const avgSale1 = data1.totalSales > 0 ? data1.totalRevenue / data1.totalSales : 0;
    const avgSale2 = data2.totalSales > 0 ? data2.totalRevenue / data2.totalSales : 0;

    return {
      revenue: {
        value1: data1.totalRevenue || 0,
        value2: data2.totalRevenue || 0,
        diff: (data2.totalRevenue || 0) - (data1.totalRevenue || 0),
        percentChange: data1.totalRevenue ? ((data2.totalRevenue - data1.totalRevenue) / data1.totalRevenue * 100) : 0
      },
      sales: {
        value1: data1.totalSales || 0,
        value2: data2.totalSales || 0,
        diff: (data2.totalSales || 0) - (data1.totalSales || 0),
        percentChange: data1.totalSales ? ((data2.totalSales - data1.totalSales) / data1.totalSales * 100) : 0
      },
      productsSold: {
        value1: data1.totalProducts || 0,
        value2: data2.totalProducts || 0,
        diff: (data2.totalProducts || 0) - (data1.totalProducts || 0),
        percentChange: data1.totalProducts ? ((data2.totalProducts - data1.totalProducts) / data1.totalProducts * 100) : 0
      },
      averageSale: {
        value1: avgSale1,
        value2: avgSale2,
        diff: avgSale2 - avgSale1,
        percentChange: avgSale1 ? ((avgSale2 - avgSale1) / avgSale1 * 100) : 0
      }
    };
  });

  ngOnInit(): void {
    if (this.isAdmin) {
      this.loadUsersForFilter();
    }
    // Load app info for exports
    this.loadAppInfo();

    // Initialiser les dates pour le filtre "Aujourd'hui" SANS appeler onSearch
    // car loadSales() appellera onSearch() à la fin
    this.reportType.set('daily');
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    this.startDate.set(start.toISOString().split('T')[0]);
    this.endDate.set(new Date().toISOString().split('T')[0]);

    this.loadSales();
  }

  loadUsersForFilter(): void {
    this.http.get<any[]>(this.usersApiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allUsers) => {
          // Filtrer : vendeurs + admins avec accès POS (sauf super admin)
          const filteredUsers = allUsers.filter(user => {
            if (user.isSuperAdmin) return false;
            if (user.role === 'seller') return true;
            if (user.role === 'admin' && user.permissions?.pos) {
              // Vérifier si l'admin a au moins une permission sur POS
              const posPerms = user.permissions.pos;
              return typeof posPerms === 'object'
                ? (posPerms.create || posPerms.read || posPerms.update || posPerms.delete)
                : posPerms === true;
            }
            return false;
          });

          this.users.set(filteredUsers.map(u => ({
            id: u.id,
            fullName: u.fullName || u.username,
            username: u.username,
            role: u.role
          })));
        },
        error: (error) => {
          console.error('Erreur lors du chargement des utilisateurs:', error);
        }
      });
  }

  loadAppInfo(): void {
    this.appInfoService.getAppInfo().subscribe({
      next: (appInfo) => {
        this.appInfo.set(appInfo);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des informations de l\'application:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSales(): void {
    this.loading.set(true);

    // Préparer les paramètres pour le backend
    const params: any = {};

    // Ajouter le sellerId
    if (!this.isAdmin) {
      params.sellerId = this.currentUser?.id;
    } else if (this.selectedUserId() !== 'all') {
      params.sellerId = this.selectedUserId();
    }

    // Ajouter les dates si définies
    if (this.startDate()) {
      params.startDate = this.startDate();
    }
    if (this.endDate()) {
      params.endDate = this.endDate();
    }

    this.http.get<Sale[]>(this.apiUrl, { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          // Filtrer seulement les ventes complétées
          let completedSales = sales.filter(s => s.status === 'COMPLETED' || s.status === 'completed');

          // Si pas super admin, filtrer les ventes du super admin
          if (!this.currentUser?.isSuperAdmin) {
            completedSales = completedSales.filter(sale => !sale.seller?.isSuperAdmin);
          }

          this.sales.set(completedSales);
          this.filteredSales.set(completedSales); // Directement car le backend a déjà filtré
          this.updatePagination();
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des ventes:', error);
          this.loading.set(false);
        }
      });
  }

  onSearch(): void {
    let filtered = this.sales();

    // Filtrage par utilisateur (pour les admins)
    if (this.isAdmin && this.selectedUserId() !== 'all') {
      filtered = filtered.filter(sale =>
        sale.seller?.id === this.selectedUserId()
      );
    }

    // Recherche globale par terme
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(sale => {
        const saleNumber = sale.saleNumber?.toLowerCase() || '';
        const customerName = sale.customerName?.toLowerCase() || '';
        const customerPhone = sale.customerPhone?.toLowerCase() || '';
        const sellerName = sale.seller?.fullName?.toLowerCase() || '';
        const sellerUsername = sale.seller?.username?.toLowerCase() || '';
        const paymentMethod = sale.paymentMethod?.toLowerCase() || '';

        return saleNumber.includes(term) ||
               customerName.includes(term) ||
               customerPhone.includes(term) ||
               sellerName.includes(term) ||
               sellerUsername.includes(term) ||
               paymentMethod.includes(term);
      });
    }

    // Filtrage par dates
    if (this.startDate()) {
      const start = new Date(this.startDate());
      filtered = filtered.filter(sale => new Date(sale.createdAt) >= start);
    }

    if (this.endDate()) {
      const end = new Date(this.endDate());
      end.setHours(23, 59, 59);
      filtered = filtered.filter(sale => new Date(sale.createdAt) <= end);
    }

    this.filteredSales.set(filtered);
    this.updatePagination();
  }

  setQuickRange(type: 'daily' | 'weekly' | 'monthly' | 'yearly'): void {
    this.reportType.set(type);
    const today = new Date();
    let start = new Date();

    switch(type) {
      case 'daily':
        start = new Date(today.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        const dayOfWeek = today.getDay();
        start = new Date(today);
        start.setDate(today.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'yearly':
        start = new Date(today.getFullYear(), 0, 1);
        break;
    }

    this.startDate.set(start.toISOString().split('T')[0]);
    this.endDate.set(new Date().toISOString().split('T')[0]);
    this.loadSales(); // Recharger depuis le backend avec les nouvelles dates
  }

  onDateRangeChange(): void {
    this.reportType.set('custom');
    this.loadSales(); // Recharger depuis le backend avec les nouvelles dates
  }

  updatePagination(): void {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    this.paginatedSales.set(this.filteredSales().slice(start, end));
  }

  onItemsPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.itemsPerPage.set(Number(select.value));
    this.currentPage.set(1);
    this.updatePagination();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.updatePagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredSales().length / this.itemsPerPage());
  }

  paginationInfo() {
    const start = (this.currentPage() - 1) * this.itemsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.itemsPerPage(), this.filteredSales().length);
    return {
      startIndex: start,
      endIndex: end,
      total: this.filteredSales().length
    };
  }

  getPageNumbers(): number[] {
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);
    let start = Math.max(1, this.currentPage() - half);
    let end = Math.min(this.totalPages, start + maxPagesToShow - 1);

    // Ajuster start si end est au maximum
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  toggleSelectionMode(): void {
    if (this.selectionMode()) {
      if (this.selectedSaleIds().size > 0) {
        this.deleteSelectedSales();
      } else {
        this.selectionMode.set(false);
      }
    } else {
      this.selectionMode.set(true);
      this.selectedSaleIds.set(new Set());
    }
  }

  toggleSaleSelection(saleId: string): void {
    const selected = new Set(this.selectedSaleIds());
    if (selected.has(saleId)) {
      selected.delete(saleId);
    } else {
      selected.add(saleId);
    }
    this.selectedSaleIds.set(selected);
  }

  isSaleSelected(saleId: string): boolean {
    return this.selectedSaleIds().has(saleId);
  }

  toggleSelectAll(): void {
    const allIds = this.paginatedSales().map(s => s.id);
    const selected = this.selectedSaleIds();

    if (this.allSalesSelected()) {
      const newSet = new Set(selected);
      allIds.forEach(id => newSet.delete(id));
      this.selectedSaleIds.set(newSet);
    } else {
      const newSet = new Set(selected);
      allIds.forEach(id => newSet.add(id));
      this.selectedSaleIds.set(newSet);
    }
  }

  allSalesSelected(): boolean {
    const allIds = this.paginatedSales().map(s => s.id);
    return allIds.length > 0 && allIds.every(id => this.selectedSaleIds().has(id));
  }

  deleteSelectedSales(): void {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${this.selectedSaleIds().size} vente(s) ?`)) {
      return;
    }

    const idsToDelete = Array.from(this.selectedSaleIds());
    // TODO: Appeler l'API pour supprimer les ventes
    console.log('Suppression des ventes:', idsToDelete);

    // Pour l'instant, juste retirer du mode sélection
    this.selectionMode.set(false);
    this.selectedSaleIds.set(new Set());
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 2
    }).format(amount).replace('HTG', 'Gdes');
  }

  formatCurrencyForPDF(value: number): string {
    // Format number with regular spaces for PDF compatibility
    const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return formatted + ' Gds';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getTotalItems(sale: Sale): number {
    if (!sale.items) return 0;
    return sale.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  toggleSaleDetails(saleId: string): void {
    if (this.expandedSaleId() === saleId) {
      this.expandedSaleId.set(null);
    } else {
      // Charger les détails complets si pas déjà chargés
      const sale = this.filteredSales().find(s => s.id === saleId);
      if (sale && (!sale.items || sale.items.length === 0)) {
        this.http.get<Sale>(`${this.apiUrl}/${saleId}`)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (fullSale) => {
              // Mettre à jour la vente dans la liste avec les items
              const allSales = this.sales();
              const index = allSales.findIndex(s => s.id === saleId);
              if (index !== -1) {
                allSales[index] = fullSale;
                this.sales.set([...allSales]);
                this.onSearch(); // Reappliquer les filtres
              }
              this.expandedSaleId.set(saleId);
            },
            error: (error) => {
              console.error('Erreur lors du chargement des détails:', error);
            }
          });
      } else {
        this.expandedSaleId.set(saleId);
      }
    }
  }

  getTotalAmount(): number {
    const sales = this.filteredSales();
    console.log('getTotalAmount - filteredSales:', sales);
    console.log('getTotalAmount - filteredSales.length:', sales.length);
    if (!sales || sales.length === 0) return 0;

    const total = sales.reduce((sum, sale) => {
      console.log('Sale total:', sale.total, 'Type:', typeof sale.total);
      const amount = typeof sale.total === 'number' ? sale.total : parseFloat(sale.total) || 0;
      console.log('Amount parsed:', amount);
      return sum + amount;
    }, 0);

    console.log('getTotalAmount - Final total:', total);
    return total;
  }

  exportToPDF(): void {
    const info = this.appInfo();
    const sales = this.filteredSales();

    if (!info) {
      alert('Impossible de générer le PDF - Informations de l\'application manquantes');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const marginLeft = 15;
    const marginRight = 15;
    let currentY = 20;

    // En-tête - Company Info
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(info.nom_app, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (info.adresse_app) {
      doc.text(info.adresse_app, pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
    }

    const contactInfo = [info.phone_app, info.email_app].filter(Boolean).join(' | ');
    if (contactInfo) {
      doc.text(contactInfo, pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
    }

    // Separator line
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
    currentY += 8;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Historique des Ventes', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // Date range
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (this.startDate() || this.endDate()) {
      const startDateStr = this.startDate() ? new Date(this.startDate()).toLocaleDateString('fr-FR') : 'Début';
      const endDateStr = this.endDate() ? new Date(this.endDate()).toLocaleDateString('fr-FR') : 'Fin';
      const periodText = `Période: ${startDateStr} au ${endDateStr}`;
      doc.text(periodText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
    }

    // Vendor name (if filtered)
    if (this.isAdmin && this.selectedUserId() !== 'all') {
      const user = this.users().find(u => u.id === this.selectedUserId());
      if (user) {
        doc.text(`Vendeur: ${user.fullName}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
      }
    }

    // Total sales
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${this.formatCurrencyForPDF(this.getTotalAmount())}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Préparer les données pour le tableau
    const tableData = sales.map(sale => {
      const row: any[] = [
        this.formatDate(sale.createdAt),
        sale.customerName || 'Client anonyme',
        this.formatCurrencyForPDF(sale.total),
        this.getPaymentMethodLabel(sale.paymentMethod)
      ];

      if (this.isAdmin) {
        row.unshift(sale.seller?.fullName || sale.seller?.username || 'N/A');
      }

      return row;
    });

    // En-têtes
    const headers: string[] = this.isAdmin
      ? ['Vendeur', 'Date', 'Client', 'Montant', 'Paiement']
      : ['Date', 'Client', 'Montant', 'Paiement'];

    // Générer le tableau
    autoTable(doc, {
      startY: currentY,
      head: [headers],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: {
        fillColor: [13, 148, 136], // teal-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      margin: { left: marginLeft, right: marginRight }
    });

    // Télécharger le PDF
    const fileName = `historique_ventes_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  exportToExcel(): void {
    const info = this.appInfo();
    const sales = this.filteredSales();

    if (!info) {
      alert('Impossible de générer le fichier Excel - Informations de l\'application manquantes');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Date range
    let periodText = 'Période: ';
    if (this.startDate() || this.endDate()) {
      const startDateStr = this.startDate() ? new Date(this.startDate()).toLocaleDateString('fr-FR') : 'Début';
      const endDateStr = this.endDate() ? new Date(this.endDate()).toLocaleDateString('fr-FR') : 'Fin';
      periodText = `Période: ${startDateStr} au ${endDateStr}`;
    }

    // Vendor info
    let sellerText = '';
    if (this.isAdmin && this.selectedUserId() !== 'all') {
      const user = this.users().find(u => u.id === this.selectedUserId());
      if (user) {
        sellerText = `Vendeur: ${user.fullName}`;
      }
    }

    const allData: any[] = [
      [info.nom_app, '', '', '', ''],
      [info.adresse_app || '', '', '', '', ''],
      [`Tel: ${info.phone_app || ''} | Email: ${info.email_app || ''}`, '', '', '', ''],
      ['', '', '', '', ''],
      ['Historique des Ventes', '', '', '', ''],
      [periodText, '', '', '', ''],
    ];

    if (sellerText) {
      allData.push([sellerText, '', '', '', '']);
    }

    allData.push(
      [`Total: ${this.getTotalAmount()} Gds`, '', '', '', ''],
      [`Généré le: ${dateStr} à ${timeStr}`, '', '', '', ''],
      ['', '', '', '', ''],
    );

    // Table headers
    const headers = this.isAdmin
      ? ['Vendeur', 'Date', 'Client', 'Téléphone', 'Montant', 'Paiement']
      : ['Date', 'Client', 'Téléphone', 'Montant', 'Paiement'];

    allData.push(headers);

    // Sales data
    sales.forEach(sale => {
      const row: any[] = [
        this.formatDate(sale.createdAt),
        sale.customerName || 'Client anonyme',
        sale.customerPhone || '',
        sale.total + ' Gds',
        this.getPaymentMethodLabel(sale.paymentMethod)
      ];

      if (this.isAdmin) {
        row.unshift(sale.seller?.fullName || sale.seller?.username || 'N/A');
      }

      allData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Column widths
    ws['!cols'] = this.isAdmin
      ? [
          { wch: 20 }, // Vendeur
          { wch: 20 }, // Date
          { wch: 25 }, // Client
          { wch: 15 }, // Téléphone
          { wch: 20 }, // Montant
          { wch: 15 }  // Paiement
        ]
      : [
          { wch: 20 }, // Date
          { wch: 25 }, // Client
          { wch: 15 }, // Téléphone
          { wch: 20 }, // Montant
          { wch: 15 }  // Paiement
        ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historique');

    XLSX.writeFile(wb, `historique-ventes-${new Date().getTime()}.xlsx`);
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'cash': 'Espèces',
      'card': 'Carte',
      'mobile_money': 'Mobile Money',
      'bank_transfer': 'Virement'
    };
    return labels[method] || method;
  }

  // Comparison methods
  openComparisonModal(): void {
    this.showComparisonModal.set(true);
    const today = new Date();
    this.comparisonDate = this.formatDateForInput(today);
    this.comparisonSeller1Id = '';
    this.comparisonSeller2Id = '';
    this.comparisonData1.set(null);
    this.comparisonData2.set(null);
  }

  closeComparisonModal(): void {
    this.showComparisonModal.set(false);
    this.comparisonData1.set(null);
    this.comparisonData2.set(null);
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getVendorName(vendorId: string): string {
    const vendor = this.users().find(u => u.id === vendorId);
    return vendor?.fullName || 'Vendeur';
  }

  async compareVendorSales(): Promise<void> {
    if (!this.comparisonDate || !this.comparisonSeller1Id || !this.comparisonSeller2Id) {
      alert('Veuillez sélectionner la date et les deux vendeurs pour la comparaison');
      return;
    }

    if (this.comparisonSeller1Id === this.comparisonSeller2Id) {
      alert('Veuillez sélectionner deux vendeurs différents');
      return;
    }

    // Validation du format de date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(this.comparisonDate)) {
      alert('Format de date invalide. Veuillez sélectionner une date valide.');
      return;
    }

    this.loading.set(true);

    try {
      // Parse date correctly to avoid timezone issues
      const dateParts = this.comparisonDate.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const day = parseInt(dateParts[2], 10);

      // Vérifier que les valeurs sont valides
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error('Date invalide');
      }

      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      // Get sales for first vendor
      const sales1$ = this.http.get<Sale[]>(this.apiUrl, {
        params: {
          sellerId: this.comparisonSeller1Id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      // Get sales for second vendor
      const sales2$ = this.http.get<Sale[]>(this.apiUrl, {
        params: {
          sellerId: this.comparisonSeller2Id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      const [sales1, sales2] = await Promise.all([
        sales1$.pipe(takeUntil(this.destroy$)).toPromise(),
        sales2$.pipe(takeUntil(this.destroy$)).toPromise()
      ]);

      // Calculate metrics for vendor 1
      const data1 = {
        totalRevenue: sales1?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0,
        totalSales: sales1?.length || 0,
        totalProducts: sales1?.reduce((sum, sale) => sum + (sale.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0), 0) || 0
      };

      // Calculate metrics for vendor 2
      const data2 = {
        totalRevenue: sales2?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0,
        totalSales: sales2?.length || 0,
        totalProducts: sales2?.reduce((sum, sale) => sum + (sale.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0), 0) || 0
      };

      this.comparisonData1.set(data1);
      this.comparisonData2.set(data2);

      this.loading.set(false);
    } catch (error: any) {
      console.error('Erreur lors de la comparaison:', error);
      alert('Erreur lors de la récupération des données de comparaison');
      this.loading.set(false);
    }
  }

  // Deletion request methods
  openDeletionRequestModal(sale: Sale): void {
    this.selectedSaleForDeletion = sale;
    this.deletionReasons.set(new Set());
    this.deletionDescription.set('');
    this.deletionRequestError.set('');
    this.deletionRequestSuccess.set('');
    this.showDeletionRequestModal.set(true);
  }

  closeDeletionRequestModal(): void {
    this.showDeletionRequestModal.set(false);
    this.selectedSaleForDeletion = null;
    this.deletionReasons.set(new Set());
    this.deletionDescription.set('');
    this.deletionRequestError.set('');
    this.deletionRequestSuccess.set('');
  }

  toggleDeletionReason(reason: DeletionReason): void {
    const currentReasons = new Set(this.deletionReasons());
    if (currentReasons.has(reason)) {
      currentReasons.delete(reason);
    } else {
      currentReasons.add(reason);
    }
    this.deletionReasons.set(currentReasons);
  }

  isReasonSelected(reason: DeletionReason): boolean {
    return this.deletionReasons().has(reason);
  }

  submitDeletionRequest(): void {
    if (!this.selectedSaleForDeletion) {
      this.deletionRequestError.set('Aucune vente sélectionnée');
      return;
    }

    const reasons = Array.from(this.deletionReasons());
    const description = this.deletionDescription().trim();

    // Validation
    if (reasons.length === 0) {
      this.deletionRequestError.set('Veuillez sélectionner au moins un motif');
      return;
    }

    if (!description) {
      this.deletionRequestError.set('Veuillez fournir une description');
      return;
    }

    this.submittingDeletionRequest.set(true);
    this.deletionRequestError.set('');

    const dto: CreateDeletionRequestDto = {
      saleId: this.selectedSaleForDeletion.id,
      saleTicketNo: this.selectedSaleForDeletion.saleNumber,
      reasons,
      description
    };

    this.deletionRequestService.createRequest(dto).subscribe({
      next: (request) => {
        this.deletionRequestSuccess.set('Demande envoyée au super admin avec succès !');
        this.submittingDeletionRequest.set(false);

        // Fermer le modal après 2 secondes
        setTimeout(() => {
          this.closeDeletionRequestModal();
        }, 2000);
      },
      error: (error) => {
        this.deletionRequestError.set(error || 'Erreur lors de l\'envoi de la demande');
        this.submittingDeletionRequest.set(false);
      }
    });
  }

  // Vérifier si une vente a une demande de suppression en attente
  hasPendingDeletionRequest(saleId: string): boolean {
    return this.deletionRequestService.hasPendingRequestForSale(saleId);
  }

  // Voir la demande de suppression depuis l'historique (pour super admin)
  viewDeletionRequestFromHistory(saleId: string): void {
    const request = this.deletionRequestService.getPendingRequestForSale(saleId);
    if (request) {
      // Naviguer vers la page de notifications avec la demande
      this.router.navigate(['/admin/notifications'], {
        state: { openRequestId: request.id }
      });
    }
  }
}
