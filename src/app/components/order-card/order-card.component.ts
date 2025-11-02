import { Component, Input } from '@angular/core'
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-order-card',
  imports: [CommonModule],
  templateUrl: './order-card.component.html',
  styleUrl: './order-card.component.css'
})
export class OrderCardComponent {
  @Input() orderNo!: string;
  @Input() table!: string;
  @Input() time!: string;
}
