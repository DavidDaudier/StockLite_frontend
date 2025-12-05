import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { ProductsService } from '../../core/services/products.service';
import { InventoriesService } from '../../core/services/inventories.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { Inventory, InventoryItem, InventoryStatus, CreateInventoryDto, UpdateInventoryItemDto } from '../../core/models/inventory.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeInvestigation,
  hugeSearch01,
  hugeAdd01,
  hugeCheckmarkCircle04,
  hugeAlert01,
  hugeEdit02,
  hugeCheckmarkBadge04,
  hugeCancel01,
  hugePackageSent,
  hugeWorkHistory,
  hugeEye,
  hugeViewOff
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-inventories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugeInvestigation,
      hugeSearch01,
      hugeAdd01,
      hugeCheckmarkCircle04,
      hugeAlert01,
      hugeEdit02,
      hugeCheckmarkBadge04,
      hugeCancel01,
      hugePackageSent,
      hugeWorkHistory,
      hugeEye,
      hugeViewOff
    })
  ],
  templateUrl: './inventories.component.html',
  styleUrls: ['./inventories.component.css']
})
export class InventoriesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Expose enum to template
  InventoryStatus = InventoryStatus;

  // Data
  products = signal<Product[]>([]);
  inventories = signal<Inventory[]>([]);
  currentInventory = signal<Inventory | null>(null);

  // Filters
  searchTerm = signal<string>('');
  filterStatus = signal<string>('all'); // all, pending, counted, discrepancy

  // Pagination - Inventory Items
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  // Pagination - History
  historyItemsPerPage = signal<number>(10);
  historyCurrentPage = signal<number>(1);

  // UI State
  loading = signal<boolean>(false);
  editingItemId = signal<string | null>(null);
  tempPhysicalQuantity = signal<number | null>(null);
  showHistory = signal<boolean>(false);
  showStats = signal<boolean>(true);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Confirmation Modal State
  showConfirmModal = signal<boolean>(false);
  confirmAction = signal<'complete' | 'cancel' | null>(null);
  confirmTitle = signal<string>('');
  confirmMessage = signal<string>('');
  confirmWarning = signal<string>('');

  // Stats
  stats = computed(() => {
    const inventory = this.currentInventory();
    if (!inventory) return { total: 0, pending: 0, counted: 0, discrepancy: 0, totalDifference: 0 };

    const totalItems = inventory.totalItems || 0;
    const countedItems = inventory.countedItems || 0;
    const itemsWithDiscrepancy = inventory.itemsWithDiscrepancy || 0;
    const totalDiscrepancy = inventory.totalDiscrepancy || 0;

    return {
      total: totalItems,
      pending: totalItems - countedItems,
      counted: countedItems,
      discrepancy: itemsWithDiscrepancy,
      totalDifference: totalDiscrepancy
    };
  });

  // Filtered items
  filteredItems = computed(() => {
    const inventory = this.currentInventory();
    if (!inventory) return [];

    let items = inventory.items;

    // Filter by search term
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      items = items.filter(i =>
        i.product?.name.toLowerCase().includes(term) ||
        i.product?.sku.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.filterStatus() !== 'all') {
      items = items.filter(i => i.status === this.filterStatus());
    }

    return items;
  });

  // Paginated items for inventory table
  paginatedItems = computed(() => {
    const items = this.filteredItems();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return items.slice(start, end);
  });

  // Pagination info for inventory items
  paginationInfo = computed(() => {
    const total = this.filteredItems().length;
    const perPage = this.itemsPerPage();
    const current = this.currentPage();
    const totalPages = Math.ceil(total / perPage) || 1;
    const startIndex = total === 0 ? 0 : (current - 1) * perPage + 1;
    const endIndex = Math.min(current * perPage, total);

    return {
      total,
      totalPages,
      currentPage: current,
      startIndex,
      endIndex
    };
  });

  // Paginated inventories for history table
  paginatedInventories = computed(() => {
    const items = this.inventories();
    const start = (this.historyCurrentPage() - 1) * this.historyItemsPerPage();
    const end = start + this.historyItemsPerPage();
    return items.slice(start, end);
  });

  // Pagination info for history
  historyPaginationInfo = computed(() => {
    const total = this.inventories().length;
    const perPage = this.historyItemsPerPage();
    const current = this.historyCurrentPage();
    const totalPages = Math.ceil(total / perPage) || 1;
    const startIndex = total === 0 ? 0 : (current - 1) * perPage + 1;
    const endIndex = Math.min(current * perPage, total);

    return {
      total,
      totalPages,
      currentPage: current,
      startIndex,
      endIndex
    };
  });

  constructor(
    private productsService: ProductsService,
    private inventoriesService: InventoriesService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadInventories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productsService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products.set(products.filter(p => p.isActive));
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.loading.set(false);
        }
      });
  }

  loadInventories(): void {
    this.inventoriesService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventories) => {
          this.inventories.set(inventories);

          // Check if there's an in-progress inventory
          const inProgress = inventories.find(i => i.status === InventoryStatus.IN_PROGRESS);
          if (inProgress) {
            this.currentInventory.set(inProgress);
          }
        },
        error: (error) => {
          console.error('Error loading inventories:', error);
        }
      });
  }

  startInventory(): void {
    const items = this.products().map(product => ({
      productId: product.id,
      theoreticalQuantity: product.quantity || 0, // Ensure we always have a number
    }));

    const createDto: CreateInventoryDto = {
      items
    };

    this.loading.set(true);
    this.inventoriesService.create(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory) => {
          this.currentInventory.set(inventory);
          this.loading.set(false);
          this.loadInventories();
          this.showSuccess('Inventaire créé avec succès!');
        },
        error: (error) => {
          console.error('Error creating inventory:', error);
          this.showError('Erreur lors de la création de l\'inventaire');
          this.loading.set(false);
        }
      });
  }

  editItem(itemId: string, currentQuantity: number | null | undefined): void {
    this.editingItemId.set(itemId);
    this.tempPhysicalQuantity.set(currentQuantity || null);
  }

  saveItem(itemId: string): void {
    const inventory = this.currentInventory();
    if (!inventory) return;

    const updateDto: UpdateInventoryItemDto = {
      physicalQuantity: this.tempPhysicalQuantity() ?? 0
    };

    this.inventoriesService.updateItem(inventory.id, itemId, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.editingItemId.set(null);
          this.tempPhysicalQuantity.set(null);
          // Reload inventory to get updated stats
          this.loadInventoryById(inventory.id);
          this.showSuccess('Article mis à jour avec succès!');
        },
        error: (error) => {
          console.error('Error updating item:', error);
          this.showError('Erreur lors de la mise à jour de l\'article');
        }
      });
  }

  private loadInventoryById(id: string): void {
    this.inventoriesService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory) => {
          this.currentInventory.set(inventory);
          this.loadInventories();
        },
        error: (error) => {
          console.error('Error loading inventory:', error);
        }
      });
  }

  cancelEdit(): void {
    this.editingItemId.set(null);
    this.tempPhysicalQuantity.set(null);
  }

  isEditing(itemId: string): boolean {
    return this.editingItemId() === itemId;
  }

  completeInventory(): void {
    const inventory = this.currentInventory();
    if (!inventory) return;

    const allCounted = inventory.countedItems === inventory.totalItems;

    this.confirmAction.set('complete');
    this.confirmTitle.set('Finaliser l\'inventaire');
    this.confirmMessage.set('Voulez-vous vraiment finaliser cet inventaire ? Les ajustements seront appliqués au stock.');

    if (!allCounted) {
      this.confirmWarning.set('⚠️ Attention : Certains produits n\'ont pas été comptés.');
    } else {
      this.confirmWarning.set('');
    }

    this.showConfirmModal.set(true);
  }

  private executeCompleteInventory(): void {
    const inventory = this.currentInventory();
    if (!inventory) return;

    this.loading.set(true);
    this.inventoriesService.complete(inventory.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.currentInventory.set(null);
          this.loadInventories();
          this.loadProducts(); // Reload products to reflect updated quantities
          this.showSuccess('Inventaire finalisé avec succès!');
        },
        error: (error) => {
          console.error('Error completing inventory:', error);
          this.loading.set(false);
          this.showError('Erreur lors de la finalisation de l\'inventaire');
        }
      });
  }

  cancelInventory(): void {
    const inventory = this.currentInventory();
    if (!inventory) return;

    this.confirmAction.set('cancel');
    this.confirmTitle.set('Annuler l\'inventaire');
    this.confirmMessage.set('Voulez-vous vraiment annuler cet inventaire ? Toutes les données seront perdues.');
    this.confirmWarning.set('⚠️ Cette action est irréversible.');
    this.showConfirmModal.set(true);
  }

  private executeCancelInventory(): void {
    const inventory = this.currentInventory();
    if (!inventory) return;

    this.inventoriesService.cancel(inventory.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.currentInventory.set(null);
          this.editingItemId.set(null);
          this.tempPhysicalQuantity.set(null);
          this.loadInventories();
          this.showSuccess('Inventaire annulé avec succès!');
        },
        error: (error) => {
          console.error('Error cancelling inventory:', error);
          this.showError('Erreur lors de l\'annulation de l\'inventaire');
        }
      });
  }

  toggleHistory(): void {
    this.showHistory.update(v => !v);
  }

  viewInventory(inventory: Inventory): void {
    this.currentInventory.set(inventory);
    this.showHistory.set(false);
  }

  closeInventoryView(): void {
    this.currentInventory.set(null);
    this.loadInventories();
  }

  deleteInventory(id: string): void {
    if (!confirm('Voulez-vous vraiment supprimer cet inventaire ?')) {
      return;
    }

    this.inventoriesService.delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadInventories();
          this.showSuccess('Inventaire supprimé avec succès!');
        },
        error: (error) => {
          console.error('Error deleting inventory:', error);
          this.showError('Erreur lors de la suppression de l\'inventaire');
        }
      });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'counted':
        return 'bg-green-100 text-green-800';
      case 'discrepancy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'counted':
        return 'Compté';
      case 'discrepancy':
        return 'Écart';
      default:
        return 'En attente';
    }
  }

  getInventoryStatusColor(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case InventoryStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  getInventoryStatusLabel(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.COMPLETED:
        return 'Finalisé';
      case InventoryStatus.CANCELLED:
        return 'Annulé';
      default:
        return 'En cours';
    }
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

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.confirmAction.set(null);
    this.confirmTitle.set('');
    this.confirmMessage.set('');
    this.confirmWarning.set('');
  }

  confirmModalAction(): void {
    const action = this.confirmAction();
    this.closeConfirmModal();

    if (action === 'complete') {
      this.executeCompleteInventory();
    } else if (action === 'cancel') {
      this.executeCancelInventory();
    }
  }

  // Pagination methods for inventory items
  onItemsPerPageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.itemsPerPage.set(Number(value));
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.paginationInfo().totalPages) {
      this.currentPage.set(page);
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.paginationInfo().totalPages;
    const current = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Pagination methods for history
  onHistoryItemsPerPageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.historyItemsPerPage.set(Number(value));
    this.historyCurrentPage.set(1);
  }

  goToHistoryPage(page: number): void {
    if (page >= 1 && page <= this.historyPaginationInfo().totalPages) {
      this.historyCurrentPage.set(page);
    }
  }

  getHistoryPageNumbers(): number[] {
    const totalPages = this.historyPaginationInfo().totalPages;
    const current = this.historyCurrentPage();
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }
}
