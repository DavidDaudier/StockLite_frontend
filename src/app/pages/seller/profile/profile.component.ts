import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
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

  currentUser = signal<any>(null);
  isEditingProfile = signal<boolean>(false);
  isEditingPassword = signal<boolean>(false);

  profileForm = signal({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
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
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
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
    // Implémenter l'appel API pour sauvegarder le profil
    alert('Profil mis à jour avec succès!');
    this.isEditingProfile.set(false);
    this.loadUserProfile();
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
    }
  }

  changePassword(): void {
    const form = this.passwordForm();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (form.newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Implémenter l'appel API pour changer le mot de passe
    alert('Mot de passe changé avec succès!');
    this.toggleEditPassword();
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
 
