import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartItem, Order } from '../../models';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4">
      <h1 class="mb-4">Place Order</h1>
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card p-3">
            <h5>Delivery Address</h5>
            <input class="form-control mb-2" placeholder="Full Name" [(ngModel)]="fullName" />
            <input class="form-control mb-2" placeholder="Phone" [(ngModel)]="phone" />
            <textarea class="form-control mb-2" rows="3" placeholder="Address" [(ngModel)]="address"></textarea>
            <div class="row g-2">
              <div class="col-md-4"><input class="form-control" placeholder="City" [(ngModel)]="city" /></div>
              <div class="col-md-4"><input class="form-control" placeholder="State" [(ngModel)]="state" /></div>
              <div class="col-md-4"><input class="form-control" placeholder="ZIP" [(ngModel)]="zip" /></div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card p-3">
            <h5>Summary</h5>
            <p>Items: {{ (cartItems$ | async)?.length || 0 }}</p>
            <p>Subtotal: <strong>\${{ subtotal$ | async | number: '1.2-2' }}</strong></p>
            <button class="btn btn-danger w-100" [disabled]="!isFormValid() || isLoading" (click)="placeOrder()">
              {{ isLoading ? 'Processing...' : 'Place Order' }}
            </button>
            <a routerLink="/cart" class="btn btn-outline-secondary w-100 mt-2">Back to Cart</a>
            <div *ngIf="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class OrderComponent {
  cartItems$: Observable<CartItem[]>;
  subtotal$: Observable<number>;

  fullName = '';
  phone = '';
  address = '';
  city = '';
  state = '';
  zip = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {
    this.cartItems$ = this.cartService.cartItems$;
    this.subtotal$ = this.cartItems$.pipe(
      map(items => items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0))
    );
  }

  isFormValid(): boolean {
    return !!(this.fullName && this.phone && this.address && this.city && this.state && this.zip);
  }

  placeOrder(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const items = this.cartService.getCartItems();
    const subtotal = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

    const order: Order = {
      id: `ORD-${Date.now()}`,
      userId: 'user123',
      items,
      totalPrice: subtotal,
      status: 'pending',
      deliveryAddress: `${this.address}, ${this.city}, ${this.state} ${this.zip}`,
      estimatedTime: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.orderService.createOrder(order).subscribe({
      next: (createdOrder) => {
        this.orderService.setCurrentOrder(createdOrder);
        this.cartService.clearCart();
        this.isLoading = false;
        this.router.navigate(['/tracking', createdOrder.id]);
      },
      error: () => {
        this.orderService.setCurrentOrder(order);
        this.cartService.clearCart();
        this.isLoading = false;
        this.router.navigate(['/tracking', order.id]);
      }
    });
  }
}
