import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugePackageSent,
  hugeSearch01,
  hugeFilter,
  hugeAddCircle,
  hugeEdit01,
  hugeDelete02,
  hugeCheckmarkCircle04,
  hugeAlert01,
  hugeCheckmarkSquare02,
  hugeGeometricShapes01,
  hugePdf01,
  hugeXls01,
  hugeCsv01,
  hugeFileAdd,
} from '@ng-icons/huge-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { SidebarComponent } from "../../layouts/sidebar/sidebar.component";
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';
import { AppInfoService } from '../../services/app-info.service';
import { CurrencyService } from '../../services/currency.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, CreateProductDto, UpdateProductDto } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { AppInfo } from '../../models/app-info.model';
import { DEFAULT_APP_INFO } from '../../constants/app-defaults';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugePackageSent,
      hugeSearch01,
      hugeFilter,
      hugeAddCircle,
      hugeEdit01,
      hugeDelete02,
      hugeCheckmarkCircle04,
      hugeAlert01,
      hugeCheckmarkSquare02,
      hugeGeometricShapes01,
      hugePdf01,
      hugeXls01,
      hugeCsv01,
      hugeFileAdd
    })
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data (using signals)
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  categories = signal<Category[]>([]);

  // Filters (using signals)
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('all');

  // Modal State (using signals)
  showModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  isCSVMode = signal<boolean>(false);
  selectedCSVFile = signal<File | null>(null);
  csvImportProgress = signal<string>('');
  productForm: FormGroup;
  selectedProduct = signal<Product | null>(null);

  // Delete Confirmation (using signals)
  showDeleteModal = signal<boolean>(false);
  productToDelete = signal<Product | null>(null);
  showMultipleDeleteModal = signal<boolean>(false);

  // Details Modal (using signals)
  showDetailsModal = signal<boolean>(false);
  selectedProductDetails = signal<Product | null>(null);

  // Multiple Selection Mode (using signals)
  isSelectionMode = signal<boolean>(false);
  selectedProducts = signal<Set<string>>(new Set());

  // Categories Modal (using signals)
  showCategoriesModal = signal<boolean>(false);
  categoryForm: FormGroup;
  isCategoryEditMode = signal<boolean>(false);
  editingCategory = signal<Category | null>(null);
  showCategoryDeleteModal = signal<boolean>(false);
  categoryToDelete = signal<Category | null>(null);

  // UI State (using signals)
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  appInfo = signal<AppInfo | null>(DEFAULT_APP_INFO);

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private appInfoService: AppInfoService,
    private fb: FormBuilder,
    public authService: AuthService,
    private currencyService: CurrencyService
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      sku: ['', Validators.required],
      barcode: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      costPrice: [null, [Validators.min(0)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      brand: [''],
      model: [''],
      description: ['']
    });

    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      icon: [''],
      description: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupAutoSKUGeneration();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    console.log('loadData() called');
    this.loading.set(true);

    // Load app info (retourne toujours des valeurs, par défaut en cas d'erreur)
    this.appInfoService.getAppInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appInfo) => {
          this.appInfo.set(appInfo);
        }
      });

    // Load categories
    this.categoriesService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          console.log('Categories loaded:', categories);
          this.categories.set(categories.filter(cat => cat.isActive));
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.errorMessage.set('Erreur lors du chargement des catégories');
        }
      });

    // Load products (only active products)
    this.productsService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          console.log('Products loaded:', products);
          // Filter only active products (strict check)
          const activeProducts = products.filter(p => p.isActive === true);
          this.products.set(activeProducts);
          this.filteredProducts.set([...activeProducts]);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.errorMessage.set(error.error?.message || 'Erreur lors du chargement des produits');
          this.loading.set(false);
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.products()];

    // Filter by category
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }

    // Filter by search query
    if (this.searchTerm().trim()) {
      const query = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.model?.toLowerCase().includes(query)
      );
    }

    this.filteredProducts.set(filtered);
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.applyFilters();
  }

  onCategoryChange(event: Event): void {
    const category = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(category);
    this.applyFilters();
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.isCSVMode.set(false);
    this.selectedProduct.set(null);
    this.selectedCSVFile.set(null);
    this.csvImportProgress.set('');
    this.productForm.reset({
      name: '',
      sku: '',
      barcode: '',
      price: 0,
      costPrice: 0,
      quantity: 0,
      minStock: 0,
      category: '',
      brand: '',
      model: '',
      description: ''
    });
    this.showModal.set(true);
    this.errorMessage.set('');
  }

  openEditModal(product: Product): void {
    this.isEditMode.set(true);
    this.selectedProduct.set(product);
    this.productForm.patchValue({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      price: product.price,
      costPrice: product.costPrice,
      quantity: product.quantity,
      minStock: product.minStock,
      category: product.category,
      brand: product.brand || '',
      model: product.model || '',
      description: product.description || ''
    });
    this.showModal.set(true);
    this.errorMessage.set('');
  }

  closeModal(): void {
    this.showModal.set(false);
    this.productForm.reset();
    this.selectedProduct.set(null);
    this.isCSVMode.set(false);
    this.selectedCSVFile.set(null);
    this.csvImportProgress.set('');
    this.errorMessage.set('');
  }

  toggleCSVMode(): void {
    this.isCSVMode.set(!this.isCSVMode());
    this.selectedCSVFile.set(null);
    this.csvImportProgress.set('');
    this.errorMessage.set('');
  }

  onCSVFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Vérifier que c'est bien un fichier CSV ou Excel
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!isValid) {
        this.errorMessage.set('Veuillez sélectionner un fichier CSV ou Excel valide (.csv, .xlsx, .xls)');
        setTimeout(() => this.errorMessage.set(''), 3000);
        return;
      }

      this.selectedCSVFile.set(file);
      this.errorMessage.set('');
    }
  }

  async importCSV(): Promise<void> {
    const file = this.selectedCSVFile();
    if (!file) {
      this.errorMessage.set('Veuillez sélectionner un fichier');
      return;
    }

    this.submitting.set(true);
    this.csvImportProgress.set('Lecture du fichier...');

    try {
      let productsData: any[] = [];

      // Déterminer le type de fichier et parser en conséquence
      if (file.name.toLowerCase().endsWith('.csv')) {
        productsData = await this.parseCSVFile(file);
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        productsData = await this.parseExcelFile(file);
      } else {
        this.errorMessage.set('Format de fichier non supporté');
        this.submitting.set(false);
        this.csvImportProgress.set('');
        return;
      }

      if (productsData.length === 0) {
        this.errorMessage.set('Le fichier est vide ou invalide');
        this.submitting.set(false);
        this.csvImportProgress.set('');
        return;
      }

      // Importer chaque produit
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < productsData.length; i++) {
        const productData = productsData[i];

        this.csvImportProgress.set(`Importation: ${i + 1}/${productsData.length}...`);

        try {
          await this.productsService.create(productData).toPromise();
          successCount++;
        } catch (error) {
          console.error(`Erreur lors de l'import du produit ${productData.name}:`, error);
          errorCount++;
        }
      }

      // Recharger les produits
      this.loadData();

      // Afficher le résultat
      this.csvImportProgress.set('');
      this.submitting.set(false);
      this.closeModal();

      if (successCount > 0) {
        this.showSuccess(`${successCount} produit(s) importé(s) avec succès`);
      }
      if (errorCount > 0) {
        setTimeout(() => {
          this.errorMessage.set(`${errorCount} produit(s) n'ont pas pu être importés`);
          setTimeout(() => this.errorMessage.set(''), 3000);
        }, 3000);
      }

    } catch (error: any) {
      console.error('Erreur lors de l\'import:', error);
      this.errorMessage.set(error.message || 'Erreur lors de la lecture du fichier');
      this.submitting.set(false);
      this.csvImportProgress.set('');
    }
  }

  private async parseCSVFile(file: File): Promise<CreateProductDto[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('Le fichier CSV est vide');
    }

    // Extraire les en-têtes
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Vérifier les colonnes obligatoires
    const requiredColumns = ['name', 'sku', 'price', 'quantity', 'minstock', 'category'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`);
    }

    const products: CreateProductDto[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const productData: any = {};
      headers.forEach((header, index) => {
        productData[header] = values[index].trim();
      });

      products.push(this.createProductDTO(productData));
    }

    return products;
  }

  private async parseExcelFile(file: File): Promise<CreateProductDto[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Prendre la première feuille
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convertir en JSON
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

          if (jsonData.length === 0) {
            reject(new Error('Le fichier Excel est vide'));
            return;
          }

          // Normaliser les clés (en minuscules)
          const normalizedData = jsonData.map(row => {
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            });
            return normalizedRow;
          });

          // Vérifier les colonnes obligatoires
          const requiredColumns = ['name', 'sku', 'price', 'costprice', 'quantity', 'minstock', 'category'];
          const firstRow = normalizedData[0];
          const missingColumns = requiredColumns.filter(col => !(col in firstRow));

          if (missingColumns.length > 0) {
            reject(new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`));
            return;
          }

          // Créer les DTOs
          const products: CreateProductDto[] = normalizedData.map(row => this.createProductDTO(row));

          resolve(products);
        } catch (error) {
          reject(new Error('Erreur lors de la lecture du fichier Excel'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private createProductDTO(productData: any): CreateProductDto {
    return {
      name: productData.name,
      sku: productData.sku,
      barcode: productData.barcode || undefined,
      price: parseFloat(productData.price) || 0,
      costPrice: productData.costprice ? parseFloat(productData.costprice) : undefined,
      quantity: parseInt(productData.quantity, 10) || 0,
      minStock: parseInt(productData.minstock, 10) || 0,
      category: productData.category,
      brand: productData.brand || undefined,
      model: productData.model || undefined,
      description: productData.description || undefined
    };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.errorMessage.set('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const currentProduct = this.selectedProduct();
    if (this.isEditMode() && currentProduct) {
      // Update product
      const formValue = this.productForm.value;
      // Convertir explicitement les valeurs numériques
      const updateDto: UpdateProductDto = {
        ...formValue,
        price: parseFloat(formValue.price),
        costPrice: formValue.costPrice != null ? parseFloat(formValue.costPrice) : null,
        quantity: parseInt(formValue.quantity, 10),
        minStock: parseInt(formValue.minStock, 10)
      };
      this.productsService.update(currentProduct.id, updateDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedProduct) => {
            const currentProducts = this.products();
            const index = currentProducts.findIndex(p => p.id === updatedProduct.id);
            if (index !== -1) {
              currentProducts[index] = updatedProduct;
              this.products.set([...currentProducts]);
            }
            this.applyFilters();
            this.submitting.set(false);
            this.closeModal();
            this.showSuccess('Produit modifié avec succès');
          },
          error: (error) => {
            this.errorMessage.set(this.translateErrorMessage(error));
            this.submitting.set(false);
          }
        });
    } else {
      // Create product
      const formValue = this.productForm.value;
      // Convertir explicitement les valeurs numériques
      const createDto: CreateProductDto = {
        ...formValue,
        price: parseFloat(formValue.price),
        costPrice: formValue.costPrice != null ? parseFloat(formValue.costPrice) : null,
        quantity: parseInt(formValue.quantity, 10),
        minStock: parseInt(formValue.minStock, 10)
      };
      this.productsService.create(createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newProduct) => {
            const currentProducts = this.products();
            this.products.set([newProduct, ...currentProducts]);
            this.applyFilters();
            this.submitting.set(false);
            this.closeModal();
            this.showSuccess('Produit ajouté avec succès');
          },
          error: (error) => {
            this.errorMessage.set(this.translateErrorMessage(error));
            this.submitting.set(false);
          }
        });
    }
  }

  openDeleteModal(product: Product): void {
    this.productToDelete.set(product);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const productToDelete = this.productToDelete();
    if (!productToDelete) return;

    this.submitting.set(true);
    this.productsService.delete(productToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const currentProducts = this.products();
          this.products.set(currentProducts.filter(p => p.id !== productToDelete.id));
          this.applyFilters();
          this.submitting.set(false);
          this.closeDeleteModal();
          this.showSuccess('Produit supprimé avec succès');
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          this.submitting.set(false);
          this.closeDeleteModal();
          this.errorMessage.set('Erreur lors de la suppression');
        }
      });
  }

  viewProductDetails(product: Product): void {
    this.selectedProductDetails.set(product);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedProductDetails.set(null);
  }

  openEditFromDetails(): void {
    const product = this.selectedProductDetails();
    if (product) {
      this.closeDetailsModal();
      this.openEditModal(product);
    }
  }

  toggleSelectionMode(): void {
    if (this.isSelectionMode()) {
      // Si on sort du mode sélection, supprimer les produits sélectionnés
      if (this.selectedProducts().size > 0) {
        this.deleteMultipleProducts();
      } else {
        // Sinon juste désactiver le mode
        this.isSelectionMode.set(false);
        this.selectedProducts.set(new Set());
      }
    } else {
      // Activer le mode sélection
      this.isSelectionMode.set(true);
      this.selectedProducts.set(new Set());
    }
  }

  toggleProductSelection(productId: string): void {
    const selected = new Set(this.selectedProducts());

    if (selected.has(productId)) {
      selected.delete(productId);
    } else {
      // Limite de 15 produits
      if (selected.size >= 15) {
        this.errorMessage.set('Vous pouvez sélectionner maximum 15 produits à la fois');
        setTimeout(() => this.errorMessage.set(''), 3000);
        return;
      }
      selected.add(productId);
    }

    this.selectedProducts.set(selected);
  }

  isProductSelected(productId: string): boolean {
    return this.selectedProducts().has(productId);
  }

  deleteMultipleProducts(): void {
    const selectedIds = Array.from(this.selectedProducts());
    if (selectedIds.length === 0) return;

    this.showMultipleDeleteModal.set(true);
  }

  closeMultipleDeleteModal(): void {
    this.showMultipleDeleteModal.set(false);
  }

  confirmMultipleDelete(): void {
    const selectedIds = Array.from(this.selectedProducts());
    if (selectedIds.length === 0) return;

    this.submitting.set(true);
    let deletedCount = 0;
    let errorCount = 0;

    selectedIds.forEach(productId => {
      this.productsService.delete(productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            deletedCount++;
            if (deletedCount + errorCount === selectedIds.length) {
              this.finishMultipleDelete(deletedCount, errorCount);
            }
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            errorCount++;
            if (deletedCount + errorCount === selectedIds.length) {
              this.finishMultipleDelete(deletedCount, errorCount);
            }
          }
        });
    });
  }

  private finishMultipleDelete(deletedCount: number, errorCount: number): void {
    // Recharger les produits
    this.loadData();

    // Fermer le modal
    this.closeMultipleDeleteModal();

    // Réinitialiser le mode sélection
    this.isSelectionMode.set(false);
    this.selectedProducts.set(new Set());
    this.submitting.set(false);

    // Afficher le message de succès
    if (deletedCount > 0) {
      this.showSuccess(`${deletedCount} produit(s) supprimé(s) avec succès`);
    }
    if (errorCount > 0) {
      this.errorMessage.set(`Erreur lors de la suppression de ${errorCount} produit(s)`);
    }
  }

  // Categories Management
  openCategoriesModal(): void {
    this.showCategoriesModal.set(true);
    this.isCategoryEditMode.set(false);
    this.editingCategory.set(null);
  }

  closeCategoriesModal(): void {
    this.showCategoriesModal.set(false);
    this.isCategoryEditMode.set(false);
    this.editingCategory.set(null);
    this.categoryForm.reset({ description: '', isActive: true });
  }

  openAddCategoryForm(): void {
    this.isCategoryEditMode.set(false);
    this.editingCategory.set(null);
    this.categoryForm.reset({
      name: '',
      icon: '',
      description: '',
      isActive: true
    });
  }

  openEditCategoryForm(category: Category): void {
    this.isCategoryEditMode.set(true);
    this.editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      icon: category.icon,
      description: category.description || '',
      isActive: category.isActive
    });
  }

  closeCategoryForm(): void {
    this.isCategoryEditMode.set(false);
    this.editingCategory.set(null);
    this.categoryForm.reset({ description: '', isActive: true });
  }

  submitCategoryForm(): void {
    if (this.categoryForm.invalid) {
      this.errorMessage.set('Veuillez remplir tous les champs obligatoires');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    this.submitting.set(true);
    const formValue = this.categoryForm.value;

    if (this.isCategoryEditMode()) {
      // Update category
      const category = this.editingCategory();
      if (!category) return;

      this.categoriesService.update(category.id, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedCategory) => {
            const currentCategories = this.categories();
            const index = currentCategories.findIndex(c => c.id === updatedCategory.id);
            if (index !== -1) {
              currentCategories[index] = updatedCategory;
              this.categories.set([...currentCategories]);
            }
            this.submitting.set(false);
            this.closeCategoryForm();
            this.showSuccess('Catégorie modifiée avec succès');
          },
          error: (error) => {
            this.errorMessage.set(this.translateErrorMessage(error));
            setTimeout(() => this.errorMessage.set(''), 3000);
            this.submitting.set(false);
          }
        });
    } else {
      // Create category
      this.categoriesService.create(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newCategory) => {
            const currentCategories = this.categories();
            this.categories.set([newCategory, ...currentCategories]);
            this.submitting.set(false);
            this.closeCategoryForm();
            this.showSuccess('Catégorie ajoutée avec succès');
          },
          error: (error) => {
            this.errorMessage.set(this.translateErrorMessage(error));
            setTimeout(() => this.errorMessage.set(''), 3000);
            this.submitting.set(false);
          }
        });
    }
  }

  openDeleteCategoryModal(category: Category): void {
    this.categoryToDelete.set(category);
    this.showCategoryDeleteModal.set(true);
  }

  closeDeleteCategoryModal(): void {
    this.showCategoryDeleteModal.set(false);
    this.categoryToDelete.set(null);
  }

  confirmDeleteCategory(): void {
    const category = this.categoryToDelete();
    if (!category) return;

    this.submitting.set(true);
    this.categoriesService.delete(category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const currentCategories = this.categories();
          this.categories.set(currentCategories.filter(c => c.id !== category.id));
          this.submitting.set(false);
          this.closeDeleteCategoryModal();
          this.showSuccess('Catégorie supprimée avec succès');
        },
        error: (error) => {
          console.error('Error deleting category:', error);
          this.errorMessage.set(this.translateErrorMessage(error));
          setTimeout(() => this.errorMessage.set(''), 3000);
          this.submitting.set(false);
          this.closeDeleteCategoryModal();
        }
      });
  }

  showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set('');
    }, 3000);
  }

  setupAutoSKUGeneration(): void {
    // Écouter les changements de nom et catégorie pour générer le SKU automatiquement
    this.productForm.get('name')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isEditMode()) {
          this.generateAndSetSKU();
        }
      });

    this.productForm.get('category')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isEditMode()) {
          this.generateAndSetSKU();
        }
      });
  }

  generateAndSetSKU(): void {
    const name = this.productForm.get('name')?.value || '';
    const category = this.productForm.get('category')?.value || '';

    if (name || category) {
      const sku = this.generateSKU(name, category);
      this.productForm.get('sku')?.setValue(sku, { emitEvent: false });
    }
  }

  generateSKU(productName: string, categoryName: string): string {
    // Nettoyer et formater les chaînes
    const cleanProductName = this.sanitizeForSKU(productName);
    const cleanCategoryName = this.sanitizeForSKU(categoryName);
    const appName = 'SL'; // StockLite → SL

    // Générer 4 chiffres aléatoires
    const randomNumbers = Math.floor(1000 + Math.random() * 9000);

    // Construire le SKU: nom-categorie-app-chiffres
    const parts = [cleanProductName, cleanCategoryName, appName, randomNumbers.toString()].filter(p => p);
    return parts.join('-');
  }

  sanitizeForSKU(text: string): string {
    if (!text) return '';

    // Enlever les accents
    const normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Enlever les diacritiques

    // Séparer en mots (espaces, tirets, underscores)
    const words = normalized.split(/[\s\-_]+/).filter(w => w.length > 0);

    // Prendre la première lettre de chaque mot + les chiffres
    return words.map(word => {
      // Si le mot contient des chiffres, garder les chiffres aussi
      const letters = word.match(/[a-zA-Z]/g) || [];
      const numbers = word.match(/\d+/g)?.join('') || '';

      // Première lettre en majuscule + chiffres
      return (letters[0]?.toUpperCase() || '') + numbers;
    }).join('').substring(0, 10); // Limiter à 10 caractères
  }

  exportToPDF(): void {
    try {
      const info = this.appInfo();
      if (!info) {
        this.errorMessage.set('Impossible de générer le PDF. Les informations de l\'application ne sont pas disponibles.');
        setTimeout(() => this.errorMessage.set(''), 3000);
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // En-tête avec informations de l'entreprise
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(info.nom_app, pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (info.adresse_app) {
        doc.text(info.adresse_app, pageWidth / 2, 28, { align: 'center' });
      }

      const contactInfo = [info.phone_app, info.email_app].filter(Boolean).join(' | ');
      if (contactInfo) {
        doc.text(contactInfo, pageWidth / 2, 34, { align: 'center' });
      }

      // Ligne de séparation
      doc.setLineWidth(0.5);
      doc.line(15, 38, pageWidth - 15, 38);

      // Titre du document
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Liste des produits disponibles', pageWidth / 2, 48, { align: 'center' });

      // Date de génération
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      doc.text(`Généré le : ${dateStr} à ${timeStr}`, pageWidth / 2, 54, { align: 'center' });

      // Préparer les données du tableau
      const tableData: string[][] = this.products().map(product => [
        product.name,
        product.model ?? '-',
        `${Number(product.price).toFixed(2)} Gdes`,
        String(product.quantity),
        String(product.minStock),
        product.category
      ] as string[]);

      // Générer le tableau avec autoTable
      autoTable(doc, {
        startY: 60,
        head: [['Nom produit', 'Modèle', 'Prix', 'Quantité disponible', 'Min Stock', 'Catégorie']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: info.color_primary ? this.hexToRgb(info.color_primary) : [13, 148, 136],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 35 }
        },
        margin: { top: 60 }
      });

      // Pied de page avec total de produits
      const finalY = (doc as any).lastAutoTable.finalY || 60;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de produits : ${this.products().length}`, 15, finalY + 10);

      // Télécharger le PDF
      doc.save(`liste-produits-${new Date().getTime()}.pdf`);

      // Message de succès
      this.showSuccess('PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      this.errorMessage.set('Une erreur est survenue lors de la génération du PDF');
      setTimeout(() => this.errorMessage.set(''), 3000);
    }
  }

  exportToExcel(): void {
    try {
      const info = this.appInfo();
      if (!info) {
        this.errorMessage.set('Impossible de générer le fichier Excel. Les informations de l\'application ne sont pas disponibles.');
        setTimeout(() => this.errorMessage.set(''), 3000);
        return;
      }

      // Préparer les en-têtes d'entreprise
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR');
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const headerRows = [
        [info.nom_app, '', '', '', '', '', '', '', '', ''],
        [info.adresse_app || '', '', '', '', '', '', '', '', '', ''],
        [`Tel: ${info.phone_app || ''} | Email: ${info.email_app || ''}`, '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['Liste des produits disponibles', '', '', '', '', '', '', '', '', ''],
        [`Généré le: ${dateStr} à ${timeStr}`, '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['Nom produit', 'SKU', 'Modèle', 'Prix (Gdes)', 'Prix de revient (Gdes)', 'Quantité disponible', 'Stock minimum', 'Catégorie', 'Marque', 'Statut']
      ];

      // Préparer les données des produits
      const dataRows = this.products().map(product => [
        product.name,
        product.sku,
        product.model || '-',
        Number(product.price),
        Number(product.costPrice),
        Number(product.quantity),
        Number(product.minStock),
        product.category,
        product.brand || '-',
        product.isActive ? 'Actif' : 'Inactif'
      ]);

      // Combiner les en-têtes et les données
      const allData = [...headerRows, ...dataRows];

      // Créer la feuille de calcul
      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Ajuster la largeur des colonnes
      ws['!cols'] = [
        { wch: 40 }, // Nom produit
        { wch: 20 }, // SKU
        { wch: 20 }, // Modèle
        { wch: 15 }, // Prix
        { wch: 18 }, // Prix de revient
        { wch: 18 }, // Quantité
        { wch: 15 }, // Stock min
        { wch: 20 }, // Catégorie
        { wch: 20 }, // Marque
        { wch: 12 }  // Statut
      ];

      // Créer le workbook et ajouter la feuille
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produits');

      // Télécharger le fichier Excel
      XLSX.writeFile(wb, `liste-produits-${new Date().getTime()}.xlsx`);

      // Message de succès
      this.showSuccess('Fichier Excel exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du fichier Excel:', error);
      this.errorMessage.set('Une erreur est survenue lors de la génération du fichier Excel');
      setTimeout(() => this.errorMessage.set(''), 3000);
    }
  }

  hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [13, 148, 136];
  }

  translateErrorMessage(error: any): string {
    // Si c'est un message personnalisé du backend
    if (error.error?.message && typeof error.error.message === 'string') {
      return error.error.message;
    }

    // Si c'est un tableau de messages de validation
    if (error.error?.message && Array.isArray(error.error.message)) {
      const messages = error.error.message.map((msg: string) => {
        // Traductions des messages de validation courants
        if (msg.includes('must not be less than')) return 'Le prix ne peut pas être négatif';
        if (msg.includes('must be a number')) return 'Le prix doit être un nombre valide';
        if (msg.includes('should not be empty')) return 'Ce champ est obligatoire';
        if (msg.includes('must be a string')) return 'Ce champ doit être du texte';
        if (msg.includes('must be longer than')) return 'Ce champ est trop court';
        return msg;
      });
      return messages.join(', ');
    }

    return 'Une erreur est survenue';
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
