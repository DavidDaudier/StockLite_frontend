import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { AppInfoService } from '../../services/app-info.service';
import { AuthService } from '../../core/services/auth.service';
import { ReceiptConfigService } from '../../core/services/receipt-config.service';
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

interface MobileConfig {
  name: string;
  pinCode: string;
  enabled: boolean;
  allowOffline: boolean;
  autoSync: boolean;
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
export class PosPrinterComponent implements OnInit {
  // State
  activeTab = signal<'printers' | 'receipt' | 'test' | 'mobile'>('printers');
  configId = signal<string | null>(null); // ID de la config active
  loading = signal<boolean>(false);

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

  // Mobile POS configuration
  mobileConfig = signal<MobileConfig>({
    name: 'POS Mobile 1',
    pinCode: '',
    enabled: false,
    allowOffline: true,
    autoSync: true
  });

  // UI state
  editingPrinterId = signal<string | null>(null);
  showAddPrinterModal = signal<boolean>(false);
  newPrinterData: Partial<PrinterConfig> = {};

  // Logo upload state
  logoPreview = signal<string>('');
  logoFile: File | null = null;
  showLogoModal = signal<boolean>(false);
  logoScale = signal<number>(100); // Scale percentage

  // Computed
  defaultPrinter = computed(() =>
    this.printers().find(p => p.isDefault && p.isActive)
  );

  constructor(
    public appInfoService: AppInfoService,
    public authService: AuthService,
    private receiptConfigService: ReceiptConfigService
  ) {}

  ngOnInit(): void {
    this.loadReceiptConfig();
  }

  // Charge la configuration depuis l'API
  loadReceiptConfig(): void {
    this.loading.set(true);
    this.receiptConfigService.getActive().subscribe({
      next: (config: any) => {
        this.configId.set(config.id || null);
        this.receiptConfig.set({
          showLogo: config.showLogo,
          logoUrl: config.logoUrl,
          companyName: config.companyName,
          companyAddress: config.companyAddress,
          companyPhone: config.companyPhone,
          companyEmail: config.companyEmail,
          taxId: config.taxId,
          showProductDetails: config.showProductDetails,
          showPaymentMethod: config.showPaymentMethod,
          showTax: config.showTax,
          footerMessage: config.footerMessage,
          fontSize: config.fontSize,
          paperWidth: config.paperWidth
        });

        if (config.mobilePosName) {
          this.mobileConfig.set({
            name: config.mobilePosName,
            pinCode: config.mobilePinCode || '',
            enabled: config.mobileEnabled || false,
            allowOffline: config.mobileAllowOffline || true,
            autoSync: config.mobileAutoSync || true
          });
        }

        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement de la configuration:', error);
        this.loading.set(false);
        alert('Erreur lors du chargement de la configuration');
      }
    });
  }

  setActiveTab(tab: 'printers' | 'receipt' | 'test' | 'mobile'): void {
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
    this.loading.set(true);
    const config = this.receiptConfig();

    this.receiptConfigService.updateActive(config).subscribe({
      next: (savedConfig: any) => {
        this.configId.set(savedConfig.id || null);
        this.loading.set(false);
        alert('Configuration du reçu sauvegardée avec succès!');
      },
      error: (error: any) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.loading.set(false);
        alert('Erreur lors de la sauvegarde de la configuration');
      }
    });
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
    let preview = `\n`;

    if (config.companyName) {
      preview += `      ${config.companyName}\n`;
    }
    if (config.companyAddress) {
      preview += `      ${config.companyAddress}\n`;
    }
    if (config.companyPhone) {
      preview += `      Tel: ${config.companyPhone}\n`;
    }
    if (config.companyEmail) {
      preview += `      ${config.companyEmail}\n`;
    }
    if (config.taxId) {
      preview += `      ${config.taxId}\n`;
    }

    preview += `      ================================\n`;
    preview += `      REÇU DE TEST\n`;
    preview += `      ================================\n`;
    preview += `      Date: ${new Date().toLocaleString()}\n`;
    preview += `      --------------------------------\n`;
    preview += `      Article 1 x2 ........... 200 Gds\n`;
    preview += `      Article 2 x1 ........... 150 Gds\n`;
    preview += `      --------------------------------\n`;
    preview += `      TOTAL .................. 350 Gds\n`;

    if (config.showPaymentMethod) {
      preview += `      Paiement: Espèces\n`;
    }
    if (config.showTax) {
      preview += `      TVA incluse\n`;
    }

    preview += `      ================================\n`;
    if (config.footerMessage) {
      preview += `      ${config.footerMessage}\n`;
    }

    return preview;
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

  // Logo upload methods
  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La taille du fichier ne doit pas dépasser 2MB');
        return;
      }

      this.logoFile = file;

      // Read and preview the image
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result as string;
        this.logoPreview.set(result);
        this.showLogoModal.set(true);
        this.logoScale.set(100);
      };
      reader.readAsDataURL(file);
    }
  }

  adjustLogoScale(scale: number): void {
    this.logoScale.set(scale);
  }

  saveLogo(): void {
    const preview = this.logoPreview();
    if (!preview) {
      alert('Aucune image sélectionnée');
      return;
    }

    this.loading.set(true);

    // Apply scale to the image
    this.resizeImage(preview, this.logoScale()).then(resizedImage => {
      this.receiptConfig.update(config => ({
        ...config,
        logoUrl: resizedImage
      }));

      // Sauvegarder automatiquement via l'API
      this.receiptConfigService.updateActive({ logoUrl: resizedImage }).subscribe({
        next: () => {
          this.loading.set(false);
          this.closeLogoModal();
          alert('Logo ajouté avec succès! Configuration sauvegardée.');
        },
        error: (error: any) => {
          console.error('Erreur lors de la sauvegarde du logo:', error);
          this.loading.set(false);
          alert('Erreur lors de la sauvegarde du logo');
        }
      });
    });
  }

  private resizeImage(dataUrl: string, scalePercent: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scale = scalePercent / 100;
        const maxWidth = 200; // Max width for receipt logo
        const ratio = Math.min(maxWidth / img.width, 1) * scale;

        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  removeLogo(): void {
    if (confirm('Voulez-vous vraiment supprimer le logo ?')) {
      this.loading.set(true);

      this.receiptConfig.update(config => ({
        ...config,
        logoUrl: ''
      }));

      // Sauvegarder automatiquement via l'API
      this.receiptConfigService.updateActive({ logoUrl: '' }).subscribe({
        next: () => {
          this.loading.set(false);
          this.logoPreview.set('');
          this.logoFile = null;
          alert('Logo supprimé! Configuration sauvegardée.');
        },
        error: (error: any) => {
          console.error('Erreur lors de la suppression du logo:', error);
          this.loading.set(false);
          alert('Erreur lors de la suppression du logo');
        }
      });
    }
  }

  closeLogoModal(): void {
    this.showLogoModal.set(false);
    this.logoPreview.set('');
    this.logoFile = null;
    this.logoScale.set(100);
  }

  // Mobile POS configuration
  saveMobileConfig(): void {
    const config = this.mobileConfig();

    // Validate PIN code
    if (config.enabled && (!config.pinCode || config.pinCode.length < 4)) {
      alert('Veuillez saisir un code PIN d\'au moins 4 caractères');
      return;
    }

    this.loading.set(true);

    // Sauvegarder via l'API
    this.receiptConfigService.updateActive({
      mobilePosName: config.name,
      mobilePinCode: config.pinCode,
      mobileEnabled: config.enabled,
      mobileAllowOffline: config.allowOffline,
      mobileAutoSync: config.autoSync
    }).subscribe({
      next: () => {
        this.loading.set(false);
        alert('Configuration POS Mobile sauvegardée avec succès!');
      },
      error: (error: any) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.loading.set(false);
        alert('Erreur lors de la sauvegarde de la configuration');
      }
    });
  }
}
