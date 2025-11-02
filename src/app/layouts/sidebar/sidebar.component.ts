import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { SidebarService } from '../../services/sidebar/sidebar.service';
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
  hugeUser
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-sidebar',
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
      hugeUser
    })
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isCollapsed = this.sidebarService.collapsed;
  menuItems: Array<{ icon: string; label: string; route: string; active: boolean }> = [];

  ngOnInit() {
    // Initialiser les items du menu selon le rôle
    const isAdmin = this.authService.isAdmin();
    const prefix = isAdmin ? '/admin' : '/seller';

    if (isAdmin) {
      // Menu admin
      this.menuItems = [
        { icon: 'hugeDashboardBrowsing', label: 'Dashboard', route: `${prefix}/dashboard`, active: false },
        { icon: 'hugePackageSent', label: 'Produits', route: `${prefix}/products`, active: false },
        { icon: 'hugeAppleStocks', label: 'Suivi des stocks', route: `${prefix}/stocks`, active: false },
        { icon: 'hugeUserMultiple', label: 'Utilisateurs', route: `${prefix}/users`, active: false },
        { icon: 'hugeContracts', label: 'Rapports financiers', route: `${prefix}/reports`, active: false },
        { icon: 'hugeSettings01', label: 'Paramètres', route: `${prefix}/settings`, active: false }
      ];
    } else {
      // Menu vendeur (sans Produits, sans Suivi des stocks, sans Utilisateurs)
      this.menuItems = [
        { icon: 'hugeDashboardBrowsing', label: 'Dashboard', route: `${prefix}/dashboard`, active: false },
        { icon: 'hugeContracts', label: 'Rapports financiers', route: `${prefix}/reports`, active: false },
        { icon: 'hugeUser', label: 'Profil', route: `${prefix}/profile`, active: false }
      ];
    }
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  logout(): void {
    this.authService.logout();
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}
