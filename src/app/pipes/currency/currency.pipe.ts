import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'gdesCurrency',
  standalone: true
})
export class GdesCurrencyPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: number): SafeHtml {
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

    return this.sanitizer.bypassSecurityTrustHtml(
      `${formatted} <span class="text-xs">Gds</span>`
    );
  }
}
