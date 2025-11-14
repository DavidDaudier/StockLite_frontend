import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();
  const isSuperAdmin = authService.isSuperAdmin();

  console.log('🛡️ AdminGuard - Vérification:');
  console.log('  - isAuthenticated:', isAuthenticated);
  console.log('  - isAdmin:', isAdmin);
  console.log('  - isSuperAdmin:', isSuperAdmin);

  // Autoriser l'accès si l'utilisateur est admin OU super admin
  if (isAuthenticated && (isAdmin || isSuperAdmin)) {
    console.log('✅ AdminGuard - Accès autorisé');
    return true;
  }

  console.log('❌ AdminGuard - Accès refusé, redirection vers /');
  router.navigate(['/']);
  return false;
};
