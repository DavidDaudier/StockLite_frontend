import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ProductService } from "./../../services/product/product.service";
import { SalesService } from "../../core/services/sales.service";
import { OfflineSyncService } from "../../core/services/offline-sync.service";
import { AuthService } from "../../core/services/auth.service";
import { PrinterService, PrintReceiptData } from "../../core/services/printer.service";
import { provideIcons } from "@ng-icons/core";
import { hugeDelete03, hugeNote } from "@ng-icons/huge-icons";
import { ProductItem } from "./../../models/product-item.model";
import { PaymentMethod, CreateSaleDto } from "../../core/models/sale.model";

@Component({
  selector: 'app-product-receipt',
  imports: [CommonModule, FormsModule],
  viewProviders: [
    provideIcons({
      hugeDelete03,
      hugeNote
    })
  ],
  templateUrl: './product-receipt.component.html',
  styleUrl: './product-receipt.component.css'
})
export class ProductReceiptComponent {
  readonly cart = inject(ProductService);
  private salesService = inject(SalesService);
  private offlineSyncService = inject(OfflineSyncService);
  private authService = inject(AuthService);
  private printerService = inject(PrinterService);

  ticketNo = computed(() => 'T-' + Date.now().toString(36).toUpperCase());

  /** Montant total */
  subtotal = computed(() =>
    this.cart.items().reduce((sum, i) => sum + i.price * i.qty, 0)
  );
  tax = computed(() => this.subtotal() * 0.18); // 18% TVA
  total = computed(() => this.subtotal() + this.tax());

  // États
  loading = signal(false);
  isOnline = signal(true);
  successMessage = signal('');
  errorMessage = signal('');
  showPaymentModal = signal(false);

  // Données de paiement
  paymentMethod = signal<PaymentMethod>(PaymentMethod.CASH);
  customerName = signal('');
  customerPhone = signal('');
  notes = signal('');

  // Dernière vente pour réimpression
  lastReceiptData = signal<PrintReceiptData | null>(null);

  PaymentMethod = PaymentMethod;

  constructor() {
    // Surveiller l'état de connexion
    this.offlineSyncService.getOnlineStatus().subscribe(status => {
      this.isOnline.set(status);
    });
  }

  /** Suppression d'un article */
  removeItem(id: string) {
    const item = this.cart.items().find(i => i.id === id);
    if (!item) return;
    this.cart.remove(id);
    this.cart.restoreStock(id, item.qty); // restaure le stock global
  }

  /** Ouvrir le modal de paiement */
  openPaymentModal() {
    if (this.cart.items().length === 0) {
      this.errorMessage.set('Le panier est vide');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }
    this.showPaymentModal.set(true);
  }

  /** Fermer le modal de paiement */
  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.customerName.set('');
    this.customerPhone.set('');
    this.notes.set('');
  }

  /** Confirmer et enregistrer la vente */
  async confirmSale() {
    if (this.cart.items().length === 0) {
      this.errorMessage.set('Le panier est vide');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const saleDto: CreateSaleDto = {
      items: this.cart.items().map(item => ({
        productId: item.id,
        quantity: item.qty,
        unitPrice: item.price,
        discount: 0
      })),
      discount: 0,
      tax: this.tax(),
      paymentMethod: this.paymentMethod(),
      customerName: this.customerName() || undefined,
      customerPhone: this.customerPhone() || undefined,
      notes: this.notes() || undefined,
      clientSaleId: `local-${Date.now()}`
    };

    // Préparer les données du reçu
    const currentUser = this.authService.getCurrentUser();
    const receiptData: PrintReceiptData = {
      ticketNo: this.ticketNo(),
      items: [...this.cart.items()],
      subtotal: this.subtotal(),
      tax: this.tax(),
      total: this.total(),
      paymentMethod: this.paymentMethod(),
      customerName: this.customerName() || undefined,
      customerPhone: this.customerPhone() || undefined,
      notes: this.notes() || undefined,
      date: new Date(),
      cashierName: currentUser?.fullName
    };

    if (this.isOnline()) {
      // Mode online: envoyer directement au serveur
      this.salesService.create(saleDto).subscribe({
        next: (sale) => {
          console.log('✅ Vente enregistrée:', sale);
          this.showSuccess('Vente enregistrée avec succès !');
          this.printReceipt(receiptData);
          this.resetCart();

          // Recharger les produits pour mettre à jour les stocks et vérifier les niveaux
          this.cart.loadFromBackend();
        },
        error: (error) => {
          console.error('❌ Erreur enregistrement vente:', error);
          // En cas d'erreur, sauvegarder en offline
          this.saveOffline(saleDto, receiptData);
        }
      });
    } else {
      // Mode offline: sauvegarder localement
      this.saveOffline(saleDto, receiptData);
    }
  }

  /** Sauvegarder en mode offline */
  private async saveOffline(saleDto: CreateSaleDto, receiptData: PrintReceiptData): Promise<void> {
    try {
      await this.offlineSyncService.addSaleToQueue(saleDto);
      this.showSuccess('Vente sauvegardée en local. Sera synchronisée automatiquement.');
      this.printReceipt(receiptData);
      this.resetCart();
    } catch (error) {
      console.error('❌ Erreur sauvegarde offline:', error);
      this.errorMessage.set('Erreur lors de la sauvegarde de la vente');
      this.loading.set(false);
    }
  }

  /** Afficher message de succès */
  private showSuccess(message: string) {
    this.successMessage.set(message);
    this.loading.set(false);
    this.closePaymentModal();
    setTimeout(() => this.successMessage.set(''), 5000);
  }

  /** Réinitialiser le panier */
  private resetCart() {
    this.cart.reset();
    this.customerName.set('');
    this.customerPhone.set('');
    this.notes.set('');
    this.paymentMethod.set(PaymentMethod.CASH);
  }

  /** Imprimer un reçu */
  private printReceipt(receiptData: PrintReceiptData) {
    this.lastReceiptData.set(receiptData);
    this.printerService.printReceipt(receiptData);
  }

  /** Réimprimer le dernier reçu */
  print() {
    const lastReceipt = this.lastReceiptData();
    if (lastReceipt) {
      this.printerService.printReceipt(lastReceipt);
    } else {
      this.errorMessage.set('Aucun reçu disponible pour impression');
      setTimeout(() => this.errorMessage.set(''), 3000);
    }
  }

  /** Sauvegarder comme brouillon */
  saveDraft() {
    if (this.cart.items().length === 0) {
      this.errorMessage.set('Le panier est vide');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const draftDto: CreateSaleDto = {
      items: this.cart.items().map(item => ({
        productId: item.id,
        quantity: item.qty,
        unitPrice: item.price,
        discount: 0
      })),
      discount: 0,
      tax: this.tax(),
      paymentMethod: this.paymentMethod(),
      customerName: this.customerName() || undefined,
      customerPhone: this.customerPhone() || undefined,
      notes: this.notes() || undefined,
      clientSaleId: `draft-${Date.now()}`
    };

    this.salesService.createDraft(draftDto).subscribe({
      next: (draft) => {
        console.log('✅ Brouillon créé:', draft);
        this.successMessage.set('Commande ajoutée au brouillon avec succès !');
        this.loading.set(false);
        this.resetCart();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (error) => {
        console.error('❌ Erreur création brouillon:', error);
        this.errorMessage.set('Erreur lors de la création du brouillon');
        this.loading.set(false);
      }
    });
  }
}

