import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService } from '../../core/services/categories.service';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../../core/models/category.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeEdit02,
  hugeDelete03,
  hugePlusSign,
  hugeSearch01,
  hugeXClose
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [
    provideIcons({
      hugeEdit02,
      hugeDelete03,
      hugePlusSign,
      hugeSearch01,
      hugeXClose
    })
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  filteredCategories = signal<Category[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Modal state
  showModal = signal(false);
  modalMode: 'create' | 'edit' = 'create';
  currentCategory: Category | null = null;

  // Form data
  formData: CreateCategoryDto = {
    name: '',
    description: '',
    icon: ''
  };

  // Search
  searchTerm = signal('');

  // Stats
  stats = signal({
    total: 0,
    active: 0,
    inactive: 0
  });

  constructor(private categoriesService: CategoriesService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadStats();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.categoriesService.getAll().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.filteredCategories.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur chargement catégories:', error);
        this.showError('Erreur lors du chargement des catégories');
        this.loading.set(false);
      }
    });
  }

  loadStats(): void {
    this.categoriesService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
      },
      error: (error) => {
        console.error('Erreur chargement stats:', error);
      }
    });
  }

  filterCategories(): void {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      this.filteredCategories.set(this.categories());
      return;
    }

    const filtered = this.categories().filter(cat =>
      cat.name.toLowerCase().includes(term) ||
      cat.description?.toLowerCase().includes(term)
    );
    this.filteredCategories.set(filtered);
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.currentCategory = null;
    this.formData = {
      name: '',
      description: '',
      icon: ''
    };
    this.showModal.set(true);
  }

  openEditModal(category: Category): void {
    this.modalMode = 'edit';
    this.currentCategory = category;
    this.formData = {
      name: category.name,
      description: category.description || '',
      icon: category.icon || ''
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.currentCategory = null;
    this.formData = {
      name: '',
      description: '',
      icon: ''
    };
  }

  saveCategory(): void {
    if (!this.formData.name.trim()) {
      this.showError('Le nom de la catégorie est requis');
      return;
    }

    this.loading.set(true);

    if (this.modalMode === 'create') {
      this.categoriesService.create(this.formData).subscribe({
        next: () => {
          this.showSuccess('Catégorie créée avec succès');
          this.loadCategories();
          this.loadStats();
          this.closeModal();
        },
        error: (error) => {
          console.error('Erreur création catégorie:', error);
          this.showError('Erreur lors de la création de la catégorie');
          this.loading.set(false);
        }
      });
    } else if (this.currentCategory) {
      const updateData: UpdateCategoryDto = {
        name: this.formData.name,
        description: this.formData.description,
        icon: this.formData.icon
      };

      this.categoriesService.update(this.currentCategory.id, updateData).subscribe({
        next: () => {
          this.showSuccess('Catégorie modifiée avec succès');
          this.loadCategories();
          this.loadStats();
          this.closeModal();
        },
        error: (error) => {
          console.error('Erreur modification catégorie:', error);
          this.showError('Erreur lors de la modification de la catégorie');
          this.loading.set(false);
        }
      });
    }
  }

  deleteCategory(category: Category): void {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      return;
    }

    this.loading.set(true);
    this.categoriesService.delete(category.id).subscribe({
      next: () => {
        this.showSuccess('Catégorie supprimée avec succès');
        this.loadCategories();
        this.loadStats();
      },
      error: (error) => {
        console.error('Erreur suppression catégorie:', error);
        this.showError('Erreur lors de la suppression de la catégorie');
        this.loading.set(false);
      }
    });
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 3000);
  }
}
