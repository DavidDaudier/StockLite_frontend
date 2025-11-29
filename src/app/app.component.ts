import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { AuthService } from './core/services/auth.service';
import { SessionCheckerService } from './core/services/session-checker.service';
import { LowStockMonitorService } from './core/services/low-stock-monitor.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule
    // DashboardComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'stockLite';
  isPhone = false;
  isTabletPortrait = false;

  constructor(
    private authService: AuthService,
    private sessionChecker: SessionCheckerService,
    private lowStockMonitor: LowStockMonitorService
  ) {}

  ngOnInit(): void {
    // Initial check
    this.checkDevice();

    // Listen for resize events
    window.addEventListener('resize', () => {
      this.checkDevice();
    });

    // Démarrer la vérification de session si l'utilisateur est connecté
    if (this.authService.isAuthenticated()) {
      this.sessionChecker.startChecking();
      this.lowStockMonitor.startMonitoring(); // Démarrer le monitoring des stocks faibles
    }

    // Écouter les changements d'état de connexion
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        // Utilisateur connecté - démarrer les vérifications
        this.sessionChecker.startChecking();
        this.lowStockMonitor.startMonitoring();
      } else {
        // Utilisateur déconnecté - arrêter les vérifications
        this.sessionChecker.stopChecking();
        this.lowStockMonitor.stopMonitoring();
      }
    });
  }

  private checkDevice(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Détection basique basée sur la largeur d'écran
    // Téléphone : largeur < 768px
    this.isPhone = width < 768;

    // Tablette : largeur entre 768px et 1280px (approximatif)
    // Et orientation portrait (hauteur > largeur)
    const isTablet = width >= 768 && width < 1280;
    const isPortrait = height > width;

    this.isTabletPortrait = isTablet && isPortrait;
  }
}
