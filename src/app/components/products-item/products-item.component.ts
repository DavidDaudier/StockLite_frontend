import { hugePackageSent, hugeArrowRight01, hugeArrowLeft01 } from "@ng-icons/huge-icons";
import { NgIcon, provideIcons } from "@ng-icons/core";
import { Component, } from '@angular/core';
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-products-item',
  imports: [
    CommonModule,
    NgIcon
  ],
  viewProviders: [
    provideIcons({
      hugePackageSent,
      hugeArrowRight01,
      hugeArrowLeft01,
    })
  ],
  templateUrl: './products-item.component.html',
  styleUrl: './products-item.component.css'
})
export class ProductsItemComponent {

}
