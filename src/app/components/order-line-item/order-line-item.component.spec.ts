import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderLineItemComponent } from './order-line-item.component';

describe('OrderLineItemComponent', () => {
  let component: OrderLineItemComponent;
  let fixture: ComponentFixture<OrderLineItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderLineItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderLineItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
