import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { Subject, takeUntil } from 'rxjs';
import {
  hugeDashboardBrowsing,
  hugeShoppingCart01,
  hugeFileDownload,
  hugeSettings02,
  hugeLogout03,
  hugeMenu01,
  hugeArrowLeft01,
  hugePackageOpen,
  hugeInvoice01,
  hugeUserMultiple,
  hugeUser
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIcon],
  viewProviders: [
    provideIcons({
      hugeDashboardBrowsing,
      hugeShoppingCart01,
      hugeFileDownload,
      hugeSettings02,
      hugeLogout03,
      hugeMenu01,
      hugeArrowLeft01,
      hugePackageOpen,
      hugeInvoice01,
      hugeUserMultiple,
      hugeUser
    })
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private destroy$ = new Subject<void>();

  // État du sidebar (depuis le service partagé)
  isCollapsed = this.sidebarService.isCollapsed;

  // Utilisateur actuel
  currentUser = signal<any>(null);

  // Menu items complets (tous les items possibles)
  allMenuItems = [
    { icon: 'hugeDashboardBrowsing', label: 'Dashboard', route: '/seller/dashboard', active: false, key: 'dashboard' },
    { icon: 'hugeShoppingCart01', label: 'Point de Vente', route: '/seller/pos', active: true, key: 'pos' },
    { icon: 'hugeInvoice01', label: 'Historique', route: '/seller/sales-history', active: false, key: 'history' },
    { icon: 'hugeFileDownload', label: 'Rapports', route: '/seller/reports', active: false, key: 'reports' },
    { icon: 'hugeUser', label: 'Profil', route: '/seller/profile', active: false, key: 'profile' }
  ];

  // Menu items filtrés selon les permissions
  menuItems = computed(() => {
    const user = this.currentUser();
    if (!user || !user.permissions) {
      // Si pas de permissions définies, afficher tous les items
      return this.allMenuItems;
    }

    // Filtrer les items selon les permissions
    return this.allMenuItems.filter(item => {
      const permissionKey = item.key as keyof typeof user.permissions;
      return user.permissions[permissionKey] !== false;
    });
  });

  ngOnInit(): void {
    // S'abonner aux changements de l'utilisateur actuel
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser.set(user);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  logout(): void {
    this.authService.logout();
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}
