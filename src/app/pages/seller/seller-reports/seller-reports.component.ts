import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { DashboardService, DailyReport, WeeklyReport, MonthlyReport } from '../../../core/services/dashboard.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeCalendar03,
  hugeFileDownload,
  hugeDollarCircle,
  hugeShoppingCart01
} from '@ng-icons/huge-icons';

import { CurrencyService } from '../../../services/currency.service';

import { GdesCurrencyPipe } from '../../../pipes/currency/currency.pipe';

@Component({
  selector: 'app-seller-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, PosHeaderComponent, NgIcon, GdesCurrencyPipe],
  viewProviders: [
    provideIcons({
      hugeCalendar03,
      hugeFileDownload,
      hugeDollarCircle,
      hugeShoppingCart01
    })
  ],
  templateUrl: './seller-reports.component.html',
  styleUrl: './seller-reports.component.css'
})
export class SellerReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Période sélectionnée
  selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  selectedDate: string = this.getTodayDate();
  selectedMonth: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear();

  // Données
  dailyReport: DailyReport | null = null;
  weeklyReport: WeeklyReport | null = null;
  monthlyReport: MonthlyReport | null = null;

  // UI State
  loading = false;
  errorMessage = '';

  // Liste des mois
  months = [
    { value: 0, label: 'Janvier' },
    { value: 1, label: 'Février' },
    { value: 2, label: 'Mars' },
    { value: 3, label: 'Avril' },
    { value: 4, label: 'Mai' },
    { value: 5, label: 'Juin' },
    { value: 6, label: 'Juillet' },
    { value: 7, label: 'Août' },
    { value: 8, label: 'Septembre' },
    { value: 9, label: 'Octobre' },
    { value: 10, label: 'Novembre' },
    { value: 11, label: 'Décembre' }
  ];

  // Liste des années
  years: number[] = [];

  private dashboardService = inject(DashboardService);
  public currencyService: CurrencyService = inject(CurrencyService);

  constructor() {
    // Générer les 5 dernières années
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.years.push(currentYear - i);
    }
  }

  ngOnInit(): void {
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  changePeriod(period: 'daily' | 'weekly' | 'monthly'): void {
    this.selectedPeriod = period;
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';

    switch (this.selectedPeriod) {
      case 'daily':
        this.loadDailyReport();
        break;
      case 'weekly':
        this.loadWeeklyReport();
        break;
      case 'monthly':
        this.loadMonthlyReport();
        break;
    }
  }

  loadDailyReport(): void {
    this.dashboardService.getDailyReport(this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.dailyReport = report;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur chargement rapport journalier:', error);
          this.errorMessage = 'Erreur lors du chargement du rapport journalier';
          this.loading = false;
        }
      });
  }

  loadWeeklyReport(): void {
    this.dashboardService.getWeeklyReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.weeklyReport = report;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur chargement rapport hebdomadaire:', error);
          this.errorMessage = 'Erreur lors du chargement du rapport hebdomadaire';
          this.loading = false;
        }
      });
  }

  loadMonthlyReport(): void {
    this.dashboardService.getMonthlyReport(this.selectedYear, this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.monthlyReport = report;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur chargement rapport mensuel:', error);
          this.errorMessage = 'Erreur lors du chargement du rapport mensuel';
          this.loading = false;
        }
      });
  }

  onDateChange(): void {
    this.loadDailyReport();
  }

  onMonthChange(): void {
    this.loadMonthlyReport();
  }

  formatCurrency(amount: number): string {
    return this.currencyService.formatAmount(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getPaymentMethodsArray(): Array<{ method: string; count: number; total: number }> {
    if (!this.dailyReport?.paymentMethods) return [];
    return Object.entries(this.dailyReport.paymentMethods).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total
    }));
  }

  getMaxDailyRevenue(): number {
    if (!this.weeklyReport?.dailyBreakdown) return 0;
    return Math.max(...this.weeklyReport.dailyBreakdown.map(d => d.revenue));
  }

  getBarHeight(revenue: number): number {
    const max = this.getMaxDailyRevenue();
    return max > 0 ? (revenue / max) * 100 : 0;
  }

  exportReport(): void {
    // TODO: Implémenter l'export en PDF/Excel
    alert('Fonction d\'export à implémenter');
  }
}
