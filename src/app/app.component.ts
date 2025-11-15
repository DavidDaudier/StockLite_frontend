import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { AuthService } from './core/services/auth.service';
import { SessionCheckerService } from './core/services/session-checker.service';
import { LowStockMonitorService } from './core/services/low-stock-monitor.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    // DashboardComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'stockLite';

  constructor(
    private authService: AuthService,
    private sessionChecker: SessionCheckerService,
    private lowStockMonitor: LowStockMonitorService
  ) {}

  ngOnInit(): void {
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
}
