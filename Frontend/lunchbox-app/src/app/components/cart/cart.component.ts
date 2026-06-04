import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartItem } from '../../models';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4">
      <h1 class="mb-4">Your Cart</h1>

      <div *ngIf="(cartItems$ | async)?.length === 0" class="alert alert-info">
        Cart is empty. <a routerLink="/home">Go to menu</a>
      </div>

      <div *ngIf="(cartItems$ | async)?.length! > 0">
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of cartItems$ | async">
                <td>{{ item.menuItem.name }}</td>
                <td>\${{ item.menuItem.price | number: '1.2-2' }}</td>
                <td>
                  <input type="number" min="1" [value]="item.quantity" (change)="updateQuantity(item.menuItem.id, $event)" class="form-control" style="max-width: 100px;" />
                </td>
                <td>\${{ (item.menuItem.price * item.quantity) | number: '1.2-2' }}</td>
                <td><button class="btn btn-outline-danger btn-sm" (click)="removeFromCart(item.menuItem.id)">Remove</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-end">
          <div class="card p-3" style="min-width: 280px;">
            <p class="mb-1">Subtotal: <strong>\${{ cartTotal$ | async | number: '1.2-2' }}</strong></p>
            <button class="btn btn-danger" routerLink="/order">Proceed to Checkout</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CartComponent {
  cartItems$: Observable<CartItem[]>;
  cartTotal$: Observable<number>;

  constructor(private cartService: CartService) {
    this.cartItems$ = this.cartService.cartItems$;
    this.cartTotal$ = this.cartItems$.pipe(
      map(items => items.reduce((total, item) => total + item.menuItem.price * item.quantity, 0))
    );
  }

  updateQuantity(itemId: string, event: Event): void {
    const quantity = parseInt((event.target as HTMLInputElement).value, 10);
    this.cartService.updateQuantity(itemId, quantity);
  }

  removeFromCart(itemId: string): void {
    this.cartService.removeFromCart(itemId);
  }
}
