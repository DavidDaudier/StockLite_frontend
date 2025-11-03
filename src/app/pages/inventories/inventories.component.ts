import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { ProductsService } from '../../core/services/products.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
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
  hugePackageSent
} from '@ng-icons/huge-icons';

interface InventoryItem {
  product: Product;
  theoreticalQuantity: number;
  physicalQuantity: number | null;
  difference: number;
  status: 'pending' | 'counted' | 'discrepancy';
}

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
      hugePackageSent
    })
  ],
  templateUrl: './inventories.component.html',
  styleUrls: ['./inventories.component.css']
})
export class InventoriesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  products = signal<Product[]>([]);
  inventoryItems = signal<InventoryItem[]>([]);

  // Filters
  searchTerm = signal<string>('');
  filterStatus = signal<string>('all'); // all, pending, counted, discrepancy

  // UI State
  loading = signal<boolean>(false);
  inventoryInProgress = signal<boolean>(false);
  editingItemId = signal<string | null>(null);
  tempPhysicalQuantity = signal<number | null>(null);

  // Stats
  stats = computed(() => {
    const items = this.filteredItems();
    const total = items.length;
    const pending = items.filter(i => i.status === 'pending').length;
    const counted = items.filter(i => i.status === 'counted').length;
    const discrepancy = items.filter(i => i.status === 'discrepancy').length;
    const totalDifference = items.reduce((sum, i) => sum + Math.abs(i.difference), 0);

    return { total, pending, counted, discrepancy, totalDifference };
  });

  // Filtered items
  filteredItems = computed(() => {
    let items = this.inventoryItems();

    // Filter by search term
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      items = items.filter(i =>
        i.product.name.toLowerCase().includes(term) ||
        i.product.sku.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.filterStatus() !== 'all') {
      items = items.filter(i => i.status === this.filterStatus());
    }

    return items;
  });

  constructor(
    private productsService: ProductsService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
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

  startInventory(): void {
    const items: InventoryItem[] = this.products().map(product => ({
      product,
      theoreticalQuantity: product.quantity,
      physicalQuantity: null,
      difference: 0,
      status: 'pending' as const
    }));

    this.inventoryItems.set(items);
    this.inventoryInProgress.set(true);
  }

  editItem(productId: string, currentQuantity: number | null): void {
    this.editingItemId.set(productId);
    this.tempPhysicalQuantity.set(currentQuantity);
  }

  saveItem(productId: string): void {
    const items = this.inventoryItems();
    const itemIndex = items.findIndex(i => i.product.id === productId);

    if (itemIndex !== -1) {
      const item = items[itemIndex];
      const physicalQty = this.tempPhysicalQuantity() ?? 0;
      const difference = physicalQty - item.theoreticalQuantity;

      const updatedItem: InventoryItem = {
        ...item,
        physicalQuantity: physicalQty,
        difference,
        status: difference === 0 ? 'counted' : 'discrepancy'
      };

      const updatedItems = [...items];
      updatedItems[itemIndex] = updatedItem;

      this.inventoryItems.set(updatedItems);
      this.editingItemId.set(null);
      this.tempPhysicalQuantity.set(null);
    }
  }

  cancelEdit(): void {
    this.editingItemId.set(null);
    this.tempPhysicalQuantity.set(null);
  }

  isEditing(productId: string): boolean {
    return this.editingItemId() === productId;
  }

  completeInventory(): void {
    const items = this.inventoryItems();
    const allCounted = items.every(i => i.physicalQuantity !== null);

    if (!allCounted) {
      if (!confirm('Certains produits n\'ont pas été comptés. Voulez-vous continuer ?')) {
        return;
      }
    }

    if (!confirm('Voulez-vous vraiment finaliser cet inventaire ? Les ajustements seront appliqués au stock.')) {
      return;
    }

    this.loading.set(true);

    // Apply adjustments for items with discrepancy
    const itemsWithDiscrepancy = items.filter(i => i.difference !== 0 && i.physicalQuantity !== null);

    let completed = 0;
    let errors = 0;

    if (itemsWithDiscrepancy.length === 0) {
      this.finishInventory();
      return;
    }

    itemsWithDiscrepancy.forEach(item => {
      this.productsService.update(item.product.id, { quantity: item.physicalQuantity! })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            completed++;
            if (completed + errors === itemsWithDiscrepancy.length) {
              this.finishInventory();
            }
          },
          error: (error) => {
            console.error('Error updating product:', error);
            errors++;
            if (completed + errors === itemsWithDiscrepancy.length) {
              this.finishInventory();
            }
          }
        });
    });
  }

  private finishInventory(): void {
    this.loading.set(false);
    this.inventoryInProgress.set(false);
    this.inventoryItems.set([]);
    this.loadProducts();
    alert('Inventaire finalisé avec succès!');
  }

  cancelInventory(): void {
    if (!confirm('Voulez-vous vraiment annuler cet inventaire ? Toutes les données seront perdues.')) {
      return;
    }

    this.inventoryInProgress.set(false);
    this.inventoryItems.set([]);
    this.editingItemId.set(null);
    this.tempPhysicalQuantity.set(null);
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
}
