import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();
  const token = authService.getToken();
  const currentUser = authService.getCurrentUser();

  console.log('🛡️ AuthGuard - Vérification:');
  console.log('  - isAuthenticated:', isAuthenticated);
  console.log('  - token:', token ? 'présent' : 'absent');
  console.log('  - currentUser:', currentUser ? currentUser.username : 'aucun');

  if (isAuthenticated) {
    console.log('✅ AuthGuard - Accès autorisé');
    return true;
  }

  console.log('❌ AuthGuard - Accès refusé, redirection vers /login');
  router.navigate(['/login']);
  return false;
};
