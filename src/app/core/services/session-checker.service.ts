import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SessionCheckerService {
  private authService = inject(AuthService);
  private router = inject(Router);
  private checkInterval?: number;
  private readonly CHECK_INTERVAL_MS = 60000; // Vérifier toutes les minutes

  constructor() {}

  startChecking(): void {
    // Arrêter toute vérification en cours
    this.stopChecking();

    // Démarrer une nouvelle vérification
    this.checkInterval = window.setInterval(() => {
      this.checkSession();
    }, this.CHECK_INTERVAL_MS);

    // Vérifier immédiatement
    this.checkSession();
  }

  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private checkSession(): void {
    // Vérifier si le token est toujours valide
    if (!this.authService.isAuthenticated()) {
      console.log('[SessionChecker] Session expirée, redirection vers login');
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
