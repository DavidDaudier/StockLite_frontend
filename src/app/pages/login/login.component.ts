import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private offlineSyncService: OfflineSyncService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Vérifier l'état de connexion
    this.offlineSyncService.getOnlineStatus().subscribe(status => {
      this.isOnline = status;
    });

    // Rediriger si déjà connecté
    if (this.authService.isAuthenticated()) {
      this.redirectToDashboard();
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (response) => {
        console.log('✅ Connexion réussie:', response.user);
        this.loading = false;
        this.redirectToDashboard();
      },
      error: (error) => {
        console.error('❌ Erreur de connexion:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Identifiants incorrects. Veuillez réessayer.';
      }
    });
  }

  private redirectToDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (user?.role === 'seller') {
      this.router.navigate(['/seller/pos']);
    } else {
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
