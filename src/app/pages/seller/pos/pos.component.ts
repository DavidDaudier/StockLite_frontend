import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugePlusSign, hugeNotebook01, hugeTimeSchedule } from '@ng-icons/huge-icons';
import { ProductService } from '../../../services/product/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar.component';
import { PosHeaderComponent } from '../../../components/pos-header/pos-header.component';
// import { CategoryProductComponent } from '../../../components/category-product/category-product.component';
import { ProductListComponent } from '../../../components/product-list/product-list.component';
import { ProductReceiptComponent } from '../../../components/product-receipt/product-receipt.component';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgIcon,
    SidebarComponent,
    PosHeaderComponent,
    // CategoryProductComponent,
    ProductListComponent,
    ProductReceiptComponent
  ],
  viewProviders: [
    provideIcons({
      hugePlusSign,
      hugeNotebook01,
      hugeTimeSchedule
    })
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css'
})
export class PosComponent implements OnInit {
  private authService = inject(AuthService);

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // Charger les produits depuis le backend
    this.productService.loadFromBackend();
  }

  get draftsRoute(): string {
    return this.authService.isAdmin() ? '/admin/drafts' : '/seller/drafts';
  }

  get salesHistoryRoute(): string {
    return this.authService.isAdmin() ? '/admin/history' : '/seller/history';
  }
}
