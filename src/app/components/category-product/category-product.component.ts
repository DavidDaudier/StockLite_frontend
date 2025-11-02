import { hugePackageSent, hugeArrowRight01, hugeArrowLeft01 } from "@ng-icons/huge-icons";
import { NgIcon, provideIcons } from "@ng-icons/core";
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from "@angular/common";
import { CategoriesService } from '../../core/services/categories.service';
import { Category } from '../../core/models/category.model';
import { ProductService } from '../../services/product/product.service';

@Component({
  selector: 'app-category-product',
  imports: [
    CommonModule,
    // NgIcon
  ],
  viewProviders: [
    provideIcons({
      hugePackageSent,
      hugeArrowRight01,
      hugeArrowLeft01,
    })
  ],
  templateUrl: './category-product.component.html',
  styleUrl: './category-product.component.css'
})
export class CategoryProductComponent implements OnInit {
  private categoriesService = inject(CategoriesService);
  private productService = inject(ProductService);

  categories = signal<Category[]>([]);
  selectedCategoryId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (categories) => {
        // Filtrer uniquement les catégories actives
        this.categories.set(categories.filter(c => c.isActive));
      },
      error: (error) => {
        console.error('Erreur chargement catégories:', error);
      }
    });
  }

  selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
    // TODO: Filtrer les produits par catégorie
    console.log('Catégorie sélectionnée:', categoryId);
  }

  getProductCountForCategory(categoryId: string): number {
    // TODO: Compter les produits par catégorie
    // Pour l'instant, retourner 0
    return 0;
  }

  getTotalProductCount(): number {
    return this.productService.products().length;
  }
}
