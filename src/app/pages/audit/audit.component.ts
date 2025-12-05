import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  hugeSearch01, 
  hugeCalendar03, 
  hugeClock01, 
  hugeViewOff, 
  hugeEye, 
  hugeRefresh, 
  hugeFileDownload,
  hugeCheckmarkCircle04,
  hugeAlert01,
  hugeMoneyBag02,
  hugeChartColumn,
  hugeSafeDelivery01,
  hugeChartMedium,
  hugeChartHistogram,
  hugeUserMultiple,
  hugeLogin03,
  hugeLogout03,
  hugePdf01,
  hugeDelete03,
  hugeArrowRightDouble,
  hugeArrowDownDouble,
  hugeChrome,
  hugeArrowLeft01,
  hugeArrowRight01
} from '@ng-icons/huge-icons';
import { AuditService, AuditLog } from '../../core/services/audit.service';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [provideIcons({ 
    hugeSearch01, 
    hugeCalendar03, 
    hugeClock01, 
    hugeViewOff, 
    hugeEye, 
    hugeRefresh, 
    hugeFileDownload,
    hugeCheckmarkCircle04,
    hugeAlert01,
    hugeMoneyBag02,
    hugeChartColumn,
    hugeSafeDelivery01,
    hugeChartMedium,
    hugeChartHistogram,
    hugeUserMultiple,
    hugeLogin03,
    hugeLogout03,
    hugePdf01,
    hugeDelete03,
    hugeArrowRightDouble,
    hugeArrowDownDouble,
    hugeChrome,
    hugeArrowLeft01,
    hugeArrowRight01
  })],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css'
})
export class AuditComponent implements OnInit {
  private auditService = inject(AuditService);
  private authService = inject(AuthService);
  
  protected Math = Math;

  // Raw logs loaded from the mock JSON (or real API)
  private allLogs = signal<AuditLog[]>([]);

  // ----- Filters -----
  filterUser = signal<string>('');
  filterRole = signal<string>('');
  filterAction = signal<string>('');
  filterModule = signal<string>('');
  filterDate = signal<string>(new Date().toISOString().split('T')[0]); // Today's date by default (YYYY-MM-DD)

  // ----- Pagination -----
  itemsPerPage = signal<number>(10);
  currentPage = signal<number>(1);

  // ----- UI state -----
  expandedLogId = signal<number | null>(null); // accordion
  modalLog = signal<AuditLog | null>(null); // modal
  showStats = signal<boolean>(true);
  showJsonInModal = signal<boolean>(false); // Toggle JSON view in modal

  // ----- Derived data -----
  filteredLogs = computed(() => {
    const logs = this.allLogs();
    return logs.filter(log => {
      const matchesUser = this.filterUser() ? log.username.toLowerCase().includes(this.filterUser().toLowerCase()) : true;
      const matchesRole = this.filterRole() ? log.role === this.filterRole() : true;
      const matchesAction = this.filterAction() ? log.action === this.filterAction() : true;
      const matchesModule = this.filterModule() ? log.module === this.filterModule() : true;
      
      // Date filter - compare only the date part (ignore time)
      const matchesDate = this.filterDate() ? this.isSameDay(new Date(log.timestamp), new Date(this.filterDate())) : true;
      
      return matchesUser && matchesRole && matchesAction && matchesModule && matchesDate;
    });
  });

  paginatedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredLogs().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => Math.ceil(this.filteredLogs().length / this.itemsPerPage()));

  // ----- Stats -----
  stats = computed(() => {
    const logs = this.filteredLogs();
    const totalLogs = logs.length;
    const uniqueUsers = new Set(logs.map(l => l.username)).size;
    const actionsToday = logs.filter(l => this.isSameDay(new Date(l.timestamp), new Date())).length;
    
    // Most active user
    const userCounts: Record<string, number> = {};
    logs.forEach(l => userCounts[l.username] = (userCounts[l.username] || 0) + 1);
    let mostActiveUser = '-';
    let maxCount = 0;
    for (const [user, count] of Object.entries(userCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveUser = user;
      }
    }

    // Error/Delete rate (just an example metric)
    const criticalActions = logs.filter(l => l.action === 'delete' || l.action === 'error').length;

    return {
      totalLogs,
      uniqueUsers,
      actionsToday,
      mostActiveUser,
      criticalActions
    };
  });

  // ----- Helper for badge colors -----
  actionBadgeClass(action: string): string {
    const map: Record<string, string> = {
      'login': 'bg-green-100 text-green-800 border-green-200',
      'logout': 'bg-gray-100 text-gray-800 border-gray-200',
      'add': 'bg-blue-100 text-blue-800 border-blue-200',
      'update': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'delete': 'bg-red-100 text-red-800 border-red-200',
      'sale': 'bg-teal-100 text-teal-800 border-teal-200',
      'export': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return map[action] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  // Helper to format date for display
  formatDate(timestamp: string): Date {
    return new Date(timestamp);
  }

  ngOnInit(): void {
    // Load audit logs from the backend
    this.loadLogs();
  }

  // Load logs from backend
  loadLogs(): void {
    this.auditService.getLogs().subscribe({
      next: (logs: AuditLog[]) => this.allLogs.set(logs),
      error: (error) => {
        console.error('Error loading audit logs:', error);
        // You could show an error message to the user here
      }
    });
  }

  // ----- UI interactions -----
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  toggleAccordion(id: number): void {
    this.expandedLogId.set(this.expandedLogId() === id ? null : id);
  }

  openModal(log: AuditLog): void {
    this.modalLog.set(log);
  }

  closeModal(): void {
    this.modalLog.set(null);
  }

  exportToPDF(): void {
    // TODO: Implement PDF export functionality
    // This would typically use a library like jsPDF or call a backend endpoint
    console.log('Exporting audit logs to PDF...');
    alert('Export PDF fonctionnalité à implémenter');
  }

  deleteLog(logId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce log ?')) {
      return;
    }
    
    // Call API to delete the log
    this.auditService.deleteLog(logId).subscribe({
      next: () => {
        // Remove from local array
        const currentLogs = this.allLogs();
        const updatedLogs = currentLogs.filter(log => log.id !== logId);
        this.allLogs.set(updatedLogs);
        console.log(`Log ${logId} deleted successfully`);
      },
      error: (error) => {
        console.error('Error deleting log:', error);
        alert('Erreur lors de la suppression du log. Vous devez être Super Admin.');
      }
    });
  }

  // Helper method to compare dates (ignoring time)
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Helper to convert object to key-value pairs for template iteration
  objectEntries(obj: any): Array<{key: string, value: any}> {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  // Helper to format values for display
  formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
