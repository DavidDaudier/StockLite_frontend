import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval, startWith, switchMap } from 'rxjs';

import { SidebarComponent } from "./../../layouts/sidebar/sidebar.component";
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatsCardComponent } from '../../shared/components/stats-card/stats-card.component';
import { SalesService } from '../../core/services/sales.service';
import { ProductsService } from '../../core/services/products.service';
import { ReportsService, DailyReport, TopProduct, InventoryReport } from '../../core/services/reports.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { Sale } from '../../core/models/sale.model';
import { Product } from '../../core/models/product.model';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface DashboardStats {
  todayRevenue: number;
  todaySales: number;
  totalProducts: number;
  lowStockCount: number;
}

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, PosHeaderComponent, PageHeaderComponent, StatsCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  @ViewChild('salesTrendChart') salesTrendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentMethodChart') paymentMethodChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsChart') topProductsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('recentSalesChart') recentSalesChartRef!: ElementRef<HTMLCanvasElement>;

  private salesTrendChart?: Chart;
  private paymentMethodChart?: Chart;
  private topProductsChart?: Chart;
  private recentSalesChart?: Chart;

  // Stats
  stats: DashboardStats = {
    todayRevenue: 0,
    todaySales: 0,
    totalProducts: 0,
    lowStockCount: 0
  };

  // Data
  recentSales: Sale[] = [];
  topProducts: TopProduct[] = [];
  lowStockProducts: Product[] = [];
  dailyReport: DailyReport | null = null;

  // Period Filter
  selectedPeriod: PeriodType = 'today';
  customDateRange: DateRange = {
    startDate: '',
    endDate: ''
  };
  showCustomDatePicker = false;

  // UI State
  loading = true;
  currentTime = new Date();

  constructor(
    private salesService: SalesService,
    private productsService: ProductsService,
    private reportsService: ReportsService,
    private wsService: WebSocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRealtimeUpdates();
    this.startClock();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront initialisés après le chargement des données
  }

  ngOnDestroy(): void {
    if (this.salesTrendChart) this.salesTrendChart.destroy();
    if (this.paymentMethodChart) this.paymentMethodChart.destroy();
    if (this.topProductsChart) this.topProductsChart.destroy();
    if (this.recentSalesChart) this.recentSalesChart.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPeriodChange(period: PeriodType): void {
    this.selectedPeriod = period;
    this.showCustomDatePicker = period === 'custom';

    if (period !== 'custom') {
      this.loadDashboardData();
    }
  }

  onCustomDateApply(): void {
    if (this.customDateRange.startDate && this.customDateRange.endDate) {
      this.loadDashboardData();
    }
  }

  getDateRange(): { startDate: Date, endDate: Date } {
    const now = new Date();
    let endDate = new Date(now);
    let startDate = new Date(now);

    switch (this.selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (this.customDateRange.startDate && this.customDateRange.endDate) {
          // Parser les dates en temps local pour éviter les problèmes de fuseau horaire
          const [startYear, startMonth, startDay] = this.customDateRange.startDate.split('-').map(Number);
          const [endYear, endMonth, endDay] = this.customDateRange.endDate.split('-').map(Number);

          startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
          endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        }
        break;
    }

    return { startDate, endDate };
  }

  loadDashboardData(): void {
    this.loading = true;

    // Get date range based on selected period
    const { startDate, endDate } = this.getDateRange();
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('📅 Loading dashboard data for period:', this.selectedPeriod);
    console.log('  - Start:', startDateStr);
    console.log('  - End:', endDateStr);

    // Load sales stats for the period
    this.salesService.getStats(undefined, startDateStr, endDateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats.todayRevenue = stats.totalRevenue;
          this.stats.todaySales = stats.totalSales;
          console.log('📊 Stats loaded:', stats);
        },
        error: (error) => console.error('Error loading stats:', error)
      });

    // Load recent sales for the period
    this.salesService.getAll(undefined, startDateStr, endDateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          this.recentSales = sales.slice(0, 10).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          console.log('📦 Recent sales loaded:', this.recentSales.length);
        },
        error: (error) => console.error('Error loading recent sales:', error)
      });

    // Load top products for the period
    this.reportsService.getTopProducts(startDateStr, endDateStr, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.topProducts = products;
          console.log('🏆 Top products loaded:', this.topProducts.length);
        },
        error: (error) => console.error('Error loading top products:', error)
      });

    // Load inventory report
    this.reportsService.getInventoryReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.stats.totalProducts = report.totalProducts;
          this.stats.lowStockCount = report.lowStockProducts.length;
        },
        error: (error) => console.error('Error loading inventory:', error)
      });

    // Load low stock products (no date filtering for inventory)
    this.productsService.getLowStock()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.lowStockProducts = products.slice(0, 5);
          this.loading = false;

          // Initialiser les graphiques après le chargement des données
          setTimeout(() => {
            this.updateAllCharts();
          }, 100);
        },
        error: (error) => {
          console.error('Error loading low stock products:', error);
          this.loading = false;
        }
      });
  }

  updateAllCharts(): void {
    console.log('📊 Updating all charts...');
    this.initializeSalesTrendChart();
    this.initializePaymentMethodChart();
    this.initializeTopProductsChart();
    this.initializeRecentSalesChart();
  }

  setupRealtimeUpdates(): void {
    // Listen for new sales via WebSocket
    this.wsService.onNewSale()
      .pipe(takeUntil(this.destroy$))
      .subscribe((sale: Sale) => {
        console.log('📊 New sale received in dashboard:', sale);

        // Add to recent sales
        this.recentSales.unshift(sale);
        if (this.recentSales.length > 10) {
          this.recentSales.pop();
        }

        // Update stats
        this.stats.todaySales++;
        const saleTotal = typeof sale.total === 'number' ? sale.total : parseFloat(sale.total) || 0;
        this.stats.todayRevenue += saleTotal;

        // Show notification
        this.showNotification(`New sale: ${this.formatCurrency(sale.total)}`);
      });

    // Listen for product updates
    this.wsService.onProductUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Reload low stock products
        this.productsService.getLowStock()
          .pipe(takeUntil(this.destroy$))
          .subscribe((products) => {
            this.lowStockProducts = products.slice(0, 5);
          });
      });

    // Listen for stock alerts
    this.wsService.onStockAlert()
      .pipe(takeUntil(this.destroy$))
      .subscribe((alert: any) => {
        console.log('⚠️ Stock alert:', alert);
        this.showNotification(`Stock Alert: ${alert.productName} - ${alert.quantity} remaining`, 'warning');
      });

    // Auto-refresh data every 5 minutes
    interval(5 * 60 * 1000)
      .pipe(
        startWith(0),
        switchMap(() => this.reportsService.getDailyReport()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (report) => {
          this.dailyReport = report;
          this.stats.todayRevenue = report.totalRevenue;
          this.stats.todaySales = report.totalSales;
        }
      });
  }

  startClock(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
      });
  }

  showNotification(message: string, type: 'success' | 'warning' = 'success'): void {
    // Simple notification - can be enhanced with a toast library
    console.log(`${type === 'success' ? '✅' : '⚠️'} ${message}`);
  }

  formatCurrency(amount: number): string {
    // Utiliser un format personnalisé pour Gourdes (Gdes)
    return new Intl.NumberFormat('fr-HT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount) + ' Gdes';
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

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'cash': 'Espèces',
      'card': 'Carte',
      'mobile_money': 'Mobile Money',
      'bank_transfer': 'Virement'
    };
    return labels[method] || method;
  }

  navigateToProducts(): void {
    this.router.navigate(['/admin/products']);
  }

  navigateToStocks(): void {
    this.router.navigate(['/admin/stocks']);
  }

  navigateToReports(): void {
    this.router.navigate(['/admin/reports']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Helper pour formater une date en YYYY-MM-DD en temps local
  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Obtenir le label de période pour l'affichage
  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'today': return 'Aujourd\'hui';
      case 'week': return 'Hebdomadaire';
      case 'month': return 'Mensuel';
      case 'year': return 'Annuel';
      case 'custom': return 'Période personnalisée';
      default: return 'Aujourd\'hui';
    }
  }

  initializeSalesTrendChart(): void {
    if (!this.salesTrendChartRef) return;

    const { startDate, endDate } = this.getDateRange();
    const days: string[] = [];
    const revenues: number[] = [];

    // Calculer le nombre de jours dans la période
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const numPoints = Math.min(daysDiff, 30); // Maximum 30 points sur le graphique

    // Grouper les ventes par jour
    const salesByDay = new Map<string, number>();
    this.recentSales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const dateKey = this.getLocalDateKey(saleDate);
      // Convertir sale.total en nombre pour éviter la concaténation de strings
      const saleTotal = typeof sale.total === 'number' ? sale.total : parseFloat(sale.total) || 0;
      salesByDay.set(dateKey, (salesByDay.get(dateKey) || 0) + saleTotal);
    });

    // Générer les labels et données pour le graphique
    for (let i = numPoints - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateKey = this.getLocalDateKey(date);

      days.push(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
      revenues.push(salesByDay.get(dateKey) || 0);
    }

    const ctx = this.salesTrendChartRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.salesTrendChart) {
        this.salesTrendChart.destroy();
      }

      this.salesTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Chiffre d\'affaires',
            data: revenues,
            borderColor: '#14B8A6',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y ?? 0;
                  return `CA: ${this.formatCurrency(value)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              min: 0, // Force l'axe Y à commencer à 0
              ticks: {
                callback: (value) => {
                  return this.formatCurrency(Number(value));
                }
              }
            }
          }
        }
      });
    }
  }

  initializePaymentMethodChart(): void {
    if (!this.paymentMethodChartRef) return;

    // Agréger les ventes par méthode de paiement
    const paymentMethodMap = new Map<string, number>();
    this.recentSales.forEach(sale => {
      const method = sale.paymentMethod || 'cash';
      // Convertir sale.total en nombre pour éviter la concaténation de strings
      const saleTotal = typeof sale.total === 'number' ? sale.total : parseFloat(sale.total) || 0;
      paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + saleTotal);
    });

    // Préparer les données pour le graphique
    const labels = Array.from(paymentMethodMap.keys()).map(method => {
      const labels: Record<string, string> = {
        'cash': 'Espèces',
        'card': 'Carte',
        'mobile_money': 'Mobile Money',
        'bank_transfer': 'Virement'
      };
      return labels[method] || method;
    });
    const data = Array.from(paymentMethodMap.values());

    const ctx = this.paymentMethodChartRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.paymentMethodChart) {
        this.paymentMethodChart.destroy();
      }

      this.paymentMethodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: [
              '#10B981', // green
              '#3B82F6', // blue
              '#8B5CF6', // purple
              '#F59E0B'  // orange
            ],
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  return `${label}: ${this.formatCurrency(value)}`;
                }
              }
            }
          }
        }
      });
    }
  }

  initializeTopProductsChart(): void {
    if (!this.topProductsChartRef) return;

    const ctx = this.topProductsChartRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.topProductsChart) {
        this.topProductsChart.destroy();
      }

      const labels = this.topProducts.map(p => p.productName);
      const data = this.topProducts.map(p => p.totalRevenue);

      this.topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Revenu',
            data: data,
            backgroundColor: '#14B8A6',
            borderColor: '#14B8A6',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed.x ?? 0;
                  return `Revenu: ${this.formatCurrency(value)}`;
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: (value) => {
                  return this.formatCurrency(Number(value));
                }
              }
            }
          }
        }
      });
    }
  }

  initializeRecentSalesChart(): void {
    if (!this.recentSalesChartRef || this.recentSales.length === 0) return;

    const ctx = this.recentSalesChartRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.recentSalesChart) {
        this.recentSalesChart.destroy();
      }

      // Prendre les 5 ventes les plus récentes
      const recentFive = this.recentSales.slice(0, 5);
      const labels = recentFive.map((sale, index) =>
        `Vente #${index + 1}`
      );
      // Convertir sale.total en nombre pour éviter les problèmes avec Chart.js
      const data = recentFive.map(sale =>
        typeof sale.total === 'number' ? sale.total : parseFloat(sale.total) || 0
      );
      const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
      ];

      this.recentSalesChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors,
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 10,
                font: {
                  size: 11
                }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed.r || 0;
                  return `${label}: ${this.formatCurrency(value)}`;
                }
              }
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              ticks: {
                callback: (value) => {
                  return this.formatCurrency(Number(value));
                }
              }
            }
          }
        }
      });
    }
  }
}
