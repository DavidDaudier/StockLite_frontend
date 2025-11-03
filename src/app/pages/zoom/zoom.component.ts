import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval } from 'rxjs';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { UsersService } from '../../core/services/users.service';
import { SalesService } from '../../core/services/sales.service';
import { User } from '../../core/models/user.model';
import { Sale } from '../../core/models/sale.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeVideoReplay,
  hugeUser,
  hugeSearch01,
  hugeCalendar03,
  hugeMoneyBag02,
  hugeShoppingCart01,
  hugeTime04,
  hugeCheckmarkCircle04,
  hugeEye,
  hugeArrowDown01,
  hugeArrowUp01,
  hugeUserMultiple
} from '@ng-icons/huge-icons';

interface SellerActivity {
  seller: User;
  connectionTime?: Date;
  disconnectionTime?: Date;
  sales: Sale[];
  totalRevenue: number;
  totalSales: number;
  isOnline: boolean;
  lastActivity?: Date;
}

@Component({
  selector: 'app-zoom',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugeVideoReplay,
      hugeUser,
      hugeSearch01,
      hugeCalendar03,
      hugeMoneyBag02,
      hugeShoppingCart01,
      hugeTime04,
      hugeCheckmarkCircle04,
      hugeEye,
      hugeArrowDown01,
      hugeArrowUp01,
      hugeUserMultiple
    })
  ],
  templateUrl: './zoom.component.html',
  styleUrls: ['./zoom.component.css']
})
export class ZoomComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data signals
  sellers = signal<User[]>([]);
  allSales = signal<Sale[]>([]);
  sellerActivities = signal<SellerActivity[]>([]);

  // Filters
  selectedDate = signal<string>('');
  searchTerm = signal<string>('');
  selectedSellerId = signal<string>('all');

  // UI State
  loading = signal<boolean>(false);
  expandedSellerId = signal<string | null>(null);
  autoRefresh = signal<boolean>(true);

  // Computed
  filteredActivities = computed(() => {
    let activities = this.sellerActivities();

    if (this.selectedSellerId() !== 'all') {
      activities = activities.filter(a => a.seller.id === this.selectedSellerId());
    }

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      activities = activities.filter(a =>
        a.seller.fullName?.toLowerCase().includes(term) ||
        a.seller.username.toLowerCase().includes(term)
      );
    }

    return activities;
  });

  totalStats = computed(() => {
    const activities = this.filteredActivities();
    return {
      totalSellers: activities.length,
      onlineSellers: activities.filter(a => a.isOnline).length,
      totalSales: activities.reduce((sum, a) => sum + a.totalSales, 0),
      totalRevenue: activities.reduce((sum, a) => sum + a.totalRevenue, 0)
    };
  });

  constructor(
    private usersService: UsersService,
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    this.initializeDate();
    this.loadData();

    // Auto-refresh every 30 seconds if enabled
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh()) {
          this.loadData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeDate(): void {
    const today = new Date();
    this.selectedDate.set(this.formatDateForInput(today));
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onDateChange(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Load all sellers
    this.usersService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        const sellers = users.filter(u => u.role === 'seller');
        this.sellers.set(sellers);

        // Load sales for selected date
        const [year, month, day] = this.selectedDate().split('-').map(Number);
        const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

        const startDateStr = this.formatDateToString(startDate);
        const endDateStr = this.formatDateToString(endDate);

        this.salesService.getAll(undefined, startDateStr, endDateStr)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (sales) => {
              this.allSales.set(sales);
              this.calculateActivities(sellers, sales);
              this.loading.set(false);
            },
            error: (error) => {
              console.error('Error loading sales:', error);
              this.loading.set(false);
            }
          });
      },
      error: (error) => {
        console.error('Error loading sellers:', error);
        this.loading.set(false);
      }
    });
  }

  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  calculateActivities(sellers: User[], sales: Sale[]): void {
    const activities: SellerActivity[] = sellers.map(seller => {
      // Filter sales for this seller
      const sellerSales = sales.filter(s => s.sellerId === seller.id || s.seller?.id === seller.id);

      // Calculate connection time (first sale of the day)
      const connectionTime = sellerSales.length > 0
        ? new Date(Math.min(...sellerSales.map(s => new Date(s.createdAt).getTime())))
        : undefined;

      // Calculate disconnection time (last sale of the day)
      const disconnectionTime = sellerSales.length > 0
        ? new Date(Math.max(...sellerSales.map(s => new Date(s.createdAt).getTime())))
        : undefined;

      // Calculate total revenue
      const totalRevenue = sellerSales.reduce((sum, s) => sum + s.total, 0);

      // Check if online (has activity in last 5 minutes for today)
      const now = new Date();
      const isToday = this.selectedDate() === this.formatDateForInput(now);
      const isOnline = isToday && disconnectionTime
        ? (now.getTime() - disconnectionTime.getTime()) < 5 * 60 * 1000
        : false;

      return {
        seller,
        connectionTime,
        disconnectionTime,
        sales: sellerSales,
        totalRevenue,
        totalSales: sellerSales.length,
        isOnline,
        lastActivity: disconnectionTime
      };
    });

    // Sort by total revenue descending
    activities.sort((a, b) => b.totalRevenue - a.totalRevenue);

    this.sellerActivities.set(activities);
  }

  toggleExpand(sellerId: string): void {
    if (this.expandedSellerId() === sellerId) {
      this.expandedSellerId.set(null);
    } else {
      this.expandedSellerId.set(sellerId);
    }
  }

  isExpanded(sellerId: string): boolean {
    return this.expandedSellerId() === sellerId;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' Gds';
  }

  formatTime(date: Date | undefined): string {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDuration(start?: Date, end?: Date): string {
    if (!start || !end) return '--';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.set(!this.autoRefresh());
  }

  getTotalQuantity(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
