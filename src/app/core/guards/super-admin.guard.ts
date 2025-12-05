import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    // Pas connecté, rediriger vers login
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (!currentUser.isSuperAdmin) {
    // Pas super admin, rediriger vers dashboard approprié
    if (currentUser.role === 'seller') {
      router.navigate(['/seller/pos']);
    } else {
      router.navigate(['/dashboard']);
    }
    return false;
  }

  return true;
};
