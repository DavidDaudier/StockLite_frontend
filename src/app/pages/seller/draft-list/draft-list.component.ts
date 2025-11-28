import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DraftService, Draft } from '../../../core/services/draft.service';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeFileDownload,
  hugeDelete02,
  hugeCheckmarkCircle02,
  hugeEye,
  hugeCalendar03
} from '@ng-icons/huge-icons';

import { CurrencyService } from '../../../services/currency.service';

import { GdesCurrencyPipe } from '../../../pipes/currency/currency.pipe';

@Component({
  selector: 'app-draft-list',
  standalone: true,
  imports: [CommonModule, NgIcon, SidebarComponent, PosHeaderComponent, GdesCurrencyPipe],
  viewProviders: [
    provideIcons({
      hugeFileDownload,
      hugeDelete02,
      hugeCheckmarkCircle02,
      hugeEye,
      hugeCalendar03
    })
  ],
  templateUrl: './draft-list.component.html',
  styleUrl: './draft-list.component.css'
})
export class DraftListComponent implements OnInit, OnDestroy {
  private draftService = inject(DraftService);
  private router = inject(Router);
  private currencyService = inject(CurrencyService);
  private destroy$ = new Subject<void>();

  drafts = signal<Draft[]>([]);
  loading = signal<boolean>(false);
  selectedDraft = signal<Draft | null>(null);
  showDetailsModal = signal<boolean>(false);

  ngOnInit(): void {
    this.loadDrafts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDrafts(): void {
    this.loading.set(true);
    this.draftService.getDrafts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (drafts) => {
          this.drafts.set(drafts);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des brouillons:', error);
          this.loading.set(false);
        }
      });
  }

  viewDetails(draft: Draft): void {
    this.selectedDraft.set(draft);
    this.showDetailsModal.set(true);
  }

  closeModal(): void {
    this.showDetailsModal.set(false);
    this.selectedDraft.set(null);
  }

  completeDraft(draft: Draft): void {
    if (confirm(`Êtes-vous sûr de vouloir finaliser ce brouillon ${draft.saleNumber}?`)) {
      this.loading.set(true);
      this.draftService.completeDraft(draft.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadDrafts();
            alert('Brouillon finalisé avec succès!');
          },
          error: (error) => {
            console.error('Erreur lors de la finalisation:', error);
            alert(error.error?.message || 'Erreur lors de la finalisation du brouillon');
            this.loading.set(false);
          }
        });
    }
  }

  deleteDraft(draft: Draft): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le brouillon ${draft.saleNumber}?`)) {
      this.loading.set(true);
      this.draftService.deleteDraft(draft.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadDrafts();
            alert('Brouillon supprimé avec succès!');
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression du brouillon');
            this.loading.set(false);
          }
        });
    }
  }

  formatCurrency(amount: number): string {
    return this.currencyService.formatAmount(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalItems(draft: Draft): number {
    return draft.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
