import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-line-item',
  imports: [
    CommonModule,
  ],
  templateUrl: './order-line-item.component.html',
  styleUrl: './order-line-item.component.css'
})
export class OrderLineItemComponent {

  @Input({ required: true }) qty!:   number;
  @Input({ required: true }) name!:  string;
  @Input({ required: true }) price!: number;
  @Input({ required: true }) time!:  string;
  @Input({ required: true }) status!: string;
}
