import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeUser,
  hugeEdit02,
  hugeLockPassword,
  hugeMail01,
  hugeCall
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugeUser,
      hugeEdit02,
      hugeLockPassword,
      hugeMail01,
      hugeCall
    })
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private usersService = inject(UsersService);

  currentUser = signal<any>(null);
  isEditingProfile = signal<boolean>(false);
  isEditingPassword = signal<boolean>(false);

  // Boutons eye pour les champs password
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  // Validation instantanée du mot de passe
  passwordsMatch = signal<boolean | null>(null); // null = pas encore saisi, true = match, false = ne match pas

  // Messages
  successMessage = signal<string>('');
  errorMessage = signal<string>('');
  loading = signal<boolean>(false);

  profileForm = signal({
    username: '',
    fullName: '',
    email: ''
  });

  passwordForm = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set(user);
      this.profileForm.set({
        username: user.username || '',
        fullName: user.fullName || '',
        email: user.email || ''
      });
    }
  }

  toggleEditProfile(): void {
    this.isEditingProfile.set(!this.isEditingProfile());
    if (!this.isEditingProfile()) {
      // Reset form if canceling
      this.loadUserProfile();
    }
  }

  saveProfile(): void {
    const user = this.currentUser();
    if (!user) return;

    const form = this.profileForm();

    // Validation
    if (!form.username || !form.username.trim()) {
      this.showError('Le nom d\'utilisateur est requis');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    // Appel API pour mettre à jour le profil
    this.usersService.update(user.id, {
      username: form.username.trim(),
      fullName: form.fullName?.trim() || undefined,
      email: form.email?.trim() || undefined
    }).subscribe({
      next: (updatedUser) => {
        // Mettre à jour l'utilisateur dans le local storage
        this.authService.updateCurrentUser(updatedUser);
        this.loadUserProfile();
        this.showSuccess('Profil mis à jour avec succès!');
        this.isEditingProfile.set(false);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du profil:', error);
        this.showError(error.error?.message || 'Erreur lors de la mise à jour du profil');
        this.loading.set(false);
      }
    });
  }

  toggleEditPassword(): void {
    this.isEditingPassword.set(!this.isEditingPassword());
    if (!this.isEditingPassword()) {
      // Reset password form
      this.passwordForm.set({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Reset password visibility
      this.showCurrentPassword = false;
      this.showNewPassword = false;
      this.showConfirmPassword = false;
      // Reset validation
      this.passwordsMatch.set(null);
    }
  }

  // Validation instantanée du nouveau mot de passe
  onNewPasswordChange(): void {
    const form = this.passwordForm();
    if (form.confirmPassword) {
      this.passwordsMatch.set(form.newPassword === form.confirmPassword);
    }
  }

  onConfirmPasswordChange(): void {
    const form = this.passwordForm();
    if (form.newPassword && form.confirmPassword) {
      this.passwordsMatch.set(form.newPassword === form.confirmPassword);
    } else if (!form.confirmPassword) {
      this.passwordsMatch.set(null);
    }
  }

  // Méthode pour obtenir la classe CSS du champ confirmation
  getConfirmPasswordBorderClass(): string {
    const match = this.passwordsMatch();
    if (match === null || !this.passwordForm().confirmPassword) {
      return 'w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
    }
    if (match === true) {
      return 'w-full px-3 py-2 pr-10 border-2 border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500';
    }
    return 'w-full px-3 py-2 pr-10 border-2 border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500';
  }

  // Bloquer le copier-coller du nouveau mot de passe
  onCopyNewPassword(event: ClipboardEvent): void {
    event.preventDefault();
    this.showError('Copier le mot de passe n\'est pas autorisé');
  }

  onCutNewPassword(event: ClipboardEvent): void {
    event.preventDefault();
    this.showError('Couper le mot de passe n\'est pas autorisé');
  }

  // Bloquer le copier-coller dans le champ de confirmation
  onPasteConfirmPassword(event: ClipboardEvent): void {
    event.preventDefault();
    this.showError('Coller le mot de passe n\'est pas autorisé. Veuillez le saisir manuellement.');
  }

  onCopyConfirmPassword(event: ClipboardEvent): void {
    event.preventDefault();
  }

  onCutConfirmPassword(event: ClipboardEvent): void {
    event.preventDefault();
  }

  // Vérifier si le formulaire de mot de passe est valide
  isPasswordFormValid(): boolean {
    const form = this.passwordForm();
    return !!(
      form.currentPassword &&
      form.newPassword &&
      form.confirmPassword &&
      form.newPassword === form.confirmPassword &&
      form.newPassword.length >= 6
    );
  }

  changePassword(): void {
    const user = this.currentUser();
    if (!user) return;

    const form = this.passwordForm();

    // Validations
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      this.showError('Veuillez remplir tous les champs');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      this.showError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (form.newPassword.length < 6) {
      this.showError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    // Appel API pour changer le mot de passe
    this.usersService.update(user.id, {
      password: form.newPassword
    }).subscribe({
      next: () => {
        this.showSuccess('Mot de passe changé avec succès!');
        this.toggleEditPassword();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du changement de mot de passe:', error);
        this.showError(error.error?.message || 'Erreur lors du changement de mot de passe');
        this.loading.set(false);
      }
    });
  }

  // Toggle methods for password visibility
  toggleShowCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Messages methods
  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  getInitials(user: any): string {
    if (!user) return 'U';
    const firstName = user.firstName || user.username || '';
    const lastName = user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  }

  getUserRole(role: string): string {
    const roles: Record<string, string> = {
      'admin': 'Administrateur',
      'seller': 'Vendeur',
      'SELLER': 'Vendeur',
      'ADMIN': 'Administrateur'
    };
    return roles[role] || role;
  }
}
 
