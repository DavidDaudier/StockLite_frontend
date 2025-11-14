import { Injectable, Signal, WritableSignal, computed, signal, inject } from '@angular/core';
import { ProductItem } from "./../../models/product-item.model";
import { ProductsService } from '../../core/services/products.service';
import { Product } from '../../core/models/product.model';
import { NotificationService } from '../../core/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsService = inject(ProductsService);
  private notificationService = inject(NotificationService);

  /** Stock global des produits */
  public readonly products: WritableSignal<ProductItem[]> = signal<ProductItem[]>([]);

  /** Articles dans le panier */
  public readonly items: WritableSignal<ProductItem[]> = signal<ProductItem[]>([]);

  /** Ajoute un produit au panier */
  public add(product: Omit<ProductItem, 'qty'>): void {
    this.items.update((list: ProductItem[]) => {
      const found = list.find(i => i.id === product.id);
      if (found) {
        found.qty += 1;
        return [...list];         // trigger signal change
      }
      return [...list, { ...product, qty: 1 }];
    });
  }

  /** Change la quantité d'un produit dans le panier */
  public changeQty(id: string, delta: number): void {
    this.items.update((list: ProductItem[]) =>
      list
        .map((i: ProductItem) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter(i => i.qty > 0)
    );
    // On ne restaure plus le stock ici car c'est géré par le composant ProductList
  }

  /** Supprime un produit du panier */
  public remove(id: string): void {
    this.items.update((list: ProductItem[]) =>
      list.filter((item: ProductItem) => item.id !== id)
    );
  }

  /** Restaure le stock du produit dans la liste globale */
  restoreStock(productId: string, qty: number) {
    this.products.update(list =>
      list.map(p => p.id === productId
        ? { ...p, stock: p.stock + qty }
        : p
      )
    );
  }
  
  /** Remet à zéro le panier */
  public reset(): void {
    this.items.set([]);
  }

  /** Charge les produits depuis le backend */
  public loadFromBackend(): void {
    this.productsService.getAll().subscribe({
      next: (products: Product[]) => {
        const productItems: ProductItem[] = products.map(p => this.toProductItem(p));
        this.products.set(productItems);

        // Vérifier les niveaux de stock après le chargement
        this.checkAllStockLevels();
      },
      error: (error) => {
        console.error('Erreur chargement produits:', error);
      }
    });
  }

  /** Vérifie le niveau de stock d'un produit spécifique */
  public checkStockLevel(productId: string): void {
    const product = this.products().find(p => p.id === productId);
    if (product) {
      this.notificationService.checkStockLevel(product.id, product.name, product.stock);
    }
  }

  /** Vérifie les niveaux de stock de tous les produits */
  public checkAllStockLevels(): void {
    const products = this.products();
    products.forEach(product => {
      this.notificationService.checkStockLevel(product.id, product.name, product.stock);
    });
  }

  /** Convertit un Product backend en ProductItem frontend */
  private toProductItem(product: Product): ProductItem {
    return {
      id: product.id,
      name: product.name,
      price: typeof product.price === 'number' ? product.price : parseFloat(product.price),
      stock: typeof product.quantity === 'number' ? product.quantity : parseInt(product.quantity as any, 10),
      qty: 0,
      categoryId: product.category,
      isActive: product.isActive
    };
  }
}
