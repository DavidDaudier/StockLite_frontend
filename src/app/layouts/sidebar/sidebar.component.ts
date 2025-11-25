import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeDashboardBrowsing,
  hugeArrowLeft01,
  hugeDashboardSquareEdit,
  hugePackageSent,
  hugeContracts,
  hugeAppleStocks,
  hugeSettings01,
  hugeLogout03,
  hugeUserMultiple,
  hugeUser,
  hugeAnalyticsUp,
  hugeInvestigation,
  hugeVideoReplay,
  hugePrinter,
  hugeClock05,
  hugeTime04,
  hugeFileDownload,
  hugeAudit01
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    RouterModule
  ],
  viewProviders: [
    provideIcons({
      hugeDashboardBrowsing,
      hugeArrowLeft01,
      hugeDashboardSquareEdit,
      hugePackageSent,
      hugeContracts,
      hugeAppleStocks,
      hugeSettings01,
      hugeLogout03,
      hugeUserMultiple,
      hugeUser,
      hugeAnalyticsUp,
      hugeInvestigation,
      hugeVideoReplay,
      hugePrinter,
      hugeClock05,
      hugeTime04,
      hugeFileDownload,
      hugeAudit01,
    })
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Desktop collapsed state
  collapsed = this.sidebarService.collapsed;
  // Mobile open state
  mobileOpen = this.sidebarService.mobileOpen;

  menuItems: Array<{ icon: string; label: string; route: string; active: boolean }> = [];

  constructor() {
    // Close mobile sidebar on route change
    this.router.events.subscribe(() => {
      this.sidebarService.closeMobile();
    });
  }

  ngOnInit() {
    // Initialiser les items du menu selon le rôle et les permissions
    const isAdmin = this.authService.isAdmin();
    const isSuperAdmin = this.authService.isSuperAdmin();
    const prefix = isAdmin ? '/admin' : '/seller';

    // Définir tous les menus possibles
    const allMenus = {
      dashboard: { icon: 'hugeDashboardBrowsing', label: 'Dashboard', route: `${prefix}/dashboard`, page: 'dashboard' },
      products: { icon: 'hugePackageSent', label: 'Produits', route: `${prefix}/products`, page: 'products' },
      pos: { icon: 'hugeDashboardSquareEdit', label: 'Point de vente', route: `${prefix}/pos`, page: 'pos' },
      'stock-tracking': { icon: 'hugeAppleStocks', label: 'Suivi de Stocks', route: `${prefix}/stocks`, page: 'stocks' },
      stocks: { icon: 'hugeAppleStocks', label: 'Suivi de Stocks', route: `${prefix}/stocks`, page: 'stocks' },
      history: { icon: 'hugeClock05', label: 'Historique', route: `${prefix}/history`, page: 'history' },
      // Label différent selon le rôle: Admin = "Rapports Financiers", Seller = "Rapports"
      reports: { icon: 'hugeAnalyticsUp', label: isAdmin ? 'Rapports Financiers' : 'Rapports', route: `${prefix}/reports`, page: 'reports' },
      // 'report-vendor': { icon: 'hugeAnalyticsUp', label: 'Rapports Vendeur', route: `${prefix}/report-vendor`, page: 'report-vendor' },
      inventories: { icon: 'hugeInvestigation', label: 'Inventaires', route: `${prefix}/inventories`, page: 'inventories' },
      zoom: { icon: 'hugeVideoReplay', label: 'Zoom', route: `${prefix}/zoom`, page: 'zoom' },
      audit: { icon: 'hugeAudit01', label: 'Audit Logs', route: `${prefix}/audit`, page: 'audit' },
      users: { icon: 'hugeUserMultiple', label: 'Utilisateurs', route: `${prefix}/users`, page: 'users' },
      sessions: { icon: 'hugeTime04', label: 'Sessions', route: `${prefix}/sessions`, page: 'sessions' },
      profile: { icon: 'hugeUser', label: 'Profil', route: `${prefix}/profile`, page: 'profile' },
      'pos-printer': { icon: 'hugePrinter', label: 'POS/Printer', route: `${prefix}/pos-printer`, page: 'pos-printer' },
      settings: { icon: 'hugeSettings01', label: 'Paramètre', route: `${prefix}/settings`, page: 'settings' },
      
    };

    // SEULEMENT Super Admin : afficher toutes les pages
    if (isSuperAdmin) {
      this.menuItems = [
        allMenus.dashboard,
        allMenus.products,
        allMenus.pos,
        allMenus['stock-tracking'],
        allMenus.history,
        allMenus.reports,
        // allMenus['report-vendor'],
        allMenus.inventories,
        allMenus.zoom,
        allMenus.audit,
        allMenus.users,
        allMenus.sessions,
        allMenus.profile,
        allMenus['pos-printer'],
        allMenus.settings,
      ].map(item => ({ ...item, active: false }));
      return;
    }

    // Pour les admins réguliers et vendeurs : construire le menu basé sur les permissions
    const accessiblePages = this.authService.getAccessiblePages();
    this.menuItems = [];

    // Ajouter les menus auxquels l'utilisateur a accès
    for (const page of accessiblePages) {
      const menu = allMenus[page as keyof typeof allMenus];
      if (menu) {
        this.menuItems.push({ ...menu, active: false });
      }
    }

    // Si aucune permission définie
    if (this.menuItems.length === 0) {
      if (isAdmin) {
        // Admin sans permissions = afficher un message ou rediriger
        // Pour l'instant, on affiche au moins le profil
        this.menuItems = [
          allMenus.profile
        ].map(item => ({ ...item, active: false }));
      } else {
        // Vendeur par défaut : 5 pages de base
        this.menuItems = [
          allMenus.dashboard,
          allMenus.pos,
          allMenus.history,
          allMenus.reports,
          allMenus.profile
        ].map(item => ({ ...item, active: false }));
      }
    }
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }
  
  closeMobileSidebar() {
    this.sidebarService.closeMobile();
  }

  logout(): void {
    this.authService.logout();
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}
