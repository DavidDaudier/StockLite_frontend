import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false // Pour réagir aux changements de monnaie
})
export class AppCurrencyPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '-';
    }

    const symbol = this.currencyService.getCurrencySymbol();
    const formatted = value.toFixed(2);
    
    // Format avec séparateur de milliers
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return `${symbol} ${parts.join('.')}`;
  }
}
