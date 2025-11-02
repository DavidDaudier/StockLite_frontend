import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeInvoice01,
  hugeSearch01,
  hugeEye,
  hugeCalendar03,
  hugePrinter
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
}

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugeInvoice01,
      hugeSearch01,
      hugeEye,
      hugeCalendar03,
      hugePrinter
    })
  ],
  templateUrl: './sales-history.component.html',
  styleUrl: './sales-history.component.css'
})
export class SalesHistoryComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}/sales`;

  sales = signal<Sale[]>([]);
  filteredSales = signal<Sale[]>([]);
  searchTerm = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  loading = signal<boolean>(false);
  selectedSale = signal<Sale | null>(null);
  showDetailsModal = signal<boolean>(false);

  ngOnInit(): void {
    this.loadSales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSales(): void {
    this.loading.set(true);
    this.http.get<Sale[]>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          // Filtrer seulement les ventes complétées
          const completedSales = sales.filter(s => s.status === 'COMPLETED' || s.status === 'completed');
          this.sales.set(completedSales);
          this.filteredSales.set(completedSales);
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

    // Recherche par terme
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(sale =>
        sale.saleNumber.toLowerCase().includes(term) ||
        sale.customerName?.toLowerCase().includes(term) ||
        sale.customerPhone?.includes(term)
      );
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
  }

  viewDetails(sale: Sale): void {
    // Charger les détails complets avec les items
    this.http.get<Sale>(`${this.apiUrl}/${sale.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullSale) => {
          this.selectedSale.set(fullSale);
          this.showDetailsModal.set(true);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des détails:', error);
          alert('Impossible de charger les détails de la vente');
        }
      });
  }

  closeModal(): void {
    this.showDetailsModal.set(false);
    this.selectedSale.set(null);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 2
    }).format(amount).replace('HTG', 'Gdes');
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

  getTotalItems(sale: Sale): number {
    if (!sale.items) return 0;
    return sale.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  printReceipt(sale: Sale): void {
    window.print();
  }
}
