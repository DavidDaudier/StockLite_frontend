import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { DashboardService } from '../../../core/services/dashboard.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import {
  hugeDollarCircle,
  hugeShoppingCart01,
  hugePackageDelivered,
  hugeTradeUp,
  hugeAlertCircle,
  hugeEye,
  hugeViewOff
} from '@ng-icons/huge-icons';

// Register Chart.js components
Chart.register(...registerables);

interface DailyStat {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
  change?: string;
  changeType?: 'up' | 'down';
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  category: string;
}

interface LowStockProduct {
  name: string;
  currentStock: number;
  minStock: number;
  category: string;
}

interface SalesByHour {
  hour: string;
  amount: number;
}

import { CurrencyService } from '../../../services/currency.service';

import { GdesCurrencyPipe } from '../../../pipes/currency/currency.pipe';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, PosHeaderComponent, NgIcon, GdesCurrencyPipe],
  viewProviders: [
    provideIcons({
      hugeDollarCircle,
      hugeShoppingCart01,
      hugePackageDelivered,
      hugeTradeUp,
      hugeAlertCircle,
      hugeEye,
      hugeViewOff
    })
  ],
  templateUrl: './seller-dashboard.component.html',
  styleUrl: './seller-dashboard.component.css'
})
export class SellerDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  @ViewChild('paymentMethodChart') paymentMethodChartRef!: ElementRef<HTMLCanvasElement>;
  private paymentMethodChart?: Chart;

  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  private salesChart?: Chart;

  private dashboardService = inject(DashboardService);
  public currencyService: CurrencyService = inject(CurrencyService);

  // Statistiques du jour
  dailyStats: DailyStat[] = [
    {
      label: 'Chiffre d\'affaires',
      value: 0,
      icon: 'hugeDollarCircle',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+12.5%',
      changeType: 'up'
    },
    {
      label: 'Transactions',
      value: 0,
      icon: 'hugeShoppingCart01',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+8.2%',
      changeType: 'up'
    },
    {
      label: 'Produits vendus',
      value: 0,
      icon: 'hugePackageDelivered',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+15.3%',
      changeType: 'up'
    },
    {
      label: 'Panier moyen',
      value: 0,
      icon: 'hugeTradeUp',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+5.1%',
      changeType: 'up'
    }
  ];

  // Produits les plus vendus
  topProducts: TopProduct[] = [];

  // Produits en stock faible
  lowStockProducts: LowStockProduct[] = [];

  // Ventes par heure
  salesByHour: SalesByHour[] = [];

  loading = true;
  showStats = true;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront initialisés après le chargement des données
  }

  ngOnDestroy(): void {
    if (this.paymentMethodChart) {
      this.paymentMethodChart.destroy();
    }
    if (this.salesChart) {
      this.salesChart.destroy();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Charger les données réelles depuis le backend
    forkJoin({
      dailyReport: this.dashboardService.getDailyReport(),
      inventoryReport: this.dashboardService.getInventoryReport()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ dailyReport, inventoryReport }) => {
          // Mettre à jour les statistiques du jour
          this.dailyStats[0].value = dailyReport.totalRevenue;
          this.dailyStats[1].value = dailyReport.totalSales;

          // Calculer le nombre total de produits vendus
          const totalItemsSold = dailyReport.sales.reduce((total, sale: any) => {
            return total + (sale.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0);
          }, 0);
          this.dailyStats[2].value = totalItemsSold;
          this.dailyStats[3].value = dailyReport.averageSaleValue;

          // Extraire les top produits des ventes
          this.extractTopProducts(dailyReport.sales);

          // Générer les ventes par heure
          this.generateSalesByHour(dailyReport.sales);

          // Charger les produits en stock faible
          this.lowStockProducts = inventoryReport.lowStockProducts.map(p => ({
            name: p.name,
            currentStock: p.quantity,
            minStock: p.minStock,
            category: p.category
          }));

          this.loading = false;

          // Initialiser les graphiques après le chargement des données
          setTimeout(() => {
            this.initializePaymentMethodChart(dailyReport.sales);
            this.initializeSalesChart();
          }, 100);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données:', error);
          this.loading = false;
          // Garder les valeurs par défaut en cas d'erreur
        }
      });
  }

  extractTopProducts(sales: any[]): void {
    // Agréger les produits vendus
    const productMap = new Map<string, { name: string; quantity: number; revenue: number; category: string }>();

    sales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productMap.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.subtotal,
            category: item.product?.category || 'Non catégorisé'
          });
        }
      });
    });

    // Trier par quantité et prendre les 5 premiers
    this.topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  generateSalesByHour(sales: any[]): void {
    // Initialiser les heures de 0h à 23h
    const hourMap = new Map<number, number>();
    for (let hour = 0; hour <= 23; hour++) {
      hourMap.set(hour, 0);
    }

    // Agréger les ventes par heure
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const hour = saleDate.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + sale.total);
    });

    // Convertir en tableau pour l'affichage
    // Filtrer pour n'afficher que les heures avec des ventes ou une plage raisonnable (ex: 8h-20h) si vide
    // Pour l'instant on affiche tout pour le debug
    this.salesByHour = Array.from(hourMap.entries()).map(([hour, amount]) => ({
      hour: `${hour.toString().padStart(2, '0')}h`,
      amount: amount
    }));
  }

  formatCurrency(amount: number): string {
    return this.currencyService.formatAmount(amount);
  }

  getMaxSales(): number {
    return Math.max(...this.salesByHour.map(s => s.amount));
  }

  getBarHeight(amount: number): number {
    const max = this.getMaxSales();
    return (amount / max) * 100;
  }

  getStockStatusClass(product: LowStockProduct): string {
    if (product.currentStock === 0) {
      return 'text-red-600 bg-red-50';
    } else if (product.currentStock <= product.minStock / 2) {
      return 'text-orange-600 bg-orange-50';
    }
    return 'text-yellow-600 bg-yellow-50';
  }

  initializePaymentMethodChart(sales: any[]): void {
    if (!this.paymentMethodChartRef) return;

    // Agréger les ventes par méthode de paiement
    const paymentMethodMap = new Map<string, number>();
    sales.forEach(sale => {
      const method = sale.paymentMethod || 'cash';
      paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + 1);
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

    // Créer le graphique
    const ctx = this.paymentMethodChartRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.paymentMethodChart) {
        this.paymentMethodChart.destroy();
      }

      this.paymentMethodChart = new Chart(ctx, {
        type: 'pie',
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
                  const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  initializeSalesChart(): void {
    if (!this.salesChartRef) return;

    const ctx = this.salesChartRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.salesChart) {
        this.salesChart.destroy();
      }

      // Préparer les données
      const labels = this.salesByHour.map(s => s.hour);
      const data = this.salesByHour.map(s => s.amount);

      // Créer un dégradé pour les barres
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(20, 184, 166, 0.8)');   // teal-500
      gradient.addColorStop(1, 'rgba(20, 184, 166, 0.2)');

      this.salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Ventes',
            data: data,
            backgroundColor: gradient,
            borderColor: '#14B8A6',
            borderWidth: 2
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
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y;
                  if (value !== null && value !== undefined) {
                    return `Montant: ${this.formatCurrency(value)}`;
                  }
                  return 'Montant: 0';
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                font: {
                  size: 11
                },
                callback: (value) => {
                  if (typeof value === 'number') {
                    return this.currencyService.getCurrencySymbol() + ' ' + value;
                  }
                  return value;
                }
              },
              title: {
                display: true,
                text: 'Montant des ventes',
                font: {
                  size: 12,
                  weight: 'bold'
                },
                color: '#6B7280'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                maxRotation: 45,
                minRotation: 0
              },
              title: {
                display: true,
                text: 'Heures de la journée',
                font: {
                  size: 12,
                  weight: 'bold'
                },
                color: '#6B7280'
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    }
  }
}
