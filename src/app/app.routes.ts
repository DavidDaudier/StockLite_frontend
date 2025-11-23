import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { sellerGuard } from './core/guards/seller.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },

  // Seller routes (Vendeur)
  {
    path: 'seller',
    canActivate: [authGuard, sellerGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/seller/seller-dashboard/seller-dashboard.component').then(m => m.SellerDashboardComponent)
      },
      {
        path: 'pos',
        loadComponent: () => import('./pages/seller/pos/pos.component').then(m => m.PosComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/seller/seller-reports/seller-reports.component').then(m => m.SellerReportsComponent)
      },
      {
        path: 'activities',
        loadComponent: () => import('./pages/seller/activities/activities.component').then(m => m.ActivitiesComponent)
      },
      {
        path: 'drafts',
        loadComponent: () => import('./pages/seller/draft-list/draft-list.component').then(m => m.DraftListComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/seller/seller-products/seller-products.component').then(m => m.SellerProductsComponent)
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/seller/sales-history/sales-history.component').then(m => m.SalesHistoryComponent)
      },
      {
        path: 'customers',
        loadComponent: () => import('./pages/seller/customers/customers.component').then(m => m.CustomersComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/seller/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'my-messages',
        loadComponent: () => import('./pages/seller/seller-message-history/seller-message-history.component').then(m => m.SellerMessageHistoryComponent)
      }
    ]
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'pos',
        loadComponent: () => import('./pages/seller/pos/pos.component').then(m => m.PosComponent)
      },
      {
        path: 'drafts',
        loadComponent: () => import('./pages/seller/draft-list/draft-list.component').then(m => m.DraftListComponent)
      },
      {
        path: 'stocks',
        loadComponent: () => import('./pages/stocks/stocks.component').then(m => m.StocksComponent)
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/seller/sales-history/sales-history.component').then(m => m.SalesHistoryComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'report-vendor',
        loadComponent: () => import('./pages/seller/seller-reports/seller-reports.component').then(m => m.SellerReportsComponent)
      },
      {
        path: 'inventories',
        loadComponent: () => import('./pages/inventories/inventories.component').then(m => m.InventoriesComponent)
      },
      {
        path: 'zoom',
        loadComponent: () => import('./pages/zoom/zoom.component').then(m => m.ZoomComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'sessions',
        loadComponent: () => import('./pages/sessions-admin/sessions-admin.component').then(m => m.SessionsAdminComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/seller/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'pos-printer',
        loadComponent: () => import('./pages/pos-printer/pos-printer.component').then(m => m.PosPrinterComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },
      // Audit page – accessible to admins (and super‑admin via guard)
      {
        path: 'audit',
        canActivate: [authGuard, adminGuard],
        loadComponent: () => import('./pages/audit/audit.component').then(m => m.AuditComponent)
      },
      {
        path: 'notifications',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent)
      },
      {
        path: 'messages',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./pages/messages/messages.component').then(m => m.MessagesComponent)
      }
    ]
  },

  // Default redirects
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
