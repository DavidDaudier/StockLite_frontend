import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { sellerGuard } from './core/guards/seller.guard';

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
        path: 'sales-history',
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
        path: 'stocks',
        loadComponent: () => import('./pages/stocks/stocks.component').then(m => m.StocksComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      }
      // TODO: Ajouter categories, orders, users quand créés
    ]
  },

  // Default redirects
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
