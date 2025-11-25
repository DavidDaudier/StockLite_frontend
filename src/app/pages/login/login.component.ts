import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { AppInfoService } from '../../services/app-info.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  isOnline = true;
  showPassword = false; // Pour afficher/cacher le mot de passe
  private readonly REMEMBER_ME_KEY = 'stocklite_remembered_username';
  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private offlineSyncService: OfflineSyncService,
    public appInfoService: AppInfoService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Récupérer le username mémorisé si disponible (seulement dans le navigateur)
    let rememberedUsername = '';
    if (this.isBrowser) {
      rememberedUsername = localStorage.getItem(this.REMEMBER_ME_KEY) || '';
    }

    this.loginForm = this.fb.group({
      username: [rememberedUsername || '', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [!!rememberedUsername] // Cocher si on a un username mémorisé
    });

    // Vérifier l'état de connexion
    this.offlineSyncService.getOnlineStatus().subscribe(status => {
      this.isOnline = status;
    });

    // Rediriger si déjà connecté (mais seulement une fois)
    if (this.authService.isAuthenticated() && !this.loading) {
      console.log('🔄 Déjà authentifié dans ngOnInit, redirection...');
      setTimeout(() => {
        this.redirectToDashboard();
      }, 100);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { username, password, rememberMe } = this.loginForm.value;

    // Gérer "Se souvenir de moi" (seulement dans le navigateur)
    if (this.isBrowser) {
      if (rememberMe) {
        localStorage.setItem(this.REMEMBER_ME_KEY, username);
      } else {
        localStorage.removeItem(this.REMEMBER_ME_KEY);
      }
    }

    try {
      const login$ = await this.authService.loginWithGeolocation(username, password);
      login$.subscribe({
        next: (response) => {
          console.log('✅ Connexion réussie:', response.user);
          console.log('🔑 Role:', response.user.role);
          console.log('👑 isSuperAdmin:', response.user.isSuperAdmin);

          // Attendre un peu plus longtemps pour s'assurer que les données sont bien sauvegardées
          setTimeout(() => {
            // Vérifier que la session est bien établie
            const isAuth = this.authService.isAuthenticated();
            const token = this.authService.getToken();
            const user = this.authService.getCurrentUser();

            console.log('📊 Vérification avant redirection:');
            console.log('  - isAuthenticated:', isAuth);
            console.log('  - token:', token ? 'présent' : 'absent');
            console.log('  - user:', user ? user.username : 'aucun');

            if (!isAuth || !token || !user) {
              console.error('❌ Session non établie correctement!');
              this.errorMessage = 'Erreur lors de l\'établissement de la session. Veuillez réessayer.';
              this.loading = false;
              return;
            }

            this.loading = false;
            this.redirectToDashboard();
          }, 300);
        },
        error: (error) => {
          console.error('❌ Erreur de connexion:', error);
          this.loading = false;
          this.errorMessage = error.error?.message || 'Identifiants incorrects. Veuillez réessayer.';
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      this.loading = false;
      this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  // Méthode pour basculer la visibilité du mot de passe
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private redirectToDashboard(): void {
    const user = this.authService.getCurrentUser();

    console.log('🔄 Redirection en cours...');
    console.log('👤 Utilisateur actuel:', user);
    console.log('🔑 Role:', user?.role);
    console.log('👑 isSuperAdmin:', user?.isSuperAdmin);

    if (!user) {
      console.error('❌ Aucun utilisateur trouvé!');
      this.errorMessage = 'Erreur d\'authentification. Veuillez réessayer.';
      this.loading = false;
      return;
    }

    // Redirection selon le rôle (super admin et admin vont au même endroit)
    if (user.role === 'admin') {
      console.log('➡️ Redirection vers /admin/dashboard');
      this.router.navigate(['/admin/dashboard'], { replaceUrl: true }).then(success => {
        console.log('✅ Navigation réussie:', success);
        if (!success) {
          console.error('❌ La navigation a retourné false!');
          // Essayer une navigation alternative
          console.log('🔄 Tentative de navigation alternative...');
          window.location.href = '/admin/dashboard';
        }
      }).catch(error => {
        console.error('❌ Erreur de navigation:', error);
        // En dernier recours, utiliser window.location
        console.log('🔄 Utilisation de window.location comme solution de secours...');
        window.location.href = '/admin/dashboard';
      });
    } else if (user.role === 'seller') {
      console.log('➡️ Redirection vers /seller/pos');
      this.router.navigate(['/seller/pos'], { replaceUrl: true }).then(success => {
        console.log('✅ Navigation réussie:', success);
        if (!success) {
          console.error('❌ La navigation a retourné false!');
          window.location.href = '/seller/pos';
        }
      }).catch(error => {
        console.error('❌ Erreur de navigation:', error);
        window.location.href = '/seller/pos';
      });
    } else {
      console.warn('⚠️ Rôle inconnu, redirection vers /');
      this.router.navigate(['/']);
    }
  }

  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
