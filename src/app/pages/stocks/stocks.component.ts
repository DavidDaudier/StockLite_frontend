import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAppleStocks,
  hugeSearch01,
  hugeFilter,
  hugeCheckmarkCircle04,
  hugeAlert01,
  hugeChartDecrease,
  hugeChartMinimum,
  hugePackageSent,
  hugeAddCircle,
  hugeMinusSign,
  hugeEdit02,
  hugePdf01,
  hugeXls01,
  hugeEye,
  hugeViewOffSlash,
  hugeDeliveryView01
} from '@ng-icons/huge-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { SidebarComponent } from "../../layouts/sidebar/sidebar.component";
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';
import { AppInfoService } from '../../services/app-info.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, UpdateProductDto } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { AppInfo } from '../../models/app-info.model';
import { DEFAULT_APP_INFO } from '../../constants/app-defaults';

interface StockStats {
  total: number;
  available: number;
  low: number;
  outOfStock: number;
  inactive: number;
  totalValue: number;
}

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugeAppleStocks,
      hugeSearch01,
      hugeFilter,
      hugeCheckmarkCircle04,
      hugeAlert01,
      hugeChartDecrease,
      hugeChartMinimum,
      hugePackageSent,
      hugeAddCircle,
      hugeMinusSign,
      hugeEdit02,
      hugePdf01,
      hugeXls01,
      hugeEye,
      hugeViewOffSlash,
      hugeDeliveryView01
    })
  ],
  templateUrl: './stocks.component.html',
  styleUrl: './stocks.component.css'
})
export class StocksComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data (using signals)
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  stats = signal<StockStats>({ total: 0, available: 0, low: 0, outOfStock: 0, inactive: 0, totalValue: 0 });

  // Filters (using signals)
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('all');
  selectedStockStatus = signal<string>('all'); // all, available, low, outOfStock

  // Pagination (using signals)
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  // Produits paginés (computed)
  paginatedProducts = computed(() => {
    const filtered = this.filteredProducts();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filtered.slice(startIndex, endIndex);
  });

  // Info pagination (computed)
  paginationInfo = computed(() => {
    const total = this.filteredProducts().length;
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage + 1;
    const endIndex = Math.min(page * perPage, total);

    return {
      total,
      totalPages,
      startIndex,
      endIndex,
      currentPage: page
    };
  });

  // Modal State (using signals)
  showAdjustModal = signal<boolean>(false);
  adjustForm: FormGroup;
  selectedProduct = signal<Product | null>(null);

  // UI State (using signals)
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  appInfo = signal<AppInfo | null>(DEFAULT_APP_INFO);
  updatingProductIds = signal<Set<string>>(new Set());

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private appInfoService: AppInfoService,
    private fb: FormBuilder,
    public authService: AuthService
  ) {
    this.adjustForm = this.fb.group({
      adjustment: [0, [Validators.required]],
      reason: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading.set(true);

    // Load app info
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
          this.categories.set(categories.filter(cat => cat.isActive));
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        }
      });

    // Load products
    this.productsService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.filteredProducts.set([...products]);
          this.calculateStats();
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.errorMessage.set('Erreur lors du chargement des produits');
          this.loading.set(false);
        }
      });
  }

  calculateStats(): void {
    const products = this.products();
    const stats: StockStats = {
      total: products.length,
      available: 0,
      low: 0,
      outOfStock: 0,
      inactive: 0,
      totalValue: 0
    };

    products.forEach(product => {
      // Compter les produits inactifs
      if (!product.isActive) {
        stats.inactive++;
      }

      // Compter les statuts de stock (seulement pour les produits actifs)
      if (product.isActive) {
        if (product.quantity === 0) {
          stats.outOfStock++;
        } else if (product.quantity <= product.minStock) {
          stats.low++;
        } else {
          stats.available++;
        }
      }

      stats.totalValue += product.price * product.quantity;
    });

    this.stats.set(stats);
  }

  applyFilters(): void {
    let filtered = [...this.products()];

    // Filter by category
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }

    // Filter by stock status
    const status = this.selectedStockStatus();
    if (status === 'available') {
      filtered = filtered.filter(p => p.isActive && p.quantity > p.minStock);
    } else if (status === 'low') {
      filtered = filtered.filter(p => p.isActive && p.quantity > 0 && p.quantity <= p.minStock);
    } else if (status === 'outOfStock') {
      filtered = filtered.filter(p => p.isActive && p.quantity === 0);
    } else if (status === 'inactive') {
      filtered = filtered.filter(p => !p.isActive);
    }

    // Filter by search query
    if (this.searchTerm().trim()) {
      const query = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    this.filteredProducts.set(filtered);
    this.currentPage.set(1); // Réinitialiser à la première page après filtrage
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

  onStockStatusChange(event: Event): void {
    const status = (event.target as HTMLSelectElement).value;
    this.selectedStockStatus.set(status);
    this.applyFilters();
  }

  // Méthodes de pagination
  onItemsPerPageChange(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.itemsPerPage.set(value);
    this.currentPage.set(1); // Réinitialiser à la première page
  }

  goToPage(page: number): void {
    const info = this.paginationInfo();
    if (page >= 1 && page <= info.totalPages) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    const info = this.paginationInfo();
    if (info.currentPage < info.totalPages) {
      this.currentPage.set(info.currentPage + 1);
    }
  }

  previousPage(): void {
    const info = this.paginationInfo();
    if (info.currentPage > 1) {
      this.currentPage.set(info.currentPage - 1);
    }
  }

  firstPage(): void {
    this.currentPage.set(1);
  }

  lastPage(): void {
    const info = this.paginationInfo();
    this.currentPage.set(info.totalPages);
  }

  getPageNumbers(): number[] {
    const info = this.paginationInfo();
    const pages: number[] = [];
    const maxVisible = 6;

    if (info.totalPages <= maxVisible) {
      for (let i = 1; i <= info.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, info.currentPage - 2);
      const end = Math.min(info.totalPages, start + maxVisible - 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  openAdjustModal(product: Product): void {
    this.selectedProduct.set(product);
    this.adjustForm.reset({
      adjustment: 0,
      reason: ''
    });
    this.showAdjustModal.set(true);
    this.errorMessage.set('');
  }

  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
    this.adjustForm.reset();
    this.selectedProduct.set(null);
    this.errorMessage.set('');
  }

  onAdjustSubmit(): void {
    if (this.adjustForm.invalid) {
      this.errorMessage.set('Veuillez remplir tous les champs');
      return;
    }

    const product = this.selectedProduct();
    if (!product) return;

    this.submitting.set(true);
    const adjustment = parseInt(this.adjustForm.value.adjustment, 10);
    const newQuantity = product.quantity + adjustment;

    if (newQuantity < 0) {
      this.errorMessage.set('La quantité ne peut pas être négative');
      this.submitting.set(false);
      return;
    }

    const updateDto: UpdateProductDto = {
      quantity: newQuantity
    };

    this.productsService.update(product.id, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProduct) => {
          // Créer un nouveau tableau avec le produit mis à jour
          const updatedProducts = this.products().map(p =>
            p.id === updatedProduct.id ? updatedProduct : p
          );
          this.products.set(updatedProducts);
          this.applyFilters();
          this.calculateStats();
          this.submitting.set(false);
          this.closeAdjustModal();
          this.showSuccess(`Stock ajusté: ${adjustment > 0 ? '+' : ''}${adjustment} unités`);
        },
        error: (error) => {
          console.error('Error updating stock:', error);
          this.errorMessage.set('Erreur lors de l\'ajustement du stock');
          this.submitting.set(false);
        }
      });
  }

  isProductUpdating(productId: string): boolean {
    return this.updatingProductIds().has(productId);
  }

  toggleProductStatus(product: Product): void {
    // Empêcher les clics multiples sur le même produit
    const updatingIds = this.updatingProductIds();
    if (updatingIds.has(product.id)) {
      return;
    }

    // Ajouter l'ID au Set des produits en cours de mise à jour
    const newUpdatingIds = new Set(updatingIds);
    newUpdatingIds.add(product.id);
    this.updatingProductIds.set(newUpdatingIds);

    // Mise à jour optimiste : changer l'UI immédiatement
    const newStatus = !product.isActive;
    const optimisticProducts = this.products().map(p =>
      p.id === product.id ? { ...p, isActive: newStatus } : p
    );
    this.products.set(optimisticProducts);
    this.applyFilters();
    this.calculateStats();

    // Utiliser le nouvel endpoint dédié
    this.productsService.toggleStatus(product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProduct) => {
          // Mise à jour avec les données du serveur (en préservant l'ordre)
          const serverProducts = this.products().map(p =>
            p.id === updatedProduct.id ? updatedProduct : p
          );
          this.products.set(serverProducts);
          this.applyFilters();
          this.calculateStats();

          // Retirer l'ID du Set
          const finalUpdatingIds = new Set(this.updatingProductIds());
          finalUpdatingIds.delete(product.id);
          this.updatingProductIds.set(finalUpdatingIds);

          this.showSuccess(`Produit ${updatedProduct.isActive ? 'activé' : 'désactivé'} avec succès`);
        },
        error: (error) => {
          console.error('Error toggling product status:', error);

          // Rollback en cas d'erreur
          const rollbackProducts = this.products().map(p =>
            p.id === product.id ? { ...p, isActive: product.isActive } : p
          );
          this.products.set(rollbackProducts);
          this.applyFilters();
          this.calculateStats();

          // Retirer l'ID du Set
          const finalUpdatingIds = new Set(this.updatingProductIds());
          finalUpdatingIds.delete(product.id);
          this.updatingProductIds.set(finalUpdatingIds);

          this.errorMessage.set('Erreur lors du changement de statut');
        }
      });
  }

  exportToPDF(): void {
    try {
      const info = this.appInfo();
      if (!info) {
        this.errorMessage.set('Impossible de générer le PDF');
        setTimeout(() => this.errorMessage.set(''), 3000);
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let currentY = 20;

      // En-tête
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(info.nom_app, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (info.adresse_app) {
        doc.text(info.adresse_app, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
      }

      const contactInfo = [info.phone_app, info.email_app].filter(Boolean).join(' | ');
      if (contactInfo) {
        doc.text(contactInfo, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
      }

      doc.setLineWidth(0.5);
      doc.line(15, currentY, pageWidth - 15, currentY);
      currentY += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Rapport de Suivi de Stock', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Généré le : ${dateStr} à ${timeStr}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      const allProducts = this.products();

      // Filtrer les produits par catégorie
      const availableProducts = allProducts.filter(p => p.isActive && p.quantity > p.minStock);
      const lowStockProducts = allProducts.filter(p => p.isActive && p.quantity > 0 && p.quantity <= p.minStock);
      const outOfStockProducts = allProducts.filter(p => p.isActive && p.quantity === 0);
      const inactiveProducts = allProducts.filter(p => !p.isActive);

      // Helper pour créer les données du tableau
      const createTableData = (products: Product[]) => {
        return products.map(product => [
          product.name,
          product.category || '-',
          String(product.quantity),
          String(product.minStock),
          this.getStockStatus(product.quantity, product.minStock),
          product.isActive ? 'Actif' : 'Inactif'
        ] as string[]);
      };

      // 1. Tous les produits (Bleu)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Tous les Produits (${allProducts.length})`, 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Produit', 'Catégorie', 'Stock', 'Min', 'Statut Stock', 'Statut Produit']],
        body: createTableData(allProducts),
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235], // blue-600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 30 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 28, halign: 'center' },
          5: { cellWidth: 28, halign: 'center' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // 2. Stock disponible (Vert)
      if (availableProducts.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Stock Disponible (${availableProducts.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Produit', 'Catégorie', 'Stock', 'Min', 'Statut Stock', 'Statut Produit']],
          body: createTableData(availableProducts),
          theme: 'striped',
          headStyles: {
            fillColor: [22, 163, 74], // green-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 30 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 28, halign: 'center' }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // 3. Stock faible (Jaune)
      if (lowStockProducts.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Stock Faible (${lowStockProducts.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Produit', 'Catégorie', 'Stock', 'Min', 'Statut Stock', 'Statut Produit']],
          body: createTableData(lowStockProducts),
          theme: 'striped',
          headStyles: {
            fillColor: [202, 138, 4], // yellow-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 30 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 28, halign: 'center' }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // 4. Rupture de stock (Rouge)
      if (outOfStockProducts.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rupture de Stock (${outOfStockProducts.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Produit', 'Catégorie', 'Stock', 'Min', 'Statut Stock', 'Statut Produit']],
          body: createTableData(outOfStockProducts),
          theme: 'striped',
          headStyles: {
            fillColor: [220, 38, 38], // red-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 30 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 28, halign: 'center' }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // 5. Produits inactifs (Gris)
      if (inactiveProducts.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Produits Inactifs (${inactiveProducts.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Produit', 'Catégorie', 'Stock', 'Min', 'Statut Stock', 'Statut Produit']],
          body: createTableData(inactiveProducts),
          theme: 'striped',
          headStyles: {
            fillColor: [75, 85, 99], // gray-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 30 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 28, halign: 'center' }
          }
        });
      }

      doc.save(`suivi-stock-${new Date().getTime()}.pdf`);
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
        this.errorMessage.set('Impossible de générer le fichier Excel');
        setTimeout(() => this.errorMessage.set(''), 3000);
        return;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR');
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const allProducts = this.products();

      // Filtrer les produits par catégorie
      const availableProducts = allProducts.filter(p => p.isActive && p.quantity > p.minStock);
      const lowStockProducts = allProducts.filter(p => p.isActive && p.quantity > 0 && p.quantity <= p.minStock);
      const outOfStockProducts = allProducts.filter(p => p.isActive && p.quantity === 0);
      const inactiveProducts = allProducts.filter(p => !p.isActive);

      // Helper pour créer les données du tableau
      const createDataRows = (products: Product[]) => {
        return products.map(product => [
          product.name,
          product.category || '-',
          Number(product.quantity),
          Number(product.minStock),
          this.getStockStatus(product.quantity, product.minStock),
          product.isActive ? 'Actif' : 'Inactif',
          Number(product.price * product.quantity)
        ]);
      };

      // Construction du fichier Excel
      const allData: any[] = [
        [info.nom_app, '', '', '', '', '', ''],
        [info.adresse_app || '', '', '', '', '', '', ''],
        [`Tel: ${info.phone_app || ''} | Email: ${info.email_app || ''}`, '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['Rapport de Suivi de Stock', '', '', '', '', '', ''],
        [`Généré le: ${dateStr} à ${timeStr}`, '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],

        // 1. Tous les produits (Bleu)
        [`Tous les Produits (${allProducts.length})`, '', '', '', '', '', ''],
        ['Produit', 'Catégorie', 'Stock actuel', 'Stock minimum', 'Statut Stock', 'Statut Produit', 'Valeur Stock'],
        ...createDataRows(allProducts),
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
      ];

      // 2. Stock disponible (Vert)
      if (availableProducts.length > 0) {
        allData.push(
          [`Stock Disponible (${availableProducts.length})`, '', '', '', '', '', ''],
          ['Produit', 'Catégorie', 'Stock actuel', 'Stock minimum', 'Statut Stock', 'Statut Produit', 'Valeur Stock'],
          ...createDataRows(availableProducts),
          ['', '', '', '', '', '', ''],
          ['', '', '', '', '', '', '']
        );
      }

      // 3. Stock faible (Jaune)
      if (lowStockProducts.length > 0) {
        allData.push(
          [`Stock Faible (${lowStockProducts.length})`, '', '', '', '', '', ''],
          ['Produit', 'Catégorie', 'Stock actuel', 'Stock minimum', 'Statut Stock', 'Statut Produit', 'Valeur Stock'],
          ...createDataRows(lowStockProducts),
          ['', '', '', '', '', '', ''],
          ['', '', '', '', '', '', '']
        );
      }

      // 4. Rupture de stock (Rouge)
      if (outOfStockProducts.length > 0) {
        allData.push(
          [`Rupture de Stock (${outOfStockProducts.length})`, '', '', '', '', '', ''],
          ['Produit', 'Catégorie', 'Stock actuel', 'Stock minimum', 'Statut Stock', 'Statut Produit', 'Valeur Stock'],
          ...createDataRows(outOfStockProducts),
          ['', '', '', '', '', '', ''],
          ['', '', '', '', '', '', '']
        );
      }

      // 5. Produits inactifs (Gris)
      if (inactiveProducts.length > 0) {
        allData.push(
          [`Produits Inactifs (${inactiveProducts.length})`, '', '', '', '', '', ''],
          ['Produit', 'Catégorie', 'Stock actuel', 'Stock minimum', 'Statut Stock', 'Statut Produit', 'Valeur Stock'],
          ...createDataRows(inactiveProducts)
        );
      }

      const ws = XLSX.utils.aoa_to_sheet(allData);

      ws['!cols'] = [
        { wch: 35 },
        { wch: 18 },
        { wch: 13 },
        { wch: 13 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Suivi de Stock');

      XLSX.writeFile(wb, `suivi-stock-${new Date().getTime()}.xlsx`);

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

  showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set('');
    }, 3000);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 2
    }).format(amount).replace('HTG', 'Gdes');
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

  getStockBadgeIcon(quantity: number, minStock: number): string {
    if (quantity === 0) return 'hugeAlert01';
    if (quantity <= minStock) return 'hugeAlert01';
    return 'hugeCheckmarkCircle04';
  }
}
