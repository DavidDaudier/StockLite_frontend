import { Injectable, signal, effect } from '@angular/core';
import { AppInfoService } from './app-info.service';

export type Currency = 'HTG' | 'USD';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  currencies: Record<Currency, CurrencyInfo> = {
    HTG: {
      code: 'HTG',
      symbol: 'HTG',
      name: 'Gourdes'
    },
    USD: {
      code: 'USD',
      symbol: '$',
      name: 'Dollars US'
    }
  };

  // Signal pour la monnaie sélectionnée
  selectedCurrency = signal<Currency>('HTG');

  constructor(private appInfoService: AppInfoService) {
    // Synchroniser avec AppInfo
    effect(() => {
      const appInfo = this.appInfoService.appInfo();
      if (appInfo && appInfo.currency) {
        // Cast sécurisé car on sait que c'est une Currency valide ou string
        const currency = appInfo.currency as Currency;
        if (this.currencies[currency]) {
          this.selectedCurrency.set(currency);
        }
      }
    }, { allowSignalWrites: true });
  }

  /**
   * Change la monnaie sélectionnée et met à jour le backend
   */
  setCurrency(currency: Currency): void {
    this.selectedCurrency.set(currency);
    
    // Mettre à jour le backend via AppInfoService
    const currentInfo = this.appInfoService.appInfo();
    if (currentInfo && currentInfo.id) {
      this.appInfoService.update(currentInfo.id, { currency }).subscribe({
        error: (err) => console.error('Failed to persist currency:', err)
      });
    }
  }

  /**
   * Récupère la monnaie actuelle
   */
  getCurrency(): Currency {
    return this.selectedCurrency();
  }

  /**
   * Récupère les informations de la monnaie actuelle
   */
  getCurrentCurrencyInfo(): CurrencyInfo {
    return this.currencies[this.selectedCurrency()];
  }

  /**
   * Récupère le symbole de la monnaie actuelle
   */
  getCurrencySymbol(): string {
    return this.currencies[this.selectedCurrency()].symbol;
  }

  /**
   * Toggle entre HTG et USD
   */
  toggleCurrency(): void {
    const current = this.selectedCurrency();
    const newCurrency = current === 'HTG' ? 'USD' : 'HTG';
    this.setCurrency(newCurrency);
  }

  /**
   * Formate un montant avec la monnaie actuelle
   */
  formatAmount(amount: number): string {
    const symbol = this.getCurrencySymbol();
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    return `${formatted} ${symbol}`;
  }
}
