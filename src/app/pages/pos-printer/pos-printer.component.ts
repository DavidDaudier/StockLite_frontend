import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { AppInfoService } from '../../services/app-info.service';
import { AuthService } from '../../core/services/auth.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugePrinter,
  hugeSettings01,
  hugeCheckmarkCircle04,
  hugeEdit02,
  hugeCheckmarkBadge04,
  hugeCancel01,
  hugeAdd01,
  hugeDelete03,
  hugeFileDownload
} from '@ng-icons/huge-icons';

interface PrinterConfig {
  id: string;
  name: string;
  type: 'thermal' | 'standard';
  connection: 'usb' | 'bluetooth' | 'network';
  address?: string;
  paperWidth: number; // in mm
  isDefault: boolean;
  isActive: boolean;
}

interface ReceiptConfig {
  showLogo: boolean;
  logoUrl: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxId: string;
  showProductDetails: boolean;
  showPaymentMethod: boolean;
  showTax: boolean;
  footerMessage: string;
  fontSize: number;
  paperWidth: number;
}

@Component({
  selector: 'app-pos-printer',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugePrinter,
      hugeSettings01,
      hugeCheckmarkCircle04,
      hugeEdit02,
      hugeCheckmarkBadge04,
      hugeCancel01,
      hugeAdd01,
      hugeDelete03,
      hugeFileDownload
    })
  ],
  templateUrl: './pos-printer.component.html',
  styleUrls: ['./pos-printer.component.css']
})
export class PosPrinterComponent {
  // State
  activeTab = signal<'printers' | 'receipt' | 'test'>('printers');

  // Printers
  printers = signal<PrinterConfig[]>([
    {
      id: '1',
      name: 'Imprimante Caisse Principale',
      type: 'thermal',
      connection: 'usb',
      paperWidth: 80,
      isDefault: true,
      isActive: true
    },
    {
      id: '2',
      name: 'Imprimante Bureau',
      type: 'standard',
      connection: 'network',
      address: '192.168.1.100',
      paperWidth: 210,
      isDefault: false,
      isActive: false
    }
  ]);

  // Receipt configuration
  receiptConfig = signal<ReceiptConfig>({
    showLogo: true,
    logoUrl: '',
    companyName: 'StockLite Store',
    companyAddress: '123 Rue Principale, Port-au-Prince',
    companyPhone: '+509 1234 5678',
    companyEmail: 'contact@stocklite.com',
    taxId: 'NIF: 123456789',
    showProductDetails: true,
    showPaymentMethod: true,
    showTax: true,
    footerMessage: 'Merci de votre visite ! À bientôt.',
    fontSize: 12,
    paperWidth: 80
  });

  // UI state
  editingPrinterId = signal<string | null>(null);
  showAddPrinterModal = signal<boolean>(false);
  newPrinterData: Partial<PrinterConfig> = {};

  // Computed
  defaultPrinter = computed(() =>
    this.printers().find(p => p.isDefault && p.isActive)
  );

  constructor(
    private appInfoService: AppInfoService,
    public authService: AuthService
  ) {
    // Load app info for receipt config
    this.appInfoService.getAppInfo().subscribe({
      next: (appInfo) => {
        this.receiptConfig.update(config => ({
          ...config,
          companyName: appInfo.nom_app || config.companyName,
          companyAddress: appInfo.adresse_app || config.companyAddress,
          companyPhone: appInfo.phone_app || config.companyPhone,
          companyEmail: appInfo.email_app || config.companyEmail
        }));
      }
    });
  }

  setActiveTab(tab: 'printers' | 'receipt' | 'test'): void {
    this.activeTab.set(tab);
  }

  // Printer management
  setDefaultPrinter(printerId: string): void {
    this.printers.update(printers =>
      printers.map(p => ({
        ...p,
        isDefault: p.id === printerId
      }))
    );
    alert('Imprimante par défaut définie avec succès');
  }

  togglePrinterStatus(printerId: string): void {
    this.printers.update(printers =>
      printers.map(p =>
        p.id === printerId ? { ...p, isActive: !p.isActive } : p
      )
    );
  }

  deletePrinter(printerId: string): void {
    const printer = this.printers().find(p => p.id === printerId);
    if (printer?.isDefault) {
      alert('Impossible de supprimer l\'imprimante par défaut');
      return;
    }

    if (!confirm('Voulez-vous vraiment supprimer cette imprimante ?')) {
      return;
    }

    this.printers.update(printers => printers.filter(p => p.id !== printerId));
  }

  openAddPrinterModal(): void {
    this.newPrinterData = {
      name: '',
      type: 'thermal',
      connection: 'usb',
      paperWidth: 80,
      isDefault: false,
      isActive: true
    };
    this.showAddPrinterModal.set(true);
  }

  closeAddPrinterModal(): void {
    this.showAddPrinterModal.set(false);
    this.newPrinterData = {};
  }

  addPrinter(): void {
    const printer = this.newPrinterData;
    if (!printer.name) {
      alert('Veuillez saisir un nom pour l\'imprimante');
      return;
    }

    const newPrinter: PrinterConfig = {
      id: Date.now().toString(),
      name: printer.name,
      type: printer.type || 'thermal',
      connection: printer.connection || 'usb',
      address: printer.address,
      paperWidth: printer.paperWidth || 80,
      isDefault: printer.isDefault || false,
      isActive: printer.isActive || true
    };

    this.printers.update(printers => [...printers, newPrinter]);
    this.closeAddPrinterModal();
    alert('Imprimante ajoutée avec succès');
  }

  // Receipt configuration
  saveReceiptConfig(): void {
    // In a real app, this would save to a backend
    localStorage.setItem('receiptConfig', JSON.stringify(this.receiptConfig()));
    alert('Configuration du reçu sauvegardée');
  }

  // Test printing
  testPrint(): void {
    const config = this.receiptConfig();
    const printer = this.defaultPrinter();

    if (!printer) {
      alert('Aucune imprimante active par défaut');
      return;
    }

    // In a real app, this would send to actual printer
    alert(`Test d'impression envoyé à: ${printer.name}\nLargeur du papier: ${printer.paperWidth}mm`);

    // Generate preview
    this.generateReceiptPreview();
  }

  generateReceiptPreview(): string {
    const config = this.receiptConfig();
    return `
      ${config.companyName}
      ${config.companyAddress}
      Tel: ${config.companyPhone}
      ${config.taxId}
      ================================
      REÇU DE TEST
      ================================
      Date: ${new Date().toLocaleString()}
      --------------------------------
      Article 1 x2 ........... 200 Gds
      Article 2 x1 ........... 150 Gds
      --------------------------------
      TOTAL .................. 350 Gds
      ${config.showPaymentMethod ? 'Paiement: Espèces' : ''}
      ${config.showTax ? 'TVA incluse' : ''}
      ================================
      ${config.footerMessage}
    `;
  }

  getConnectionIcon(connection: string): string {
    switch (connection) {
      case 'usb':
        return 'USB';
      case 'bluetooth':
        return 'BT';
      case 'network':
        return 'NET';
      default:
        return connection;
    }
  }
}
