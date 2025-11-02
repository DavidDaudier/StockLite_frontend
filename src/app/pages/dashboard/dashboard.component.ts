import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval, startWith, switchMap } from 'rxjs';

import { SidebarComponent } from "./../../layouts/sidebar/sidebar.component";
import { SalesService } from '../../core/services/sales.service';
import { ProductsService } from '../../core/services/products.service';
import { ReportsService, DailyReport, TopProduct, InventoryReport } from '../../core/services/reports.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { Sale } from '../../core/models/sale.model';
import { Product } from '../../core/models/product.model';

interface DashboardStats {
  todayRevenue: number;
  todaySales: number;
  totalProducts: number;
  lowStockCount: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load daily report
    this.reportsService.getDailyReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.dailyReport = report;
          this.stats.todayRevenue = report.totalRevenue;
          this.stats.todaySales = report.totalSales;
        },
        error: (error) => console.error('Error loading daily report:', error)
      });

    // Load recent sales
    this.salesService.getTodaySales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          this.recentSales = sales.slice(0, 10).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        },
        error: (error) => console.error('Error loading recent sales:', error)
      });

    // Load top products
    this.reportsService.getTopProducts(undefined, undefined, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.topProducts = products;
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

    // Load low stock products
    this.productsService.getLowStock()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.lowStockProducts = products.slice(0, 5);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading low stock products:', error);
          this.loading = false;
        }
      });
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
        this.stats.todayRevenue += sale.total;

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
}
