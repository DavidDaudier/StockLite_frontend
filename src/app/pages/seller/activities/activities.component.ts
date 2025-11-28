import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { SalesService } from '../../../core/services/sales.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sale } from '../../../core/models/sale.model';
import { GdesCurrencyPipe } from '../../../pipes/currency/currency.pipe';

interface DateFilter {
  label: string;
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-activities',
  imports: [CommonModule, FormsModule, SidebarComponent, GdesCurrencyPipe],
  templateUrl: './activities.component.html',
  styleUrl: './activities.component.css'
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  sales: Sale[] = [];
  filteredSales: Sale[] = [];

  // Stats
  totalSales = 0;
  totalRevenue = 0;
  averageSale = 0;
  todaySales = 0;
  todayRevenue = 0;

  // Filters
  selectedPeriod = 'today';
  searchQuery = '';
  selectedPaymentMethod = 'all';

  paymentMethods = [
    { value: 'all', label: 'Tous les moyens' },
    { value: 'cash', label: 'Espèces' },
    { value: 'card', label: 'Carte' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'bank_transfer', label: 'Virement' }
  ];

  periods = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'all', label: 'Toutes les périodes' }
  ];

  // UI State
  loading = true;
  expandedSaleId: string | null = null;

  constructor(
    private salesService: SalesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSales(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.loading = false;
      return;
    }

    const dateFilter = this.getDateFilter();

    this.salesService.getAll(
      currentUser.id,
      dateFilter.startDate.toISOString(),
      dateFilter.endDate.toISOString()
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          this.sales = sales.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.filteredSales = [...this.sales];
          this.calculateStats();
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading sales:', error);
          this.loading = false;
        }
      });
  }

  getDateFilter(): DateFilter {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (this.selectedPeriod) {
      case 'today':
        return {
          label: "Aujourd'hui",
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };

      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          label: 'Cette semaine',
          startDate: weekStart,
          endDate: now
        };

      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          label: 'Ce mois',
          startDate: monthStart,
          endDate: now
        };

      case 'all':
      default:
        return {
          label: 'Toutes les périodes',
          startDate: new Date(2020, 0, 1),
          endDate: now
        };
    }
  }

  calculateStats(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Overall stats
    this.totalSales = this.sales.length;
    this.totalRevenue = this.sales.reduce((sum, sale) => sum + sale.total, 0);
    this.averageSale = this.totalSales > 0 ? this.totalRevenue / this.totalSales : 0;

    // Today stats
    const todaySales = this.sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });

    this.todaySales = todaySales.length;
    this.todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  }

  onPeriodChange(): void {
    this.loadSales();
  }

  onPaymentMethodChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.sales];

    // Filter by payment method
    if (this.selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(sale =>
        sale.paymentMethod === this.selectedPaymentMethod
      );
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.customerName?.toLowerCase().includes(query) ||
        sale.customerPhone?.toLowerCase().includes(query) ||
        this.formatCurrency(sale.total).toLowerCase().includes(query)
      );
    }

    this.filteredSales = filtered;
  }

  getPeriodLabel(): string {
    const period = this.periods.find(p => p.value === this.selectedPeriod);
    return period ? period.label : this.selectedPeriod;
  }

  toggleSaleDetails(saleId: string): void {
    this.expandedSaleId = this.expandedSaleId === saleId ? null : saleId;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  formatTime(date: string | Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
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

  getPaymentMethodClass(method: string): string {
    const classes: Record<string, string> = {
      'cash': 'bg-green-100 text-green-700',
      'card': 'bg-blue-100 text-blue-700',
      'mobile_money': 'bg-purple-100 text-purple-700',
      'bank_transfer': 'bg-gray-100 text-gray-700'
    };
    return classes[method] || 'bg-gray-100 text-gray-700';
  }

  getTotalItems(sale: Sale): number {
    return sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }
}
