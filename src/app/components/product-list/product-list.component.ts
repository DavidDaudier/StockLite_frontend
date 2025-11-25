import { Component, inject, WritableSignal, signal, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ProductService } from './../../services/product/product.service';
import { ProductItem } from "./../../models/product-item.model";
import { QuantityPipe } from './../../pipes/quantity/quantity.pipe';
import { hugePlusSign, hugeMinusSign, hugeSearch01, hugeArrowRight01, hugeNotebook01, hugeTimeSchedule, hugeFilter } from '@ng-icons/huge-icons';
import { CategoriesService } from '../../core/services/categories.service';
import { Category } from '../../core/models/category.model';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    QuantityPipe
  ],
  viewProviders: [
    provideIcons({
      hugePlusSign,
      hugeMinusSign,
      hugeSearch01,
      hugeArrowRight01,
      hugeNotebook01,
      hugeTimeSchedule,
      hugeFilter
    })
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {

  readonly cartProduct = inject(ProductService);
  private categoriesService = inject(CategoriesService);
  private sidebarService = inject(SidebarService);

  // Filtres
  searchTerm = signal('');
  selectedCategoryId = signal<string | null>(null);
  categories = signal<Category[]>([]);

  // Nombre de colonnes dynamique basé sur l'état du sidebar
  // Sidebar ouvert (collapsed = false) = 4 colonnes
  // Sidebar fermé/réduit (collapsed = true) = 5 colonnes
  gridCols = computed(() => this.sidebarService.collapsed() ? 5 : 4);

  // Map de couleurs par catégorie
  private categoryColors: { [key: string]: string } = {};

  // Produits filtrés (computed) - filtre directement depuis cartProduct.products
  filteredProducts = computed(() => {
    let filtered = this.cartProduct.products();
    const search = this.searchTerm().trim().toLowerCase();
    const categoryId = this.selectedCategoryId();

    // Filtre seulement les produits actifs (strict check)
    filtered = filtered.filter(p => p.isActive === true);

    // Filtre par recherche
    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search)
      );
    }

    // Filtre par catégorie
    if (categoryId) {
      filtered = filtered.filter(p => p.categoryId === categoryId);
    }

    return filtered;
  });

  ngOnInit(): void {
    this.loadCategories();
    // Charger les produits depuis le backend
    this.cartProduct.loadFromBackend();
  }

  loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (categories) => {
        this.categories.set(categories.filter(c => c.isActive));
      },
      error: (error) => {
        console.error('Erreur chargement catégories:', error);
      }
    });
  }

  onCategoryChange(value: string | null): void {
    // S'assurer que null est bien null et pas une string "null"
    this.selectedCategoryId.set(value);
  }

  get products(): WritableSignal<ProductItem[]> {
    return this.cartProduct.products;
  }

  // Obtenir la couleur de fond basée sur la catégorie
  getCategoryBgColor(categoryId: string | undefined): string {
    if (!categoryId) return 'bg-white';
    
    // Si la couleur est déjà définie dans la map, l'utiliser
    if (this.categoryColors[categoryId]) {
      return this.categoryColors[categoryId];
    }
    
    // Sinon, générer une couleur basée sur le hash du categoryId
    const colors = [
      'bg-blue-100',
      'bg-purple-100',
      'bg-pink-100',
      'bg-orange-100',
      'bg-yellow-100',
      'bg-green-100',
      'bg-teal-100',
      'bg-cyan-100',
      'bg-indigo-100',
      'bg-rose-100',
      'bg-amber-100',
      'bg-lime-100',
      'bg-emerald-100',
      'bg-sky-100',
      'bg-violet-100'
    ];
    
    // Générer un index basé sur le categoryId
    let hash = 0;
    for (let i = 0; i < categoryId.length; i++) {
      hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    
    // Sauvegarder pour la prochaine fois
    this.categoryColors[categoryId] = colors[index];
    return colors[index];
  }

  // Classes CSS pour le card
  cardClasses(id: string): string {
    const qty = this.cartProduct.items().find(i => i.id === id)?.qty || 0;
    const selected = qty > 0;
    
    // Trouver le produit pour obtenir sa catégorie
    const product = this.cartProduct.products().find(p => p.id === id);
    const categoryBg = product ? this.getCategoryBgColor(product.categoryId) : 'bg-white';
    
    // Convertir bg-color-200 en border-color-500 pour la bordure
    const categoryBorder = categoryBg.replace('bg-', 'border-').replace('-200', '-300');
    
    // Si sélectionné : fond blanc avec bordure de la couleur de la catégorie
    // Sinon : couleur de la catégorie avec bordure grise
    return selected
      ? `bg-white ${categoryBorder} border-gray-300`
      : `${categoryBg} border-gray-200 hover:border-gray-400`;
  }

  /** Sélection d'un produit (ajout au panier) **/
  select(product: ProductItem) {
    if (product.stock === 0) return;
    
    // Vérifie si le produit est déjà dans le panier
    const isInCart = this.cartProduct.items().some(i => i.id === product.id);
    
    if (!isInCart) {
      // Si pas dans le panier, on l'ajoute d'abord
      this.cartProduct.add(product);
    } else {
      // Si déjà dans le panier, on augmente juste la quantité
      this.cartProduct.changeQty(product.id, +1);
    }
    
    // Met à jour le stock
    this.products.update((list: ProductItem[]) =>
      list.map((p: ProductItem) => {
        if (p.id !== product.id) return p;
        return { ...p, stock: p.stock - 1 };
      })
    );
  }

  /** Changement de quantité via les boutons + et - **/
  changeQty(id: string, delta: number): void {
    // Vérifie si on peut effectuer le changement
    const product = this.products().find(p => p.id === id);
    if (!product) return;

    if (delta > 0 && product.stock <= 0) return; // Ne peut pas augmenter si plus de stock
    
    // Met à jour le stock
    this.products.update((list: ProductItem[]) =>
      list.map((p: ProductItem) => {
        if (p.id !== id) return p;
        const newStock = p.stock - delta;
        if (newStock < 0) return p;
        return { ...p, stock: Math.max(newStock, 0) };
      })
    );

    // Si pas encore dans le panier et on augmente, on l'ajoute
    const isInCart = this.cartProduct.items().some(i => i.id === id);
    if (!isInCart && delta > 0) {
      this.cartProduct.add(product);
    } else {
      // Sinon on change juste la quantité
      this.cartProduct.changeQty(id, delta);
    }
  }

  /** Restauration du stock **/
  restoreStock(productId: string, qty: number) {
    this.cartProduct.restoreStock(productId, qty);
  }
  
}