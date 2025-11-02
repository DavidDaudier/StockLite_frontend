import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductReceiptComponent } from './product-receipt.component';

describe('ProductReceiptComponent', () => {
  let component: ProductReceiptComponent;
  let fixture: ComponentFixture<ProductReceiptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductReceiptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductReceiptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
