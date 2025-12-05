import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DraftService, Draft } from '../../../core/services/draft.service';
import { PrinterService, PrintReceiptData } from '../../../core/services/printer.service';
import { AuthService } from '../../../core/services/auth.service';
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

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
}

@Component({
  selector: 'app-draft-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent, GdesCurrencyPipe],
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
  private printerService = inject(PrinterService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  drafts = signal<Draft[]>([]);
  loading = signal<boolean>(false);
  selectedDraft = signal<Draft | null>(null);
  showDetailsModal = signal<boolean>(false);

  // Payment Modal
  showPaymentModal = signal<boolean>(false);
  draftToComplete = signal<Draft | null>(null);
  paymentMethod = signal<PaymentMethod>(PaymentMethod.CASH);
  customerName = signal<string>('');
  customerPhone = signal<string>('');
  notes = signal<string>('');
  amountReceived = signal<number>(0);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  PaymentMethod = PaymentMethod;

  // Computed values
  totalAmount = computed(() => this.draftToComplete()?.total || 0);
  change = computed(() => {
    const received = this.amountReceived();
    const total = this.totalAmount();
    return received >= total ? received - total : 0;
  });

  currencySymbol = computed(() => this.currencyService.getCurrencySymbol());

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

  // Finaliser depuis le modal des détails
  finalizeFromDetailsModal(): void {
    const draft = this.selectedDraft();
    if (!draft) return;
    this.closeModal();
    this.completeDraft(draft);
  }

  // Open payment modal instead of direct completion
  completeDraft(draft: Draft): void {
    this.draftToComplete.set(draft);
    this.paymentMethod.set((draft.paymentMethod as PaymentMethod) || PaymentMethod.CASH);
    this.customerName.set(draft.customerName || '');
    this.customerPhone.set(draft.customerPhone || '');
    this.notes.set(draft.notes || '');
    this.amountReceived.set(0);
    this.showPaymentModal.set(true);
  }

  // Close payment modal
  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.draftToComplete.set(null);
    this.amountReceived.set(0);
    this.errorMessage.set('');
  }

  // Calculator methods
  addDigit(digit: string): void {
    const current = this.amountReceived().toString();
    const newValue = current === '0' ? digit : current + digit;
    this.amountReceived.set(parseFloat(newValue) || 0);
  }

  backspace(): void {
    const current = this.amountReceived().toString();
    const newValue = current.length > 1 ? current.slice(0, -1) : '0';
    this.amountReceived.set(parseFloat(newValue) || 0);
  }

  clearAmount(): void {
    this.amountReceived.set(0);
  }

  // Get current date/time
  currentDate(): string {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  currentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Confirm and complete the sale
  confirmPayment(): void {
    const draft = this.draftToComplete();
    if (!draft) return;

    if (this.amountReceived() < this.totalAmount()) {
      this.errorMessage.set('Le montant reçu est insuffisant');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const completeDto = {
      paymentMethod: this.paymentMethod(),
      customerName: this.customerName() || undefined,
      customerPhone: this.customerPhone() || undefined,
      notes: this.notes() || undefined
    };

    this.draftService.completeDraft(draft.id, completeDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (completedSale) => {
          console.log('✅ Brouillon finalisé:', completedSale);
          this.printReceipt(draft, completedSale);
          this.successMessage.set('Vente finalisée avec succès !');
          this.loading.set(false);
          this.closePaymentModal();
          this.loadDrafts();
          setTimeout(() => this.successMessage.set(''), 5000);
        },
        error: (error) => {
          console.error('Erreur lors de la finalisation:', error);
          this.errorMessage.set(error.error?.message || 'Erreur lors de la finalisation du brouillon');
          this.loading.set(false);
        }
      });
  }

  // Print receipt
  private printReceipt(draft: Draft, completedSale: any): void {
    const currentUser = this.authService.getCurrentUser();
    const receiptData: PrintReceiptData = {
      ticketNo: completedSale.saleNumber || draft.saleNumber,
      items: draft.items.map(item => ({
        id: item.productId,
        name: item.productName,
        price: Number(item.unitPrice) || 0,
        qty: Number(item.quantity) || 0,
        stock: 0,
        isActive: true
      })),
      subtotal: Number(draft.subtotal) || 0,
      tax: Number(draft.tax) || 0,
      total: Number(draft.total) || 0,
      paymentMethod: this.paymentMethod(),
      customerName: this.customerName() || undefined,
      customerPhone: this.customerPhone() || undefined,
      notes: this.notes() || undefined,
      date: new Date(),
      cashierName: currentUser?.fullName
    };
    this.printerService.printReceipt(receiptData);
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
