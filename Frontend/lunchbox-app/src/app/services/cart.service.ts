import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem, MenuItem } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>(this.loadFromLocalStorage());
  public cartItems$: Observable<CartItem[]> = this.cartItemsSubject.asObservable();

  addToCart(menuItem: MenuItem, quantity: number = 1): void {
    const currentCart = this.cartItemsSubject.value;
    const existingItem = currentCart.find(item => item.menuItem.id === menuItem.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      currentCart.push({ menuItem, quantity });
    }

    this.cartItemsSubject.next([...currentCart]);
    this.saveToLocalStorage();
  }

  removeFromCart(menuItemId: string): void {
    const updatedCart = this.cartItemsSubject.value.filter(item => item.menuItem.id !== menuItemId);
    this.cartItemsSubject.next(updatedCart);
    this.saveToLocalStorage();
  }

  updateQuantity(menuItemId: string, quantity: number): void {
    const currentCart = this.cartItemsSubject.value;
    const item = currentCart.find(i => i.menuItem.id === menuItemId);

    if (!item) {
      return;
    }

    if (quantity <= 0) {
      this.removeFromCart(menuItemId);
      return;
    }

    item.quantity = quantity;
    this.cartItemsSubject.next([...currentCart]);
    this.saveToLocalStorage();
  }

  clearCart(): void {
    this.cartItemsSubject.next([]);
    localStorage.removeItem('lunchbox_cart');
  }

  getCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  private loadFromLocalStorage(): CartItem[] {
    const saved = localStorage.getItem('lunchbox_cart');
    return saved ? JSON.parse(saved) : [];
  }

  private saveToLocalStorage(): void {
    localStorage.setItem('lunchbox_cart', JSON.stringify(this.cartItemsSubject.value));
  }
}
