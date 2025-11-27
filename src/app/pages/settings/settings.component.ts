import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { SidebarComponent } from '../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../components/pos-header/pos-header.component';
import { AppInfoService } from '../../services/app-info.service';
import { CurrencyService, Currency } from '../../services/currency.service';
import { AppInfo, UpdateAppInfoDto } from '../../models/app-info.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    NgIconComponent,
    SidebarComponent,
    PosHeaderComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  // Tabs
  activeTab = signal<'currency' | 'appinfo'>('currency');
  
  // Currency - initialized in ngOnInit to avoid initialization order issues
  selectedCurrency!: ReturnType<typeof signal<Currency>>;
  currencies!: Record<Currency, any>;
  
  // App Info
  appInfoForm!: FormGroup;
  appInfo = signal<AppInfo | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  logoPreview = signal<string | null>(null);
  
  // User role
  isAdmin = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    public currencyService: CurrencyService,
    private appInfoService: AppInfoService,
    private authService: AuthService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Initialize currency properties after service is available
    this.selectedCurrency = this.currencyService.selectedCurrency;
    this.currencies = this.currencyService.currencies;
    
    this.checkUserRole();
    this.loadAppInfo();
  }

  /**
   * Vérifie si l'utilisateur est admin
   */
  checkUserRole(): void {
    const user = this.authService.getCurrentUser();
    this.isAdmin.set(user?.role === 'admin');
  }

  /**
   * Initialise le formulaire
   */
  initForm(): void {
    this.appInfoForm = this.fb.group({
      logo_app: [''],
      nom_app: ['StockLite', Validators.required],
      sous_titre_app: ['POS System'],
      logo_size: [100, [Validators.min(20), Validators.max(150)]],
      color_nom_app: ['#000000', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      color_sous_titre_app: ['#6B7280', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      logo_bg_color: ['#0d9488'],
      email_app: ['', [Validators.email]],
      adresse_app: [''],
      phone_app: [''],
      color_primary: ['#0d9488', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      color_secondary: ['#14b8a6', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      color_tertiary: ['#2dd4bf', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      currency: ['HTG']
    });
  }

  /**
   * Charge les informations de l'application
   */
  loadAppInfo(): void {
    this.loading.set(true);
    this.appInfoService.getAppInfo().subscribe({
      next: (data) => {
        this.appInfo.set(data);
        this.patchFormValues(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading app info:', err);
        this.errorMessage.set('Erreur lors du chargement des informations');
        this.loading.set(false);
      }
    });
  }

  /**
   * Remplit le formulaire avec les données
   */
  patchFormValues(data: AppInfo): void {
    this.appInfoForm.patchValue({
      logo_app: data.logo_app || '',
      nom_app: data.nom_app,
      sous_titre_app: data.sous_titre_app || 'POS System',
      logo_size: data.logo_size || 100,
      color_nom_app: data.color_nom_app || '#000000',
      color_sous_titre_app: data.color_sous_titre_app || '#6B7280',
      logo_bg_color: data.logo_bg_color || '#0d9488',
      email_app: data.email_app || '',
      adresse_app: data.adresse_app || '',
      phone_app: data.phone_app || '',
      color_primary: data.color_primary || '#0d9488',
      color_secondary: data.color_secondary || '#14b8a6',
      color_tertiary: data.color_tertiary || '#2dd4bf',
      currency: data.currency || 'HTG'
    });
    
    // Set logo preview if exists
    if (data.logo_app) {
      this.logoPreview.set(data.logo_app);
    }
  }

  /**
   * Gère la sélection d'un fichier logo
   */
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    
    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.showError('Le fichier est trop volumineux. Taille maximale: 2MB');
      return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      this.showError('Veuillez sélectionner une image valide');
      return;
    }

    // Convertir en base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.logoPreview.set(base64);
      this.appInfoForm.patchValue({ logo_app: base64 });
    };
    reader.onerror = () => {
      this.showError('Erreur lors de la lecture du fichier');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Supprime le logo
   */
  removeLogo(): void {
    this.logoPreview.set(null);
    this.appInfoForm.patchValue({ logo_app: '' });
  }

  /**
   * Change l'onglet actif
   */
  setActiveTab(tab: 'currency' | 'appinfo'): void {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  /**
   * Sélectionne une monnaie
   */
  selectCurrency(currency: Currency): void {
    this.currencyService.setCurrency(currency);
    this.appInfoForm.patchValue({ currency });
    this.showSuccess('Monnaie mise à jour avec succès');
  }

  /**
   * Sauvegarde les informations de l'application
   */
  saveAppInfo(): void {
    if (this.appInfoForm.invalid) {
      this.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (!this.isAdmin()) {
      this.showError('Seuls les administrateurs peuvent modifier ces informations');
      return;
    }

    this.saving.set(true);
    this.clearMessages();

    const currentInfo = this.appInfo();
    const formData = this.appInfoForm.value;

    // Si l'app-info existe, on fait un UPDATE, sinon un CREATE
    if (currentInfo && currentInfo.id) {
      // UPDATE
      const updateData: UpdateAppInfoDto = formData;
      this.appInfoService.update(currentInfo.id, updateData).subscribe({
        next: (data) => {
          this.appInfo.set(data);
          this.saving.set(false);
          this.showSuccess('Informations mises à jour avec succès');
        },
        error: (err) => {
          console.error('Error updating app info:', err);
          this.showError(err.error?.message || 'Erreur lors de la mise à jour');
          this.saving.set(false);
        }
      });
    } else {
      // CREATE
      this.appInfoService.create(formData).subscribe({
        next: (data) => {
          this.appInfo.set(data);
          this.saving.set(false);
          this.showSuccess('Informations créées avec succès');
        },
        error: (err) => {
          console.error('Error creating app info:', err);
          this.showError(err.error?.message || 'Erreur lors de la création');
          this.saving.set(false);
        }
      });
    }
  }

  /**
   * Réinitialise aux valeurs par défaut
   */
  resetToDefaults(): void {
    if (!confirm('Voulez-vous vraiment réinitialiser aux valeurs par défaut ?')) {
      return;
    }

    this.appInfoForm.patchValue({
      logo_app: '',
      nom_app: 'StockLite',
      sous_titre_app: 'POS System',
      logo_size: 100,
      color_nom_app: '#000000',
      color_sous_titre_app: '#6B7280',
      logo_bg_color: '#0d9488',
      email_app: 'contact@stocklite.com',
      adresse_app: 'Port-au-Prince, Haïti',
      phone_app: '+509 1234-5678',
      color_primary: '#0d9488',
      color_secondary: '#14b8a6',
      color_tertiary: '#2dd4bf',
      currency: 'HTG'
    });

    this.showSuccess('Formulaire réinitialisé aux valeurs par défaut');
  }

  /**
   * Affiche un message de succès
   */
  showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  /**
   * Affiche un message d'erreur
   */
  showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set(null);
  }

  /**
   * Efface les messages
   */
  clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Récupère les erreurs d'un champ
   */
  getFieldError(fieldName: string): string | null {
    const field = this.appInfoForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      if (field.errors?.['required']) return 'Ce champ est requis';
      if (field.errors?.['email']) return 'Email invalide';
      if (field.errors?.['pattern']) return 'Format de couleur invalide (ex: #0d9488)';
    }
    return null;
  }
}
