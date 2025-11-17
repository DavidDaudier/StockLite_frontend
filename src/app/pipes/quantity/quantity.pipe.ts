import { Pipe, PipeTransform } from '@angular/core';
import { ProductItem } from "./../../models/product-item.model";

@Pipe({
  standalone: true,
  name: 'quantity'
})
export class QuantityPipe implements PipeTransform {

  transform(items: ProductItem[], id: string): number {
    return items.find(i => i.id === id)?.qty || 0;
  }

}
