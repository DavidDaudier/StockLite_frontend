import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LowStockItem {
  id: string;
  name: string;
  barcode?: string;
  currentStock: number;
  minStockLevel: number;
  categoryName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LowStockMonitorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/products/low-stock`;

  private lowStockItems$ = new BehaviorSubject<LowStockItem[]>([]);
  private isMonitoring = false;
  private readonly CHECK_INTERVAL_MS = 300000; // Vérifier toutes les 5 minutes

  constructor() {}

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Vérifier immédiatement
    this.checkLowStock();

    // Puis vérifier périodiquement
    interval(this.CHECK_INTERVAL_MS)
      .pipe(
        takeWhile(() => this.isMonitoring),
        switchMap(() => this.http.get<LowStockItem[]>(this.apiUrl))
      )
      .subscribe({
        next: (items) => {
          this.lowStockItems$.next(items);
          if (items.length > 0) {
            console.log(`[LowStockMonitor] ${items.length} produit(s) en stock faible`);
          }
        },
        error: (error) => {
          console.error('[LowStockMonitor] Erreur lors de la vérification:', error);
        }
      });
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    this.lowStockItems$.next([]);
  }

  private checkLowStock(): void {
    this.http.get<LowStockItem[]>(this.apiUrl).subscribe({
      next: (items) => {
        this.lowStockItems$.next(items);
      },
      error: (error) => {
        console.error('[LowStockMonitor] Erreur lors de la vérification initiale:', error);
      }
    });
  }

  getLowStockItems() {
    return this.lowStockItems$.asObservable();
  }

  getCurrentLowStockItems(): LowStockItem[] {
    return this.lowStockItems$.value;
  }
}
