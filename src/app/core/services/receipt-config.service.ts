import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ReceiptConfig {
  id?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  taxId?: string;
  receiptFooter?: string;
  footerMessage?: string;
  showLogo: boolean;
  logoUrl?: string;
  paperWidth: number; // en mm (58mm ou 80mm généralement)
  fontSize: number;
  showBarcode: boolean;
  showQRCode: boolean;
  showProductDetails?: boolean;
  showPaymentMethod?: boolean;
  showTax?: boolean;
  autoOpenCashDrawer: boolean;
  printCopies: number;
  // Mobile POS properties
  mobilePosName?: string;
  mobilePinCode?: string;
  mobileEnabled?: boolean;
  mobileAllowOffline?: boolean;
  mobileAutoSync?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptConfigService {
  private apiUrl = `${environment.apiUrl}/received-sheet-config`;
  private configSubject = new BehaviorSubject<ReceiptConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  private defaultConfig: ReceiptConfig = {
    companyName: 'Ma Boutique',
    paperWidth: 80,
    fontSize: 12,
    showLogo: false,
    showBarcode: true,
    showQRCode: false,
    showProductDetails: true,
    showPaymentMethod: true,
    showTax: true,
    autoOpenCashDrawer: false,
    printCopies: 1,
    mobileEnabled: false
  };

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  loadConfig(): void {
    this.http.get<ReceiptConfig>(`${this.apiUrl}/active`).subscribe({
      next: (config) => {
        this.configSubject.next(config);
      },
      error: (error) => {
        console.error('[ReceiptConfigService] Erreur lors du chargement:', error);
        // Utiliser la config par défaut en cas d'erreur
        this.configSubject.next(this.defaultConfig);
      }
    });
  }

  getConfig(): Observable<ReceiptConfig | null> {
    return this.config$;
  }

  getCurrentConfig(): ReceiptConfig {
    return this.configSubject.value || this.defaultConfig;
  }

  getActive(): Observable<ReceiptConfig> {
    return this.http.get<ReceiptConfig>(`${this.apiUrl}/active`).pipe(
      tap((config) => {
        this.configSubject.next(config);
      })
    );
  }

  saveConfig(config: ReceiptConfig): Observable<ReceiptConfig> {
    return this.http.post<ReceiptConfig>(this.apiUrl, config).pipe(
      tap((savedConfig) => {
        this.configSubject.next(savedConfig);
      })
    );
  }

  updateActive(config: Partial<ReceiptConfig>): Observable<ReceiptConfig> {
    return this.http.patch<ReceiptConfig>(`${this.apiUrl}/active`, config).pipe(
      tap((updatedConfig) => {
        this.configSubject.next(updatedConfig);
      })
    );
  }

  updateConfig(config: Partial<ReceiptConfig>): Observable<ReceiptConfig> {
    return this.updateActive(config);
  }

  resetToDefault(): void {
    this.configSubject.next(this.defaultConfig);
  }
}
