import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, take } from 'rxjs';
import { ReportsService } from '../../core/services/reports.service';
import { UsersService } from '../../core/services/users.service';
import { SalesService } from '../../core/services/sales.service';
import { AppInfoService } from '../../services/app-info.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { Sale } from '../../core/models/sale.model';
import { AppInfo } from '../../models/app-info.model';
import { DEFAULT_APP_INFO } from '../../constants/app-defaults';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { GdesCurrencyPipe } from '../../pipes/currency/currency.pipe';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  hugeCalendar03,
  // hugeDownload04,
  // hugeFileDownload,
  hugeMoneyBag02,
  hugeChartColumn,
  hugeChartHistogram,
  hugeSafeDelivery01,
  hugeChartMedium,
  hugePdf01,
  hugeXls01,
  hugeArrowRightDouble,
  hugeArrowDownDouble,
  // hugeArrowUp01,
  hugeArrowDown02,
  // hugeArrowDown01,
  hugeGitCompare,
  hugeArrowUp02,
  hugeDelete03,
  hugeAlert01,
  hugeCheckmarkCircle04,
  hugeEye,
  hugeViewOff
} from '@ng-icons/huge-icons';

interface DateRange {
  start: Date;
  end: Date;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent, GdesCurrencyPipe],
  viewProviders: [
    provideIcons({
      hugeCalendar03,
      // hugeDownload04,
      // hugeFileDownload,
      hugeMoneyBag02,
      hugeChartColumn,
      hugeChartHistogram,
      hugeSafeDelivery01,
      hugeChartMedium,
      hugePdf01,
      hugeXls01,
      hugeArrowRightDouble,
      hugeArrowDownDouble,
      // hugeArrowUp01,
      // hugeArrowDown01,
      hugeArrowDown02,
      hugeGitCompare,
      hugeArrowUp02,
      hugeDelete03,
      hugeAlert01,
      hugeCheckmarkCircle04,
      hugeEye,
      hugeViewOff
    })
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Date range selection
  dateRange = signal<DateRange>({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999))
  });

  // Report type
  reportType = signal<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');

  // Filter by seller
  selectedSellerId = signal<string>('all');
  sellers = signal<User[]>([]);

  // Financial data
  salesReport = signal<any>(null);
  profitReport = signal<any>(null);
  topProducts = signal<any[]>([]);
  topSellers = signal<any[]>([]);

  // Detailed sales data
  allSales = signal<Sale[]>([]);
  expandedSaleId = signal<string | null>(null);

  // Pagination for sales
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  paginationInfo = computed(() => {
    const total = this.allSales().length;
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage + 1;
    const endIndex = Math.min(page * perPage, total);

    return {
      total,
      totalPages,
      startIndex,
      endIndex,
      currentPage: page
    };
  });

  paginatedSales = computed(() => {
    const sales = this.allSales();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return sales.slice(startIndex, endIndex);
  });

  // Top Products with filters
  topProductsPeriod = signal<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  topProductsDetailed = signal<any[]>([]);

  // Top Sellers with filters
  topSellersPeriod = signal<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  topSellersDetailed = signal<any[]>([]);

  // Summary stats
  stats = signal({
    totalRevenue: 0,
    totalProfit: 0,
    totalSales: 0,
    averageSaleValue: 0,
    profitMargin: 0
  });

  // Comparison feature
  showComparisonModal = signal(false);
  comparisonDate1 = '';
  comparisonDate2 = '';
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
      profit: {
        value1: data1.grossProfit || 0,
        value2: data2.grossProfit || 0,
        diff: (data2.grossProfit || 0) - (data1.grossProfit || 0),
        percentChange: data1.grossProfit ? ((data2.grossProfit - data1.grossProfit) / data1.grossProfit * 100) : 0
      },
      sales: {
        value1: data1.totalSales || 0,
        value2: data2.totalSales || 0,
        diff: (data2.totalSales || 0) - (data1.totalSales || 0),
        percentChange: data1.totalSales ? ((data2.totalSales - data1.totalSales) / data1.totalSales * 100) : 0
      },
      productsSold: {
        value1: data1.totalProductsSold || 0,
        value2: data2.totalProductsSold || 0,
        diff: (data2.totalProductsSold || 0) - (data1.totalProductsSold || 0),
        percentChange: data1.totalProductsSold ? ((data2.totalProductsSold - data1.totalProductsSold) / data1.totalProductsSold * 100) : 0
      },
      averageSale: {
        value1: avgSale1,
        value2: avgSale2,
        diff: avgSale2 - avgSale1,
        percentChange: avgSale1 ? ((avgSale2 - avgSale1) / avgSale1 * 100) : 0
      }
    };
  });

  // Date inputs for binding
  startDate = '';
  endDate = '';

  // App info for exports
  appInfo = signal<AppInfo | null>(DEFAULT_APP_INFO);

  // Toggle stats visibility
  showStats = signal(true);

  // Selection mode
  selectionMode = signal<boolean>(false);
  selectedSaleIds = signal<Set<string>>(new Set());
  maxSelections = 15;
  showMultipleDeleteModal = signal<boolean>(false);

  // Computed: check if all sales on current page are selected
  allSalesSelected = computed(() => {
    const paginated = this.paginatedSales();
    const selected = this.selectedSaleIds();
    if (paginated.length === 0) return false;
    return paginated.every(sale => selected.has(sale.id));
  });

  constructor(
    private reportsService: ReportsService,
    private usersService: UsersService,
    private salesService: SalesService,
    private appInfoService: AppInfoService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadSellers();
    this.loadAppInfo();
    this.loadReports();
    this.loadTopProductsDetailed();
    this.loadTopSellersDetailed();
  }

  loadSellers(): void {
    this.usersService.getAll().subscribe({
      next: (users) => {
        this.sellers.set(users);
      },
      error: (error) => {
        console.error('Erreur chargement vendeurs:', error);
      }
    });
  }

  loadAppInfo(): void {
    this.appInfoService.getAppInfo().subscribe({
      next: (appInfo) => {
        this.appInfo.set(appInfo);
      },
      error: (error) => {
        console.error('Erreur chargement app info:', error);
      }
    });
  }

  initializeDates(): void {
    const range = this.dateRange();
    this.startDate = this.formatDateForInput(range.start);
    this.endDate = this.formatDateForInput(range.end);
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onDateRangeChange(): void {
    // Parse dates without timezone conversion
    const [startYear, startMonth, startDay] = this.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = this.endDate.split('-').map(Number);

    const startDateObj = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const endDateObj = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    // Ensure end date is not before start date
    if (endDateObj < startDateObj) {
      this.endDate = this.startDate;
      return;
    }

    this.dateRange.set({
      start: startDateObj,
      end: endDateObj
    });
    this.reportType.set('custom');
    this.loadReports();
  }

  setQuickRange(type: 'daily' | 'weekly' | 'monthly' | 'yearly'): void {
    const end = new Date();
    let start = new Date();

    switch (type) {
      case 'daily':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'yearly':
        start = new Date(end.getFullYear(), 0, 1);
        break;
    }

    this.dateRange.set({ start, end });
    this.reportType.set(type);
    this.startDate = this.formatDateForInput(start);
    this.endDate = this.formatDateForInput(end);
    this.loadReports();
  }

  toggleSaleDetails(saleId: string): void {
    if (this.expandedSaleId() === saleId) {
      this.expandedSaleId.set(null);
    } else {
      this.expandedSaleId.set(saleId);
    }
  }

  // Pagination methods
  onItemsPerPageChange(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.itemsPerPage.set(value);
    this.currentPage.set(1); // Reset to first page
  }

  goToPage(page: number): void {
    const info = this.paginationInfo();
    if (page >= 1 && page <= info.totalPages) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    const info = this.paginationInfo();
    if (info.currentPage < info.totalPages) {
      this.currentPage.set(info.currentPage + 1);
    }
  }

  previousPage(): void {
    const info = this.paginationInfo();
    if (info.currentPage > 1) {
      this.currentPage.set(info.currentPage - 1);
    }
  }

  firstPage(): void {
    this.currentPage.set(1);
  }

  lastPage(): void {
    const info = this.paginationInfo();
    this.currentPage.set(info.totalPages);
  }

  getPageNumbers(): number[] {
    const info = this.paginationInfo();
    const pages: number[] = [];
    const maxVisible = 6;

    if (info.totalPages <= maxVisible) {
      for (let i = 1; i <= info.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, info.currentPage - 2);
      const end = Math.min(info.totalPages, start + maxVisible - 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  }

  // Comparison methods
  openComparisonModal(): void {
    this.showComparisonModal.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const today = new Date();
    this.comparisonDate2 = this.formatDateForInput(today);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    this.comparisonDate1 = this.formatDateForInput(lastWeek);
  }

  closeComparisonModal(): void {
    this.showComparisonModal.set(false);
    this.comparisonData1.set(null);
    this.comparisonData2.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  // Helper function to format date as YYYY-MM-DD without timezone conversion
  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async compareData(): Promise<void> {
    // Clear all messages at the start
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.comparisonDate1 || !this.comparisonDate2) {
      this.errorMessage.set('Veuillez sélectionner les deux dates pour la comparaison');
      setTimeout(() => this.errorMessage.set(''), 5000);
      return;
    }

    // Parse dates correctly to avoid timezone issues
    const [year1, month1, day1] = this.comparisonDate1.split('-').map(Number);
    const date1 = new Date(year1, month1 - 1, day1);

    const [year2, month2, day2] = this.comparisonDate2.split('-').map(Number);
    const date2 = new Date(year2, month2 - 1, day2);

    if (date2 < date1) {
      this.errorMessage.set('La deuxième date doit être postérieure ou égale à la première date');
      setTimeout(() => this.errorMessage.set(''), 5000);
      return;
    }

    this.loading.set(true);

    try {
      // Get data for first date
      const start1 = new Date(year1, month1 - 1, day1, 0, 0, 0, 0);
      const end1 = new Date(year1, month1 - 1, day1, 23, 59, 59, 999);

      const startDateStr1 = this.formatDateToString(start1);
      const endDateStr1 = this.formatDateToString(end1);

      console.log('Fetching data 1 for:', startDateStr1, 'to', endDateStr1);

      const data1 = await firstValueFrom(
        this.reportsService.getFinancialReport(startDateStr1, endDateStr1).pipe(take(1))
      );

      console.log('Data 1:', data1);

      // Get data for second date
      const start2 = new Date(year2, month2 - 1, day2, 0, 0, 0, 0);
      const end2 = new Date(year2, month2 - 1, day2, 23, 59, 59, 999);

      const startDateStr2 = this.formatDateToString(start2);
      const endDateStr2 = this.formatDateToString(end2);

      console.log('Fetching data 2 for:', startDateStr2, 'to', endDateStr2);

      const data2 = await firstValueFrom(
        this.reportsService.getFinancialReport(startDateStr2, endDateStr2).pipe(take(1))
      );

      console.log('Data 2:', data2);

      this.comparisonData1.set(data1);
      this.comparisonData2.set(data2);

      console.log('Comparison Results:', this.comparisonResults());

      this.loading.set(false);
      this.successMessage.set('Comparaison effectuée avec succès!');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Erreur lors de la comparaison:', error);

      let errorMsg = 'Erreur lors de la récupération des données de comparaison';

      if (error?.name === 'AbortError') {
        errorMsg = 'La requête a été annulée. Veuillez réessayer.';
      } else if (error?.status === 404) {
        errorMsg = 'Aucune donnée trouvée pour les dates sélectionnées';
      } else if (error?.status === 500) {
        errorMsg = 'Erreur serveur. Veuillez réessayer plus tard.';
      } else if (error?.message) {
        errorMsg = error.message;
      }

      this.errorMessage.set(errorMsg);
      this.loading.set(false);
      setTimeout(() => this.errorMessage.set(''), 5000);
    }
  }

  loadReports(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const range = this.dateRange();
    const startDate = this.formatDateToString(range.start);
    const endDate = this.formatDateToString(range.end);
    const sellerId = this.selectedSellerId() !== 'all' ? this.selectedSellerId() : undefined;

    // Load financial report
    this.reportsService.getFinancialReport(startDate, endDate).subscribe({
      next: (data: any) => {
        this.salesReport.set(data);
        this.profitReport.set(data);
        this.calculateStats(data);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Erreur chargement rapport financier:', error);
        this.showError('Erreur lors du chargement du rapport');
        this.loading.set(false);
      }
    });

    // Load top products
    this.reportsService.getTopProducts(startDate, endDate, 5).subscribe({
      next: (data: any) => {
        this.topProducts.set(data);
      },
      error: (error: any) => {
        console.error('Erreur chargement top produits:', error);
      }
    });

    // Load top sellers
    this.reportsService.getTopSellers(startDate, endDate, 5).subscribe({
      next: (data: any) => {
        this.topSellers.set(data);
      },
      error: (error: any) => {
        console.error('Erreur chargement top vendeurs:', error);
      }
    });

    // Load all sales
    this.salesService.getAll(sellerId, startDate, endDate).subscribe({
      next: (sales: Sale[]) => {
        this.allSales.set(sales);
      },
      error: (error: any) => {
        console.error('Erreur chargement ventes:', error);
      }
    });
  }

  loadTopProductsDetailed(): void {
    const { startDate, endDate } = this.getPeriodDates(this.topProductsPeriod());
    // Load detailed top products 5 products
    this.reportsService.getTopProducts(startDate, endDate, 5).subscribe({
      next: (data: any) => {
        this.topProductsDetailed.set(data);
      },
      error: (error: any) => {
        console.error('Erreur chargement top produits détaillés:', error);
      }
    });
  }

  loadTopSellersDetailed(): void {
    const { startDate, endDate } = this.getPeriodDates(this.topSellersPeriod());

    this.reportsService.getTopSellers(startDate, endDate, 10).subscribe({
      next: (data: any) => {
        this.topSellersDetailed.set(data);
      },
      error: (error: any) => {
        console.error('Erreur chargement top vendeurs détaillés:', error);
      }
    });
  }

  getPeriodDates(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): { startDate: string, endDate: string } {
    const end = new Date();
    let start = new Date();

    switch (period) {
      case 'daily':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'yearly':
        start = new Date(end.getFullYear(), 0, 1);
        break;
    }

    return {
      startDate: this.formatDateToString(start),
      endDate: this.formatDateToString(end)
    };
  }

  onTopProductsPeriodChange(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): void {
    this.topProductsPeriod.set(period);
    this.loadTopProductsDetailed();
  }

  onTopSellersPeriodChange(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): void {
    this.topSellersPeriod.set(period);
    this.loadTopSellersDetailed();
  }

  calculateStats(report: any): void {
    if (!report) return;

    const totalRevenue = report.totalRevenue || 0;
    const grossProfit = report.grossProfit || 0;
    const totalSales = report.totalSales || 0;
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = report.profitMargin || 0;

    this.stats.set({
      totalRevenue,
      totalProfit: grossProfit,
      totalSales,
      averageSaleValue,
      profitMargin
    });
  }

  exportToPDF(): void {
    try {
      const info = this.appInfo();
      const report = this.salesReport();

      if (!info || !report) {
        this.showError('Impossible de générer le PDF - Données manquantes');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const marginLeft = 15;
      const marginRight = 15;
      let currentY = 20;

      // En-tête
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

      doc.setLineWidth(0.5);
      doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
      currentY += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Rapport Financier', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      // Période sélectionnée
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateRange = this.dateRange();
      const startDateStr = dateRange.start.toLocaleDateString('fr-FR');
      const endDateStr = dateRange.end.toLocaleDateString('fr-FR');
      const periodText = `Période: ${startDateStr} au ${endDateStr}`;
      doc.text(periodText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;

      // Vendeur sélectionné (si filtré)
      const sellerId = this.selectedSellerId();
      if (sellerId !== 'all') {
        const seller = this.sellers().find(s => s.id === sellerId);
        if (seller) {
          doc.text(`Vendeur: ${seller.fullName || seller.username}`, pageWidth / 2, currentY, { align: 'center' });
          currentY += 6;
        }
      }
      currentY += 4;

      // Statistiques des cards
      const stats = this.stats();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistiques Principales', marginLeft, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Indicateur', 'Valeur']],
        body: [
          ['Nombre de Ventes', stats.totalSales.toString()],
          ['Revenu Total', this.formatCurrencyForPDF(stats.totalRevenue)],
          ['Profit Total', this.formatCurrencyForPDF(stats.totalProfit)],
          ['Valeur Moyenne par Vente', this.formatCurrencyForPDF(stats.averageSaleValue)],
          ['Marge Bénéficiaire', stats.profitMargin.toFixed(1) + '%']
        ],
        theme: 'striped',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' as const },
          1: { cellWidth: 100, halign: 'right' as const }
        },
        didParseCell: function(data: any) {
          if (data.section === 'head' && data.column.index === 1) {
            data.cell.styles.halign = 'right';
          }
        },
        margin: { left: marginLeft, right: marginRight }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Détails Financiers
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Détails Financiers', marginLeft, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Indicateur', 'Valeur']],
        body: [
          ['Nombre de ventes', report.totalSales.toString()],
          ['Revenu total', this.formatCurrencyForPDF(report.totalRevenue)],
          ['Coût total', this.formatCurrencyForPDF(report.totalCost)],
          ['Profit brut', this.formatCurrencyForPDF(report.grossProfit)],
          ['Marge bénéficiaire', report.profitMargin + '%'],
          ['Remises totales', this.formatCurrencyForPDF(report.totalDiscount)],
          ['Taxes collectées', this.formatCurrencyForPDF(report.totalTax)],
          ['Profit net', this.formatCurrencyForPDF(report.netProfit)]
        ],
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' as const },
          1: { cellWidth: 100, halign: 'right' as const }
        },
        didParseCell: function(data: any) {
          if (data.section === 'head' && data.column.index === 1) {
            data.cell.styles.halign = 'right';
          }
        },
        margin: { left: marginLeft, right: marginRight }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Top 5 Produits
      const topProducts = this.topProducts();
      if (topProducts.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Top 5 Produits les Plus Vendus', marginLeft, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Produit', 'Quantité', 'Revenu']],
          body: topProducts.map(p => [
            p.productName,
            p.totalQuantity.toString(),
            this.formatCurrencyForPDF(p.totalRevenue)
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 80, halign: 'left' as const },
            1: { cellWidth: 40, halign: 'center' as const },
            2: { cellWidth: 60, halign: 'right' as const }
          },
          didParseCell: function(data: any) {
            if (data.section === 'head') {
              if (data.column.index === 1) {
                data.cell.styles.halign = 'center';
              } else if (data.column.index === 2) {
                data.cell.styles.halign = 'right';
              }
            }
          },
          margin: { left: marginLeft, right: marginRight }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Top 5 Vendeurs
      const topSellers = this.topSellers();
      if (topSellers.length > 0 && currentY < 250) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Top 5 Vendeurs', marginLeft, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Vendeur', 'Ventes', 'Revenu']],
          body: topSellers.map(s => [
            s.sellerName || 'Inconnu',
            s.totalSales.toString(),
            this.formatCurrencyForPDF(s.totalRevenue)
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: [147, 51, 234],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 80, halign: 'left' as const },
            1: { cellWidth: 40, halign: 'center' as const },
            2: { cellWidth: 60, halign: 'right' as const }
          },
          didParseCell: function(data: any) {
            if (data.section === 'head') {
              if (data.column.index === 1) {
                data.cell.styles.halign = 'center';
              } else if (data.column.index === 2) {
                data.cell.styles.halign = 'right';
              }
            }
          },
          margin: { left: marginLeft, right: marginRight }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Liste de toutes les ventes
      const sales = this.allSales();
      if (sales.length > 0) {
        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Toutes les Ventes', marginLeft, currentY);
        currentY += 5;

        const salesData = sales.map(sale => {
          const date = new Date(sale.createdAt);
          const dateStr = date.toLocaleDateString('fr-FR') + ' ' +
                         date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const seller = sale.seller?.fullName || sale.seller?.username || 'Inconnu';
          const productsCount = sale.items?.length || 0;
          const paymentMethod = this.getPaymentMethodLabel(sale.paymentMethod);
          const amount = this.formatCurrencyForPDF(sale.total);

          return [dateStr, seller, productsCount.toString(), paymentMethod, amount];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Date', 'Vendeur', 'Produits', 'Paiement', 'Montant']],
          body: salesData,
          theme: 'striped',
          headStyles: {
            fillColor: [20, 184, 166],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 35, halign: 'left' as const },
            1: { cellWidth: 45, halign: 'left' as const },
            2: { cellWidth: 20, halign: 'center' as const },
            3: { cellWidth: 35, halign: 'left' as const },
            4: { cellWidth: 45, halign: 'right' as const }
          },
          didParseCell: function(data: any) {
            if (data.section === 'head') {
              if (data.column.index === 2) {
                data.cell.styles.halign = 'center';
              } else if (data.column.index === 4) {
                data.cell.styles.halign = 'right';
              }
            }
          },
          margin: { left: marginLeft, right: marginRight }
        });
      }

      doc.save(`rapport-financier-${new Date().getTime()}.pdf`);
      this.showSuccess('PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      this.showError('Une erreur est survenue lors de la génération du PDF');
    }
  }

  exportToExcel(): void {
    try {
      const info = this.appInfo();
      const report = this.salesReport();

      if (!info || !report) {
        this.showError('Impossible de générer le fichier Excel - Données manquantes');
        return;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR');
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Date range and seller filter
      const dateRange = this.dateRange();
      const startDateStr = dateRange.start.toLocaleDateString('fr-FR');
      const endDateStr = dateRange.end.toLocaleDateString('fr-FR');
      const periodText = `Période: ${startDateStr} au ${endDateStr}`;

      const sellerId = this.selectedSellerId();
      let sellerText = '';
      if (sellerId !== 'all') {
        const seller = this.sellers().find(s => s.id === sellerId);
        if (seller) {
          sellerText = `Vendeur: ${seller.fullName || seller.username}`;
        }
      }

      const allData: any[] = [
        [info.nom_app, '', ''],
        [info.adresse_app || '', '', ''],
        [`Tel: ${info.phone_app || ''} | Email: ${info.email_app || ''}`, '', ''],
        ['', '', ''],
        ['Rapport Financier', '', ''],
        [periodText, '', ''],
      ];

      if (sellerText) {
        allData.push([sellerText, '', '']);
      }

      allData.push(
        [`Généré le: ${dateStr} à ${timeStr}`, '', ''],
        ['', '', ''],

        // Statistiques Principales (from cards)
        ['Statistiques Principales', '', ''],
        ['Indicateur', 'Valeur', '']
      );

      const stats = this.stats();
      allData.push(
        ['Nombre de Ventes', stats.totalSales, ''],
        ['Revenu Total', stats.totalRevenue, ' Gds'],
        ['Profit Total', stats.totalProfit, ' Gds'],
        ['Valeur Moyenne par Vente', stats.averageSaleValue.toFixed(0), ' Gds'],
        ['Marge Bénéficiaire', stats.profitMargin.toFixed(1) + '%', ''],
        ['', '', ''],
        ['', '', ''],

        // Détails Financiers
        ['Détails Financiers', '', ''],
        ['Indicateur', 'Valeur', ''],
        ['Nombre de ventes', report.totalSales, ''],
        ['Revenu total', report.totalRevenue, ' Gds'],
        ['Coût total', report.totalCost, ' Gds'],
        ['Profit brut', report.grossProfit, ' Gds'],
        ['Marge bénéficiaire', report.profitMargin + '%', ''],
        ['Remises totales', report.totalDiscount, ' Gds'],
        ['Taxes collectées', report.totalTax, ' Gds'],
        ['Profit net', report.netProfit, ' Gds'],
        ['', '', ''],
        ['', '', ''],
      );

      // Top 5 Produits
      const topProducts = this.topProducts();
      if (topProducts.length > 0) {
        allData.push(
          ['Top 5 Produits les Plus Vendus', '', ''],
          ['Produit', 'Quantité', 'Revenu'],
          ...topProducts.map(p => [p.productName, p.totalQuantity, p.totalRevenue + ' Gds']),
          ['', '', ''],
          ['', '', '']
        );
      }

      // Top 5 Vendeurs
      const topSellers = this.topSellers();
      if (topSellers.length > 0) {
        allData.push(
          ['Top 5 Vendeurs', '', ''],
          ['Vendeur', 'Ventes', 'Revenu'],
          ...topSellers.map(s => [s.sellerName || 'Inconnu', s.totalSales, s.totalRevenue + ' Gds']),
          ['', '', ''],
          ['', '', '']
        );
      }

      // Liste de toutes les ventes
      const sales = this.allSales();
      if (sales.length > 0) {
        allData.push(
          ['Toutes les Ventes', '', '', '', ''],
          ['Date', 'Vendeur', 'Produits', 'Paiement', 'Montant']
        );

        sales.forEach(sale => {
          const date = new Date(sale.createdAt);
          const dateStr = date.toLocaleDateString('fr-FR') + ' ' +
                         date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const seller = sale.seller?.fullName || sale.seller?.username || 'Inconnu';
          const productsCount = sale.items?.length || 0;
          const paymentMethod = this.getPaymentMethodLabel(sale.paymentMethod);
          const amount = sale.total;

          allData.push([dateStr, seller, productsCount, paymentMethod, amount + ' Gds']);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(allData);

      ws['!cols'] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapport Financier');

      XLSX.writeFile(wb, `rapport-financier-${new Date().getTime()}.xlsx`);

      this.showSuccess('Fichier Excel exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du fichier Excel:', error);
      this.showError('Une erreur est survenue lors de la génération du fichier Excel');
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' Gds';
  }

  formatCurrencyForPDF(value: number): string {
    // Format number with regular spaces for PDF compatibility
    const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return formatted + ' Gds';
  }

  formatPercent(value: number): string {
    return value.toFixed(1) + '%';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'cash': 'Espèces',
      'card': 'Carte',
      'mobile_money': 'Mobile Money',
      'bank_transfer': 'Virement'
    };
    return labels[method] || method;
  }

  getInitials(name: string | null | undefined): string {
    if (!name || !name.trim()) {
      return '?';
    }
    const names = name.trim().split(/\s+/);
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    } else {
      const firstInitial = names[0].charAt(0).toUpperCase();
      const lastInitial = names[names.length - 1].charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 3000);
  }

  // Selection mode methods
  toggleSelectionMode(): void {
    if (this.selectionMode()) {
      // Si on sort du mode sélection, supprimer les ventes sélectionnées
      if (this.selectedSaleIds().size > 0) {
        this.deleteSelectedSales();
      } else {
        // Sinon juste désactiver le mode
        this.selectionMode.set(false);
        this.selectedSaleIds.set(new Set());
      }
    } else {
      // Activer le mode sélection
      this.selectionMode.set(true);
      this.selectedSaleIds.set(new Set());
    }
  }

  toggleSaleSelection(saleId: string): void {
    const selected = new Set(this.selectedSaleIds());
    if (selected.has(saleId)) {
      selected.delete(saleId);
    } else {
      // Vérifier la limite de 15 sélections
      if (selected.size >= this.maxSelections) {
        this.showError(`Vous ne pouvez sélectionner que ${this.maxSelections} ventes maximum`);
        return;
      }
      selected.add(saleId);
    }
    this.selectedSaleIds.set(selected);
  }

  toggleSelectAll(): void {
    const paginated = this.paginatedSales();
    const selected = new Set(this.selectedSaleIds());

    if (this.allSalesSelected()) {
      // Deselect all on current page
      paginated.forEach(sale => selected.delete(sale.id));
    } else {
      // Select all on current page (limit to maxSelections)
      const availableSlots = this.maxSelections - selected.size;
      let added = 0;
      for (const sale of paginated) {
        if (!selected.has(sale.id) && added < availableSlots) {
          selected.add(sale.id);
          added++;
        }
      }

      if (added < paginated.length) {
        this.showError(`Limite de ${this.maxSelections} sélections atteinte`);
      }
    }

    this.selectedSaleIds.set(selected);
  }

  isSaleSelected(saleId: string): boolean {
    return this.selectedSaleIds().has(saleId);
  }

  deleteSelectedSales(): void {
    const selectedIds = Array.from(this.selectedSaleIds());

    if (selectedIds.length === 0) {
      this.showError('Veuillez sélectionner au moins une vente');
      return;
    }

    this.showMultipleDeleteModal.set(true);
  }

  closeMultipleDeleteModal(): void {
    this.showMultipleDeleteModal.set(false);
  }

  confirmMultipleDelete(): void {
    const selectedIds = Array.from(this.selectedSaleIds());

    if (selectedIds.length === 0) {
      return;
    }

    this.loading.set(true);
    let completedRequests = 0;
    let successCount = 0;
    let errorCount = 0;

    selectedIds.forEach(saleId => {
      this.salesService.delete(saleId).subscribe({
        next: () => {
          successCount++;
          completedRequests++;
          if (completedRequests === selectedIds.length) {
            this.finishMultipleDelete(successCount, errorCount);
          }
        },
        error: (error) => {
          console.error('Erreur suppression vente:', error);
          errorCount++;
          completedRequests++;
          if (completedRequests === selectedIds.length) {
            this.finishMultipleDelete(successCount, errorCount);
          }
        }
      });
    });
  }

  private finishMultipleDelete(successCount: number, errorCount: number): void {
    // Recharger les rapports
    this.loadReports();

    // Fermer le modal
    this.closeMultipleDeleteModal();

    // Réinitialiser le mode sélection
    this.selectionMode.set(false);
    this.selectedSaleIds.set(new Set());
    this.loading.set(false);

    // Afficher le message de succès
    if (successCount > 0) {
      this.showSuccess(`${successCount} vente(s) supprimée(s) avec succès`);
    }
    if (errorCount > 0) {
      setTimeout(() => {
        this.showError(`Erreur lors de la suppression de ${errorCount} vente(s)`);
      }, 3000);
    }
  }
}
