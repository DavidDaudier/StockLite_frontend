// Code à ajouter dans dashboard.component.ts

// 1. Ajouter cette propriété avec les autres @ViewChild
@ViewChild('salesTrendChart') salesTrendChartRef!: ElementRef<HTMLCanvasElement>;
private salesTrendChartInstance: Chart | null = null;

// 2. Remplacer la méthode initializeSalesTrendChart() par celle-ci:
initializeSalesTrendChart(): void {
  this.salesChartData = [];

  switch (this.selectedPeriod) {
    case 'today':
      this.generateHourlyData();
      break;
    case 'week':
      this.generateDailyData(7);
      break;
    case 'month':
    case 'custom':
      this.generateWeeklyData();
      break;
    default:
      this.generateHourlyData();
  }

  // Créer le graphique Chart.js
  this.createSalesTrendChart();
}

// 3. Ajouter cette nouvelle méthode:
private createSalesTrendChart(): void {
  if (!this.salesTrendChartRef) return;

  // Détruire l'ancien graphique s'il existe
  if (this.salesTrendChartInstance) {
    this.salesTrendChartInstance.destroy();
  }

  const ctx = this.salesTrendChartRef.nativeElement.getContext('2d');
  if (!ctx) return;

  // Préparer les données
  const labels = this.salesChartData.map(d => d.label);
  const data = this.salesChartData.map(d => d.amount);

  // Couleurs dynamiques pour les barres
  const backgroundColors = this.salesChartData.map((_, i) => {
    const colors = [
      'rgba(20, 184, 166, 0.8)',  // teal
      'rgba(59, 130, 246, 0.8)',  // blue
      'rgba(168, 85, 247, 0.8)',  // purple
      'rgba(236, 72, 153, 0.8)',  // pink
      'rgba(249, 115, 22, 0.8)',  // orange
      'rgba(234, 179, 8, 0.8)',   // yellow
      'rgba(34, 197, 94, 0.8)'    // green
    ];
    return colors[i % 7];
  });

  const borderColors = this.salesChartData.map((_, i) => {
    const colors = [
      'rgba(20, 184, 166, 1)',
      'rgba(59, 130, 246, 1)',
      'rgba(168, 85, 247, 1)',
      'rgba(236, 72, 153, 1)',
      'rgba(249, 115, 22, 1)',
      'rgba(234, 179, 8, 1)',
      'rgba(34, 197, 94, 1)'
    ];
    return colors[i % 7];
  });

  // Créer le graphique
  this.salesTrendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventes',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
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
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              // Formater avec le pipe gdesCurrency
              return `Montant: ${this.formatCurrency(value)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: true,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            color: '#6B7280',
            font: {
              size: 11
            },
            callback: (value) => {
              return this.formatCurrency(Number(value));
            }
          },
          title: {
            display: true,
            text: 'Montant des ventes',
            color: '#4B5563',
            font: {
              size: 13,
              weight: 'bold'
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: true,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            color: '#6B7280',
            font: {
              size: 11,
              weight: '500'
            }
          },
          title: {
            display: true,
            text: this.getXAxisLabel(),
            color: '#4B5563',
            font: {
              size: 13,
              weight: 'bold'
            }
          }
        }
      }
    }
  });
}

// 4. Ajouter ces méthodes helper:
private formatCurrency(value: number): string {
  // Utiliser le même format que le pipe gdesCurrency
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    minimumFractionDigits: 2
  }).format(value);
}

private getXAxisLabel(): string {
  switch (this.selectedPeriod) {
    case 'today':
      return 'Heures de la journée';
    case 'week':
      return 'Jours de la semaine';
    case 'month':
    case 'custom':
      return 'Semaines';
    default:
      return '';
  }
}

// 5. Modifier la méthode ngOnDestroy pour détruire le graphique:
ngOnDestroy(): void {
  if (this.salesTrendChartInstance) {
    this.salesTrendChartInstance.destroy();
  }
  // ... reste du code existant
}
