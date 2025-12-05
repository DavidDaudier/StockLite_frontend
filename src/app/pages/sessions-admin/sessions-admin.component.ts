import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { SessionsService, Session } from '../../core/services/sessions.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeUserCircle,
  hugeCalendar03,
  hugeClock01,
  hugeCheckmarkCircle02,
  hugeCancel01,
  hugeEye,
  hugeViewOff
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-sessions-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIcon,
    SidebarComponent,
    PosHeaderComponent
  ],
  viewProviders: [
    provideIcons({
      hugeUserCircle,
      hugeCalendar03,
      hugeClock01,
      hugeCheckmarkCircle02,
      hugeCancel01,
      hugeEye,
      hugeViewOff
    })
  ],
  templateUrl: './sessions-admin.component.html',
  styleUrl: './sessions-admin.component.css'
})
export class SessionsAdminComponent implements OnInit {
  private sessionsService = inject(SessionsService);

  sessions = signal<Session[]>([]);
  loading = signal(false);
  selectedFilter: 'active' | 'inactive' = 'active';
  selectedDate = '';
  selectedUserId = 'all';
  uniqueUsers: Array<{id: string, fullName: string}> = [];

  ngOnInit(): void {
    this.setToday();
    this.loadSessions();
  }

  filterByStatus(filter: 'active' | 'inactive'): void {
    this.selectedFilter = filter;
  }

  setToday(): void {
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
  }

  isToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.selectedDate === today;
  }

  onDateChange(): void {
    // Vous pouvez ajouter la logique pour filtrer par date ici
    this.loadSessions();
  }

  get filteredSessions(): Session[] {
    let sessions: Session[];

    if (this.selectedFilter === 'active') {
      sessions = this.activeSessions;
    } else {
      sessions = this.inactiveSessions;
    }

    // Filtre par utilisateur
    if (this.selectedUserId !== 'all') {
      sessions = sessions.filter(s => s.userId === this.selectedUserId);
    }

    return sessions;
  }

  loadSessions(): void {
    this.loading.set(true);
    this.sessionsService.getAllSessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.extractUniqueUsers(sessions);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des sessions:', error);
        this.loading.set(false);
      }
    });
  }

  extractUniqueUsers(sessions: Session[]): void {
    const usersMap = new Map<string, {id: string, fullName: string}>();
    sessions.forEach(session => {
      if (session.userId && !usersMap.has(session.userId)) {
        usersMap.set(session.userId, {
          id: session.userId,
          fullName: session.userFullName || session.username
        });
      }
    });
    this.uniqueUsers = Array.from(usersMap.values());
  }

  onUserFilterChange(): void {
    // Le filtrage se fait automatiquement via le getter filteredSessions
  }

  revokeSession(session: Session): void {
    if (!confirm(`Êtes-vous sûr de vouloir clôturer la session de ${session.userFullName} ?`)) {
      return;
    }

    this.sessionsService.endSession(session.id).subscribe({
      next: () => {
        alert('Session clôturée avec succès');
        this.loadSessions();
      },
      error: (error) => {
        console.error('Erreur lors de la clôture:', error);
        alert('Erreur lors de la clôture de la session');
      }
    });
  }

  revokeAllUserSessions(userId: string): void {
    const userSessions = this.sessions().filter(s => s.userId === userId);
    const user = userSessions[0];

    if (!confirm(`Êtes-vous sûr de vouloir clôturer toutes les sessions de ${user.userFullName} (${userSessions.length} session(s)) ?`)) {
      return;
    }

    this.sessionsService.endAllUserSessions(userId).subscribe({
      next: () => {
        alert('Toutes les sessions ont été clôturées');
        this.loadSessions();
      },
      error: (error) => {
        console.error('Erreur lors de la clôture:', error);
        alert('Erreur lors de la clôture des sessions');
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  get activeSessions(): Session[] {
    return this.sessions().filter(s => s.isActive && !this.isExpired(s.expiresAt));
  }

  get inactiveSessions(): Session[] {
    return this.sessions().filter(s => !s.isActive || this.isExpired(s.expiresAt));
  }
}
