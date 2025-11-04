import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { User, CreateUserDto, UpdateUserDto, UserRole, UserPermissions } from '../../core/models/user.model';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { AppInfoService } from '../../services/app-info.service';
import { AppInfo } from '../../models/app-info.model';
import { DEFAULT_APP_INFO } from '../../constants/app-defaults';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  hugeEdit02,
  hugeDelete03,
  // hugePlusSign,
  hugeUserAdd01,
  hugeUserGroup,
  hugeUserSettings01,
  hugeUserSwitch,
  hugeUserCheck01,
  hugeUserBlock01,
  hugeSearch01,
  hugeCancel01,
  // hugeUserCircle,
  hugeUserAccount,
  hugeSettings02,
  hugeCheckmarkCircle02,
  hugeCheckmarkCircle04,
  hugeAlert01,
  hugePdf01,
  hugeXls01,
  hugeTickDouble02,
  hugeCheckmarkSquare02,
  hugeReload,
  hugeEye,
  hugeViewOff
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugeEdit02,
      hugeDelete03,
      // hugePlusSign,
      hugeUserAdd01,
      hugeUserGroup,
      hugeUserSettings01,
      hugeUserSwitch,
      hugeUserCheck01,
      hugeUserBlock01,
      hugeSearch01,
      hugeCancel01,
      // hugeUserCircle,
      hugeUserAccount,
      hugeSettings02,
      hugeCheckmarkCircle02,
      hugeCheckmarkCircle04,
      hugeAlert01,
      hugePdf01,
      hugeXls01,
      hugeTickDouble02,
      hugeCheckmarkSquare02,
      hugeReload,
      hugeEye,
      hugeViewOff
    })
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Modal state
  showModal = signal(false);
  showPermissionsModal = signal(false);
  modalMode: 'create' | 'edit' = 'create';
  currentUser: User | null = null;

  // Form data
  formData: CreateUserDto = {
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: UserRole.SELLER
  };

  // Permissions form - dynamique selon le rôle
  permissionsForm: any = {};

  // Pages disponibles pour chaque rôle
  sellerPages = ['dashboard', 'pos', 'history', 'reports', 'profile'];
  adminPages = [
    'dashboard',
    'products',
    'pos',
    'stock-tracking',
    'history',
    'reports',
    'report-vendor',
    'inventories',
    'zoom',
    'users',
    'profile',
    'pos-printer',
    'settings'
  ];

  // Labels des pages
  pageLabels: { [key: string]: string } = {
    dashboard: 'Dashboard',
    products: 'Produits',
    pos: 'Point de vente',
    'stock-tracking': 'Suivi de Stocks',
    history: 'Historique',
    reports: 'Rapports Financiers',
    'report-vendor': 'Rapports Vendeur',
    inventories: 'Inventaires',
    zoom: 'Zoom',
    users: 'Utilisateurs',
    profile: 'Profil',
    'pos-printer': 'POS/Printer',
    settings: 'Paramètre'
  };

  // Search
  searchTerm = signal('');

  // Filter by role
  roleFilter = signal<'all' | UserRole>('all');

  // Stats
  stats = signal({
    total: 0,
    admins: 0,
    sellers: 0,
    active: 0,
    inactive: 0
  });

  // Toggle stats visibility
  showStats = signal(true);

  // Pagination (using signals)
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  // Utilisateurs paginés (computed)
  paginatedUsers = computed(() => {
    const filtered = this.filteredUsers();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filtered.slice(startIndex, endIndex);
  });

  // Info pagination (computed)
  paginationInfo = computed(() => {
    const total = this.filteredUsers().length;
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

  // App info for exports
  appInfo = signal<AppInfo | null>(DEFAULT_APP_INFO);

  // Selection mode
  selectionMode = signal<boolean>(false);
  selectedUserIds = signal<Set<string>>(new Set());
  showMultipleDeleteModal = signal<boolean>(false);

  // Single user deletion
  showDeleteModal = signal<boolean>(false);
  userToDelete = signal<User | null>(null);

  // Computed: check if all users are selected
  allUsersSelected = computed(() => {
    const paginated = this.paginatedUsers();
    const selected = this.selectedUserIds();
    if (paginated.length === 0) return false;
    return paginated.every(user => selected.has(user.id));
  });

  // Refresh last login state
  refreshingLastLoginIds = signal<Set<string>>(new Set());

  // Expose UserRole enum to template
  UserRole = UserRole;

  constructor(
    private usersService: UsersService,
    private appInfoService: AppInfoService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadStats();
    this.loadAppInfo();
  }

  loadAppInfo(): void {
    this.appInfoService.getAppInfo().subscribe({
      next: (appInfo) => {
        this.appInfo.set(appInfo);
      }
    });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService.getAll().subscribe({
      next: (data) => {
        this.users.set(data);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur chargement utilisateurs:', error);
        this.showError('Erreur lors du chargement des utilisateurs');
        this.loading.set(false);
      }
    });
  }

  loadStats(): void {
    this.usersService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
      },
      error: (error) => {
        console.error('Erreur chargement stats:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.users();

    // Filter by role
    if (this.roleFilter() !== 'all') {
      filtered = filtered.filter(user => user.role === this.roleFilter());
    }

    // Filter by search term
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.fullName?.toLowerCase().includes(term)
      );
    }

    // Sort: Super Admin always first
    filtered = filtered.sort((a, b) => {
      if (a.isSuperAdmin && !b.isSuperAdmin) return -1;
      if (!a.isSuperAdmin && b.isSuperAdmin) return 1;
      return 0;
    });

    this.filteredUsers.set(filtered);
    this.currentPage.set(1); // Réinitialiser à la première page après filtrage
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.currentUser = null;
    this.formData = {
      username: '',
      email: '',
      fullName: '',
      password: '',
      role: UserRole.SELLER
    };
    // Initialize permissions based on default role (SELLER)
    this.initializePermissions(UserRole.SELLER);
    this.showModal.set(true);
  }

  openEditModal(user: User): void {
    this.modalMode = 'edit';
    this.currentUser = user;
    this.formData = {
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      password: '', // Don't show existing password
      role: user.role
    };

    // Load permissions based on user's role and existing permissions
    // Always initialize with all pages first, then merge existing permissions
    this.initializePermissions(user.role);

    if (user.permissions) {
      // Merge existing permissions with initialized permissions
      // This ensures new pages added later are included with default values
      const existingPerms = user.permissions as any;
      for (const page in existingPerms) {
        if (this.permissionsForm[page] !== undefined) {
          this.permissionsForm[page] = JSON.parse(JSON.stringify(existingPerms[page]));
        }
      }
    }

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.currentUser = null;
    this.formData = {
      username: '',
      email: '',
      fullName: '',
      password: '',
      role: UserRole.SELLER
    };
    // Reset permissions form
    this.permissionsForm = {
      dashboard: false,
      pos: false,
      history: false,
      reports: false,
      profile: false
    };
  }

  saveUser(): void {
    if (!this.formData.username.trim()) {
      this.showError('Le nom d\'utilisateur est requis');
      return;
    }

    if (this.modalMode === 'create' && !this.formData.password) {
      this.showError('Le mot de passe est requis');
      return;
    }

    this.loading.set(true);

    if (this.modalMode === 'create') {
      // Clean up empty string fields before sending to backend
      const cleanedData: CreateUserDto = {
        username: this.formData.username.trim(),
        password: this.formData.password,
        role: this.formData.role
      };

      // Only include email if it's not empty
      if (this.formData.email && this.formData.email.trim()) {
        cleanedData.email = this.formData.email.trim();
      }

      // Only include fullName if it's not empty
      if (this.formData.fullName && this.formData.fullName.trim()) {
        cleanedData.fullName = this.formData.fullName.trim();
      }

      this.usersService.create(cleanedData).subscribe({
        next: (createdUser) => {
          // Save permissions for both sellers and admins
          console.log('Envoi des permissions:', JSON.stringify(this.permissionsForm, null, 2));
          this.usersService.updatePermissions(createdUser.id, this.permissionsForm).subscribe({
            next: () => {
              this.showSuccess('Utilisateur et permissions créés avec succès');
              this.loadUsers();
              this.loadStats();
              this.closeModal();
            },
            error: (error) => {
              console.error('Erreur création permissions:', error);
              this.showError('Utilisateur créé mais erreur lors de la création des permissions');
              this.loadUsers();
              this.loadStats();
              this.closeModal();
            }
          });
        },
        error: (error) => {
          console.error('Erreur création utilisateur:', error);
          this.showError(error.error?.message || 'Erreur lors de la création de l\'utilisateur');
          this.loading.set(false);
        }
      });
    } else if (this.currentUser) {
      // Clean up empty string fields before sending to backend
      const updateData: UpdateUserDto = {
        username: this.formData.username.trim(),
        role: this.formData.role
      };

      // Only include email if it's not empty
      if (this.formData.email && this.formData.email.trim()) {
        updateData.email = this.formData.email.trim();
      }

      // Only include fullName if it's not empty
      if (this.formData.fullName && this.formData.fullName.trim()) {
        updateData.fullName = this.formData.fullName.trim();
      }

      // Only include password if it was changed
      if (this.formData.password && this.formData.password.trim()) {
        updateData.password = this.formData.password.trim();
      }

      this.usersService.update(this.currentUser.id, updateData).subscribe({
        next: (updatedUser) => {
          // Save permissions for both sellers and admins
          this.usersService.updatePermissions(updatedUser.id, this.permissionsForm).subscribe({
            next: () => {
              // Mise à jour optimiste de l'utilisateur dans la liste
              const updatedUsers = this.users().map(u =>
                u.id === updatedUser.id ? updatedUser : u
              );
              this.users.set(updatedUsers);
              this.applyFilters();

              this.showSuccess('Utilisateur et permissions modifiés avec succès');
              this.loadStats();
              this.closeModal();
              this.loading.set(false);
            },
            error: (error) => {
              console.error('Erreur modification permissions:', error);
              this.showError('Utilisateur modifié mais erreur lors de la modification des permissions');
              this.loadStats();
              this.closeModal();
              this.loading.set(false);
            }
          });
        },
        error: (error) => {
          console.error('Erreur modification utilisateur:', error);
          this.showError(error.error?.message || 'Erreur lors de la modification de l\'utilisateur');
          this.loading.set(false);
        }
      });
    }
  }

  toggleUserActive(user: User): void {
    this.loading.set(true);
    this.usersService.toggleActive(user.id).subscribe({
      next: () => {
        this.showSuccess(`Utilisateur ${user.isActive ? 'désactivé' : 'activé'} avec succès`);
        this.loadUsers();
        this.loadStats();
      },
      error: (error) => {
        console.error('Erreur toggle utilisateur:', error);
        this.showError('Erreur lors de la modification du statut');
        this.loading.set(false);
      }
    });
  }

  deleteUser(user: User): void {
    this.userToDelete.set(user);
    this.showDeleteModal.set(true);
  }

  confirmDeleteUser(): void {
    const user = this.userToDelete();
    if (!user) return;

    this.loading.set(true);
    this.usersService.delete(user.id).subscribe({
      next: () => {
        this.showSuccess('Utilisateur supprimé avec succès');
        this.showDeleteModal.set(false);
        this.userToDelete.set(null);
        this.loadUsers();
        this.loadStats();
      },
      error: (error) => {
        console.error('Erreur suppression utilisateur:', error);
        this.showError('Erreur lors de la suppression de l\'utilisateur');
        this.showDeleteModal.set(false);
        this.userToDelete.set(null);
        this.loading.set(false);
      }
    });
  }

  getRoleBadgeClass(role: UserRole): string {
    return role === UserRole.ADMIN
      ? 'bg-purple-100 text-purple-800'
      : 'bg-blue-100 text-blue-800';
  }

  getRoleLabel(role: UserRole): string {
    return role === UserRole.ADMIN ? 'Admin' : 'Vendeur';
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

  openPermissionsModal(user: User): void {
    this.currentUser = user;

    // Initialiser les permissions selon le rôle
    if (user.role === UserRole.SELLER) {
      // Pour les sellers : simple boolean
      this.permissionsForm = user.permissions || {
        dashboard: true,
        pos: true,
        history: true,
        reports: true,
        profile: true
      };
    } else if (user.role === UserRole.ADMIN) {
      // Pour les admins : objets avec actions CRUD
      this.initializePermissions(UserRole.ADMIN);

      // Charger les permissions existantes si elles existent
      if (user.permissions) {
        const existingPerms = user.permissions as any;
        for (const page in existingPerms) {
          if (this.permissionsForm[page] !== undefined) {
            this.permissionsForm[page] = JSON.parse(JSON.stringify(existingPerms[page]));
          }
        }
      }
    }

    this.showPermissionsModal.set(true);
  }

  closePermissionsModal(): void {
    this.showPermissionsModal.set(false);
    this.currentUser = null;
  }

  savePermissions(): void {
    if (!this.currentUser) return;

    this.loading.set(true);
    this.usersService.updatePermissions(this.currentUser.id, this.permissionsForm).subscribe({
      next: () => {
        this.showSuccess('Permissions mises à jour avec succès');
        this.loadUsers();
        this.loadStats();
        this.closePermissionsModal();
      },
      error: (error) => {
        console.error('Erreur mise à jour permissions:', error);
        this.showError('Erreur lors de la mise à jour des permissions');
        this.loading.set(false);
      }
    });
  }

  // Vérifier si une page a toutes les permissions (pour le checkbox principal)
  isPageFullyAccessible(page: string): boolean {
    const perms = this.permissionsForm[page];
    if (!perms || typeof perms === 'boolean') return false;
    return perms.create && perms.read && perms.update && perms.delete;
  }

  // Toggle toutes les permissions d'une page
  toggleAllAdminPermissions(page: string): void {
    const isFullyAccessible = this.isPageFullyAccessible(page);
    const newValue = !isFullyAccessible;

    this.permissionsForm[page] = {
      create: newValue,
      read: newValue,
      update: newValue,
      delete: newValue
    };
  }

  // Mettre à jour le checkbox principal quand une action change
  updatePageCheckbox(page: string): void {
    // Cette méthode est appelée automatiquement par le two-way binding
    // Pas besoin de logique supplémentaire car le checkbox principal est calculated
  }

  // === Gestion des Permissions ===

  // Initialiser les permissions selon le rôle
  initializePermissions(role: UserRole): void {
    if (role === UserRole.SELLER) {
      // Permissions simples pour vendeurs (toutes à false par défaut)
      this.permissionsForm = {};
      this.sellerPages.forEach(page => {
        this.permissionsForm[page] = false;
      });
    } else if (role === UserRole.ADMIN) {
      // Permissions granulaires pour admins (toutes les actions à false par défaut)
      this.permissionsForm = {};
      this.adminPages.forEach(page => {
        this.permissionsForm[page] = {
          create: false,
          read: false,
          update: false,
          delete: false
        };
      });
    }
  }

  // Quand le rôle change dans le formulaire
  onRoleChange(): void {
    this.initializePermissions(this.formData.role);
  }

  // Toggle une permission de page pour un vendeur
  toggleSellerPermission(page: string): void {
    // Note: ngModel gère déjà la modification de la valeur via two-way binding
    // Ne rien faire ici pour éviter le double-toggle
  }

  // Toggle une action spécifique pour un admin
  toggleAdminAction(page: string, action: 'create' | 'read' | 'update' | 'delete'): void {
    // Note: ngModel gère déjà la modification de la valeur via two-way binding
    // Cette méthode peut servir pour des actions additionnelles si nécessaire
    if (!this.permissionsForm[page]) {
      this.permissionsForm[page] = {
        create: false,
        read: false,
        update: false,
        delete: false
      };
    }
    // Ne pas inverser la valeur ici car ngModel l'a déjà fait!
  }

  // Toggle "Tous" pour une page admin
  toggleAllActions(page: string): void {
    const allSelected = this.areAllActionsSelected(page);
    if (!this.permissionsForm[page]) {
      this.permissionsForm[page] = {};
    }
    this.permissionsForm[page] = {
      create: !allSelected,
      read: !allSelected,
      update: !allSelected,
      delete: !allSelected
    };
  }

  // Vérifier si toutes les actions sont sélectionnées pour une page
  areAllActionsSelected(page: string): boolean {
    const pagePerms = this.permissionsForm[page];
    if (!pagePerms) return false;
    return pagePerms.create && pagePerms.read && pagePerms.update && pagePerms.delete;
  }

  // Vérifier si au moins une action est sélectionnée pour une page admin
  hasAnyAction(page: string): boolean {
    const pagePerms = this.permissionsForm[page];
    if (!pagePerms || typeof pagePerms === 'boolean') return false;
    return pagePerms.create || pagePerms.read || pagePerms.update || pagePerms.delete;
  }

  // Obtenir les pages disponibles selon le rôle sélectionné
  getAvailablePages(): string[] {
    return this.formData.role === UserRole.SELLER ? this.sellerPages : this.adminPages;
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

  exportToPDF(): void {
    try {
      const info = this.appInfo();
      if (!info) {
        this.showError('Impossible de générer le PDF');
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
      doc.text('Rapport de Gestion des Utilisateurs', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Généré le : ${dateStr} à ${timeStr}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      const allUsers = this.users();

      // Filtrer les utilisateurs par catégorie
      const adminUsers = allUsers.filter(u => u.role === UserRole.ADMIN);
      const sellerUsers = allUsers.filter(u => u.role === UserRole.SELLER);
      const activeUsers = allUsers.filter(u => u.isActive);
      const inactiveUsers = allUsers.filter(u => !u.isActive);

      // Helper pour créer les données du tableau
      const createTableData = (users: User[]) => {
        return users.map(user => [
          user.fullName || '',
          user.username,
          user.email || '',
          this.getRoleLabel(user.role),
          user.isActive ? 'Actif' : 'Inactif',
          user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR') : 'Jamais'
        ] as string[]);
      };

      const columnStyles = {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 45 },
        3: { cellWidth: 25, halign: 'center' as const },
        4: { cellWidth: 20, halign: 'center' as const },
        5: { cellWidth: 25, halign: 'center' as const }
      };

      // 1. Tous les utilisateurs (Bleu)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Tous les Utilisateurs (${allUsers.length})`, 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion']],
        body: createTableData(allUsers),
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235], // blue-600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 8 },
        columnStyles
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // 2. Administrateurs (Violet)
      if (adminUsers.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Administrateurs (${adminUsers.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion']],
          body: createTableData(adminUsers),
          theme: 'striped',
          headStyles: {
            fillColor: [147, 51, 234], // purple-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // 3. Vendeurs (Jaune)
      if (sellerUsers.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Vendeurs (${sellerUsers.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion']],
          body: createTableData(sellerUsers),
          theme: 'striped',
          headStyles: {
            fillColor: [202, 138, 4], // yellow-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // 4. Utilisateurs actifs (Vert)
      if (activeUsers.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Utilisateurs Actifs (${activeUsers.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion']],
          body: createTableData(activeUsers),
          theme: 'striped',
          headStyles: {
            fillColor: [22, 163, 74], // green-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // 5. Utilisateurs inactifs (Gris)
      if (inactiveUsers.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Utilisateurs Inactifs (${inactiveUsers.length})`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion']],
          body: createTableData(inactiveUsers),
          theme: 'striped',
          headStyles: {
            fillColor: [75, 85, 99], // gray-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          columnStyles
        });
      }

      doc.save(`gestion-utilisateurs-${new Date().getTime()}.pdf`);
      this.showSuccess('PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      this.showError('Une erreur est survenue lors de la génération du PDF');
    }
  }

  exportToExcel(): void {
    try {
      const info = this.appInfo();
      if (!info) {
        this.showError('Impossible de générer le fichier Excel');
        return;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR');
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const allUsers = this.users();

      // Filtrer les utilisateurs par catégorie
      const adminUsers = allUsers.filter(u => u.role === UserRole.ADMIN);
      const sellerUsers = allUsers.filter(u => u.role === UserRole.SELLER);
      const activeUsers = allUsers.filter(u => u.isActive);
      const inactiveUsers = allUsers.filter(u => !u.isActive);

      // Helper pour créer les données du tableau
      const createDataRows = (users: User[]) => {
        return users.map(user => [
          user.fullName || '',
          user.username,
          user.email || '',
          this.getRoleLabel(user.role),
          user.isActive ? 'Actif' : 'Inactif',
          user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR') : 'Jamais'
        ]);
      };

      // Construction du fichier Excel
      const allData: any[] = [
        [info.nom_app, '', '', '', '', ''],
        [info.adresse_app || '', '', '', '', '', ''],
        [`Tel: ${info.phone_app || ''} | Email: ${info.email_app || ''}`, '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['Rapport de Gestion des Utilisateurs', '', '', '', '', ''],
        [`Généré le: ${dateStr} à ${timeStr}`, '', '', '', '', ''],
        ['', '', '', '', '', ''],

        // 1. Tous les utilisateurs (Bleu)
        [`Tous les Utilisateurs (${allUsers.length})`, '', '', '', '', ''],
        ['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion'],
        ...createDataRows(allUsers),
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
      ];

      // 2. Administrateurs (Violet)
      if (adminUsers.length > 0) {
        allData.push(
          [`Administrateurs (${adminUsers.length})`, '', '', '', '', ''],
          ['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion'],
          ...createDataRows(adminUsers),
          ['', '', '', '', '', ''],
          ['', '', '', '', '', '']
        );
      }

      // 3. Vendeurs (Jaune)
      if (sellerUsers.length > 0) {
        allData.push(
          [`Vendeurs (${sellerUsers.length})`, '', '', '', '', ''],
          ['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion'],
          ...createDataRows(sellerUsers),
          ['', '', '', '', '', ''],
          ['', '', '', '', '', '']
        );
      }

      // 4. Utilisateurs actifs (Vert)
      if (activeUsers.length > 0) {
        allData.push(
          [`Utilisateurs Actifs (${activeUsers.length})`, '', '', '', '', ''],
          ['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion'],
          ...createDataRows(activeUsers),
          ['', '', '', '', '', ''],
          ['', '', '', '', '', '']
        );
      }

      // 5. Utilisateurs inactifs (Gris)
      if (inactiveUsers.length > 0) {
        allData.push(
          [`Utilisateurs Inactifs (${inactiveUsers.length})`, '', '', '', '', ''],
          ['Nom complet', 'Username', 'Email', 'Rôle', 'Statut', 'Dernière connexion'],
          ...createDataRows(inactiveUsers)
        );
      }

      const ws = XLSX.utils.aoa_to_sheet(allData);

      ws['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gestion Utilisateurs');

      XLSX.writeFile(wb, `gestion-utilisateurs-${new Date().getTime()}.xlsx`);

      this.showSuccess('Fichier Excel exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du fichier Excel:', error);
      this.showError('Une erreur est survenue lors de la génération du fichier Excel');
    }
  }

  // Selection mode methods
  toggleSelectionMode(): void {
    if (this.selectionMode()) {
      // Si on sort du mode sélection, supprimer les utilisateurs sélectionnés
      if (this.selectedUserIds().size > 0) {
        this.deleteSelectedUsers();
      } else {
        // Sinon juste désactiver le mode
        this.selectionMode.set(false);
        this.selectedUserIds.set(new Set());
      }
    } else {
      // Activer le mode sélection
      this.selectionMode.set(true);
      this.selectedUserIds.set(new Set());
    }
  }

  toggleUserSelection(userId: string): void {
    const selected = new Set(this.selectedUserIds());
    if (selected.has(userId)) {
      selected.delete(userId);
    } else {
      selected.add(userId);
    }
    this.selectedUserIds.set(selected);
  }

  toggleSelectAll(): void {
    const paginated = this.paginatedUsers();
    const selected = new Set(this.selectedUserIds());

    if (this.allUsersSelected()) {
      // Deselect all on current page
      paginated.forEach(user => selected.delete(user.id));
    } else {
      // Select all on current page
      paginated.forEach(user => selected.add(user.id));
    }

    this.selectedUserIds.set(selected);
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds().has(userId);
  }

  deleteSelectedUsers(): void {
    const selectedIds = Array.from(this.selectedUserIds());

    if (selectedIds.length === 0) {
      this.showError('Veuillez sélectionner au moins un utilisateur');
      return;
    }

    this.showMultipleDeleteModal.set(true);
  }

  closeMultipleDeleteModal(): void {
    this.showMultipleDeleteModal.set(false);
  }

  confirmMultipleDelete(): void {
    const selectedIds = Array.from(this.selectedUserIds());

    if (selectedIds.length === 0) {
      return;
    }

    this.loading.set(true);
    let completedRequests = 0;
    let errorOccurred = false;

    selectedIds.forEach(userId => {
      this.usersService.delete(userId).subscribe({
        next: () => {
          completedRequests++;
          if (completedRequests === selectedIds.length) {
            this.finishMultipleDelete(completedRequests - (errorOccurred ? 1 : 0), errorOccurred ? 1 : 0);
          }
        },
        error: (error) => {
          console.error('Erreur suppression utilisateur:', error);
          errorOccurred = true;
          completedRequests++;
          if (completedRequests === selectedIds.length) {
            this.finishMultipleDelete(selectedIds.length - 1, 1);
          }
        }
      });
    });
  }

  private finishMultipleDelete(deletedCount: number, errorCount: number): void {
    // Recharger les utilisateurs
    this.loadUsers();
    this.loadStats();

    // Fermer le modal
    this.closeMultipleDeleteModal();

    // Réinitialiser le mode sélection
    this.selectionMode.set(false);
    this.selectedUserIds.set(new Set());
    this.loading.set(false);

    // Afficher le message de succès
    if (deletedCount > 0) {
      this.showSuccess(`${deletedCount} utilisateur(s) supprimé(s) avec succès`);
    }
    if (errorCount > 0) {
      setTimeout(() => {
        this.showError(`Erreur lors de la suppression de ${errorCount} utilisateur(s)`);
      }, 3000);
    }
  }

  // Refresh last login methods
  refreshLastLogin(userId: string): void {
    // Add to refreshing set
    const refreshing = new Set(this.refreshingLastLoginIds());
    refreshing.add(userId);
    this.refreshingLastLoginIds.set(refreshing);

    // Get user details to refresh lastLoginAt
    this.usersService.getById(userId).subscribe({
      next: (updatedUser) => {
        // Update the user in the list
        const updatedUsers = this.users().map(u =>
          u.id === updatedUser.id ? { ...u, lastLoginAt: updatedUser.lastLoginAt } : u
        );
        this.users.set(updatedUsers);
        this.applyFilters();

        // Remove from refreshing set
        const refreshingAfter = new Set(this.refreshingLastLoginIds());
        refreshingAfter.delete(userId);
        this.refreshingLastLoginIds.set(refreshingAfter);

        this.showSuccess('Dernière connexion mise à jour');
      },
      error: (error) => {
        console.error('Erreur rafraîchissement lastLoginAt:', error);
        this.showError('Erreur lors de la mise à jour');

        // Remove from refreshing set
        const refreshingAfter = new Set(this.refreshingLastLoginIds());
        refreshingAfter.delete(userId);
        this.refreshingLastLoginIds.set(refreshingAfter);
      }
    });
  }

  isRefreshingLastLogin(userId: string): boolean {
    return this.refreshingLastLoginIds().has(userId);
  }

  // Get user initials from full name
  getUserInitials(fullName: string | undefined | null): string {
    if (!fullName || !fullName.trim()) {
      return '?';
    }

    const names = fullName.trim().split(/\s+/); // Split by whitespace

    if (names.length === 1) {
      // Single name: return first letter
      return names[0].charAt(0).toUpperCase();
    } else {
      // Multiple names: return first letter of first and last name
      const firstInitial = names[0].charAt(0).toUpperCase();
      const lastInitial = names[names.length - 1].charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
  }

  // Format last login date with relative time
  formatLastLogin(lastLoginAt: Date | null | undefined): string {
    if (!lastLoginAt) {
      return 'Jamais';
    }

    const now = new Date();
    const loginDate = new Date(lastLoginAt);

    // Reset time to midnight for date comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const loginDay = new Date(loginDate.getFullYear(), loginDate.getMonth(), loginDate.getDate());

    // Format time in 12-hour format
    const hours = loginDate.getHours();
    const minutes = loginDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    const timeString = `${displayHours}:${displayMinutes} ${ampm}`;

    if (loginDay.getTime() === today.getTime()) {
      return `Aujourd'hui, ${timeString}`;
    } else if (loginDay.getTime() === yesterday.getTime()) {
      return `Hier à ${timeString}`;
    } else {
      // Format: dd/MM/yyyy hh:mm AM/PM
      const day = loginDate.getDate() < 10 ? '0' + loginDate.getDate() : loginDate.getDate();
      const month = (loginDate.getMonth() + 1) < 10 ? '0' + (loginDate.getMonth() + 1) : (loginDate.getMonth() + 1);
      const year = loginDate.getFullYear();
      return `${day}/${month}/${year} ${timeString}`;
    }
  }
}
