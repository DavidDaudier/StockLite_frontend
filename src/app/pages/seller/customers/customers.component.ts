import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeUserMultiple,
  hugeSearch01,
  hugePlusSign,
  hugeEye,
  hugeEdit02
} from '@ng-icons/huge-icons';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalPurchases: number;
  lastPurchase?: string;
  loyaltyPoints?: number;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, SidebarComponent, PosHeaderComponent],
  viewProviders: [
    provideIcons({
      hugeUserMultiple,
      hugeSearch01,
      hugePlusSign,
      hugeEye,
      hugeEdit02
    })
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css'
})
export class CustomersComponent implements OnInit {
  customers = signal<Customer[]>([]);
  filteredCustomers = signal<Customer[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  showAddModal = signal<boolean>(false);

  newCustomer = signal({
    name: '',
    phone: '',
    email: ''
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading.set(true);

    // Simuler des données clients (à remplacer par un vrai appel API)
    setTimeout(() => {
      const mockCustomers: Customer[] = [
        {
          id: '1',
          name: 'Jean Baptiste',
          phone: '+509 3712 3456',
          email: 'jean@example.com',
          totalPurchases: 15000,
          lastPurchase: '2025-10-20',
          loyaltyPoints: 150
        },
        {
          id: '2',
          name: 'Marie Pierre',
          phone: '+509 4425 6789',
          totalPurchases: 8500,
          lastPurchase: '2025-10-18',
          loyaltyPoints: 85
        }
      ];

      this.customers.set(mockCustomers);
      this.filteredCustomers.set(mockCustomers);
      this.loading.set(false);
    }, 500);
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm.set(term);

    if (!term) {
      this.filteredCustomers.set(this.customers());
      return;
    }

    const filtered = this.customers().filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.phone.includes(term) ||
      customer.email?.toLowerCase().includes(term)
    );
    this.filteredCustomers.set(filtered);
  }

  openAddModal(): void {
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.newCustomer.set({ name: '', phone: '', email: '' });
  }

  saveCustomer(): void {
    const customer = this.newCustomer();
    if (!customer.name || !customer.phone) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    // Ici, vous ajouteriez l'appel API pour sauvegarder le client
    alert('Client ajouté avec succès!');
    this.closeAddModal();
    this.loadCustomers();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 2
    }).format(amount).replace('HTG', 'Gdes');
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
