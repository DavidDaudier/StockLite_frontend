import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../services/sidebar/sidebar.service';
import { User } from '../../core/models/user.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeSearch01, hugeNotification02, hugeCalendar03, hugeClock01, hugeMenu01 } from '@ng-icons/huge-icons';

@Component({
  selector: 'app-pos-header',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [
    provideIcons({
      hugeSearch01,
      hugeNotification02,
      hugeCalendar03,
      hugeClock01,
      hugeMenu01
    })
  ],
  templateUrl: './pos-header.component.html',
  styleUrl: './pos-header.component.css'
})
export class PosHeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  searchTerm = signal('');
  currentUser: User | null = null;
  currentDate = signal('');
  currentTime = signal('');
  private timeInterval?: number;

  constructor() {
    this.currentUser = this.authService.getCurrentUser();
    this.updateDateTime();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  ngOnInit(): void {
    // Mettre à jour l'heure toutes les secondes
    this.timeInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateDateTime(): void {
    const now = new Date();

    // Format date: "mer. 29 mai 2024"
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    this.currentDate.set(now.toLocaleDateString('fr-FR', dateOptions));

    // Format time: "07:59 AM"
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    this.currentTime.set(now.toLocaleTimeString('en-US', timeOptions));
  }

  onSearch(): void {
    const term = this.searchTerm();
    if (term.trim()) {
      console.log('Recherche:', term);
      // Vous pouvez émettre un événement ou utiliser un service de recherche ici
    }
  }

  showNotifications(): void {
    console.log('Afficher les notifications');
    // TODO: Implémenter le système de notifications
  }
}
