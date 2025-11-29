import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CurrencyService } from '../../services/currency.service';

@Pipe({
  name: 'gdesCurrency',
  standalone: true
})
export class GdesCurrencyPipe implements PipeTransform {
  constructor(
    private sanitizer: DomSanitizer,
    private currencyService: CurrencyService
  ) {}

  transform(value: number): SafeHtml {
    // Handle NaN, null, undefined, or invalid numbers
    const numValue = (value == null || isNaN(value)) ? 0 : value;
    
    const symbol = this.currencyService.getCurrencySymbol();
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);

    return this.sanitizer.bypassSecurityTrustHtml(
      `${formatted} <span class="text-sm align-baseline ml-0.5 font-medium text-gray-500">${symbol}</span>`
    );
  }
}
