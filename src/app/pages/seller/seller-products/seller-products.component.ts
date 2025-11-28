import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { ProductService } from '../../../services/product/product.service';
import { CurrencyService } from '../../../services/currency.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugePackageOpen,
  hugeSearch01,
  hugeFilter
} from '@ng-icons/huge-icons';

import { GdesCurrencyPipe } from '../../../pipes/currency/currency.pipe';

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent, GdesCurrencyPipe],
  viewProviders: [
    provideIcons({
      hugePackageOpen,
      hugeSearch01,
      hugeFilter
    })
  ],
  templateUrl: './seller-products.component.html',
  styleUrl: './seller-products.component.css'
})
export class SellerProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private currencyService = inject(CurrencyService);

  products = signal<any[]>([]);
  filteredProducts = signal<any[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productService.loadFromBackend();

    // Écouter les changements de produits (only active products)
    setTimeout(() => {
      const allProducts = this.productService.products();
      // Filter only active products (strict check)
      const activeProducts = allProducts.filter(p => p.isActive === true);
      this.products.set(activeProducts);
      this.filteredProducts.set(activeProducts);
      this.loading.set(false);
    }, 500);
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm.set(term);

    if (!term) {
      this.filteredProducts.set(this.products());
      return;
    }

    const filtered = this.products().filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
    this.filteredProducts.set(filtered);
  }

  formatCurrency(amount: number): string {
    return this.currencyService.formatAmount(amount);
  }

  getStockStatus(quantity: number, minStock: number): string {
    if (quantity === 0) return 'Rupture';
    if (quantity <= minStock) return 'Faible';
    return 'Disponible';
  }

  getStockClass(quantity: number, minStock: number): string {
    if (quantity === 0) return 'bg-red-100 text-red-800';
    if (quantity <= minStock) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  }
}
