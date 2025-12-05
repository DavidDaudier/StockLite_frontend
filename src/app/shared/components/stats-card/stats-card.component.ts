import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule, NgIcon],
  template: `
    <div class="stats-card bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-600 uppercase tracking-wide">{{ title }}</p>
          <p class="text-3xl font-bold mt-2" [ngClass]="valueClass">
            <span [innerHTML]="formatValue()"></span>
          </p>
          <p *ngIf="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
          <div *ngIf="trend !== undefined" class="flex items-center mt-2">
            <span
              class="inline-flex items-center text-sm font-medium"
              [ngClass]="{
                'text-green-600': trend > 0,
                'text-red-600': trend < 0,
                'text-gray-600': trend === 0
              }"
            >
              <span *ngIf="trend > 0">↑</span>
              <span *ngIf="trend < 0">↓</span>
              <span *ngIf="trend === 0">—</span>
              <span class="ml-1">{{ Math.abs(trend) }}%</span>
            </span>
            <span class="text-sm text-gray-500 ml-2">{{ trendLabel || 'vs période précédente' }}</span>
          </div>
        </div>
        <div *ngIf="icon" class="flex-shrink-0">
          <div class="p-3 rounded-full" [ngClass]="iconBgClass">
            <ng-icon [name]="icon" class="text-2xl" [ngClass]="iconClass"></ng-icon>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-card {
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class StatsCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() iconClass: string = 'text-teal-600';
  @Input() iconBgClass: string = 'bg-teal-100';
  @Input() valueClass: string = 'text-gray-900';
  @Input() trend?: number; // Percentage change (+/-)
  @Input() trendLabel?: string;
  @Input() gradient: boolean = false; // Enable gradient background

  Math = Math;

  /**
   * Formate la valeur pour afficher la devise (Gds/Gdes) plus petite que le montant
   */
  formatValue(): string {
    const valueStr = String(this.value);

    // Regex pour détecter "Gds" ou "Gdes" à la fin (avec ou sans espaces)
    const regex = /^(.+?)\s*(Gd(?:e)?s)$/i;
    const match = valueStr.match(regex);

    if (match) {
      // match[1] = le montant, match[2] = la devise (Gds ou Gdes)
      const amount = match[1].trim();
      const currency = match[2];
      return `${amount} <span class="text-lg font-normal">${currency}</span>`;
    }

    // Si pas de devise détectée, retourner la valeur telle quelle
    return valueStr;
  }
}
