import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartItem, Order } from '../../models';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../core/services/auth.service';

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
            <div class="mb-2">
              <label class="form-label small mb-1">Vehicle Type</label>
              <select class="form-select form-select-sm" [(ngModel)]="selectedVehicle">
                <option value="bike">Bike</option>
                <option value="auto">Auto</option>
                <option value="car">Car</option>
              </select>
            </div>
            <p class="mb-1">Delivery ({{ selectedVehicle | titlecase }}): <strong>
\${{ getDeliveryFee() | number: '1.2-2' }}</strong></p>
            <p class="mb-2">Total Fare: <strong class="text-danger">
\${{ getTotalFare() | number: '1.2-2' }}</strong></p>
            <div class="small text-muted mb-2">Fare preview: Bike \${{ vehicleFarePreview.bike | number: '1.2-2' }} | Auto \${{ vehicleFarePreview.auto | number: '1.2-2' }} | Car \${{ vehicleFarePreview.car | number: '1.2-2' }}</div>
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
  subtotalValue = 0;

  fullName = '';
  phone = '';
  address = '';
  city = '';
  state = '';
  zip = '';
  selectedVehicle: 'bike' | 'auto' | 'car' = 'bike';
  vehicleFarePreview: Record<'bike' | 'auto' | 'car', number> = {
    bike: 0,
    auto: 0,
    car: 0
  };
  isLoading = false;
  errorMessage = '';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router,
    private authService: AuthService
  ) {
    this.cartItems$ = this.cartService.cartItems$;
    this.subtotal$ = this.cartItems$.pipe(
      map(items => items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0))
    );

    this.subtotal$.subscribe((subtotal) => {
      this.subtotalValue = subtotal;
      this.vehicleFarePreview = {
        bike: this.calculateTotalFare(subtotal, 'bike'),
        auto: this.calculateTotalFare(subtotal, 'auto'),
        car: this.calculateTotalFare(subtotal, 'car')
      };
    });
  }

  isFormValid(): boolean {
    return !!(this.fullName && this.phone && this.address && this.city && this.state && this.zip && this.cartService.getCartItems().length > 0);
  }

  getDeliveryFee(): number {
    return this.calculateDeliveryFee(this.subtotalValue, this.selectedVehicle);
  }

  getTotalFare(): number {
    return this.calculateTotalFare(this.subtotalValue, this.selectedVehicle);
  }

  private calculateDeliveryFee(subtotal: number, vehicle: 'bike' | 'auto' | 'car'): number {
    const baseByVehicle: Record<'bike' | 'auto' | 'car', number> = {
      bike: 22,
      auto: 32,
      car: 44
    };
    const percentage = subtotal * 0.06;
    return Number((baseByVehicle[vehicle] + percentage).toFixed(2));
  }

  private calculateTotalFare(subtotal: number, vehicle: 'bike' | 'auto' | 'car'): number {
    return Number((subtotal + this.calculateDeliveryFee(subtotal, vehicle)).toFixed(2));
  }

  placeOrder(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const items = this.cartService.getCartItems();
    const subtotal = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
    const deliveryFee = this.calculateDeliveryFee(subtotal, this.selectedVehicle);
    const totalFare = this.calculateTotalFare(subtotal, this.selectedVehicle);
    const currentUser = this.authService.getCurrentUser();

    const order: Order = {
      id: `ORD-${Date.now()}`,
      userId: currentUser?.id || 'guest-user',
      items,
      subtotal,
      deliveryFee,
      totalPrice: totalFare,
      vehicleType: this.selectedVehicle,
      status: 'pending',
      deliveryAddress: `${this.address}, ${this.city}, ${this.state} ${this.zip}`,
      estimatedTime: this.selectedVehicle === 'bike' ? 32 : this.selectedVehicle === 'auto' ? 28 : 24,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.orderService.setCurrentOrder(order);

    this.orderService.createOrder(order).subscribe({
      next: (createdOrder) => {
        this.orderService.setCurrentOrder(createdOrder);
        this.cartService.clearCart();
        this.isLoading = false;
        this.router.navigate(['/order-tracking', createdOrder.id]);
      },
      error: () => {
        this.orderService.setCurrentOrder(order);
        this.cartService.clearCart();
        this.isLoading = false;
        this.router.navigate(['/order-tracking', order.id]);
      }
    });
  }
}
