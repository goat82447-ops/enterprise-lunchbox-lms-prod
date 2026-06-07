import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../models';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <div class="mb-4">
        <h1 class="display-5">RouteX Delivery</h1>
        <p class="lead text-muted">Fresh food delivered quickly.</p>
      </div>

      <h2 class="h4 mb-3">Featured Menu</h2>
      <div class="row g-4">
        <div class="col-md-6 col-lg-4" *ngFor="let item of menuItems">
          <div class="card h-100">
            <img [src]="item.imageUrl" [alt]="item.name" class="card-img-top" style="height: 180px; object-fit: cover;" />
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">{{ item.name }}</h5>
              <p class="badge text-bg-success align-self-start">{{ item.category }}</p>
              <p class="text-muted">{{ item.description }}</p>
              <div class="mt-auto d-flex justify-content-between align-items-center">
                <strong>\${{ item.price }}</strong>
                <button class="btn btn-danger btn-sm" (click)="addToCart(item)">Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent {
  menuItems: MenuItem[] = [
    { id: '1', name: 'Pepperoni Pizza', price: 12.99, description: 'Classic pepperoni and cheese', imageUrl: 'https://via.placeholder.com/300x200?text=Pepperoni+Pizza', category: 'Pizza' },
    { id: '2', name: 'Margherita Pizza', price: 11.99, description: 'Fresh basil and mozzarella', imageUrl: 'https://via.placeholder.com/300x200?text=Margherita+Pizza', category: 'Pizza' },
    { id: '3', name: 'Veggie Burger', price: 9.99, description: 'Plant-based patty with greens', imageUrl: 'https://via.placeholder.com/300x200?text=Veggie+Burger', category: 'Burgers' },
    { id: '4', name: 'Chicken Wings', price: 7.99, description: 'Spicy wings with dip', imageUrl: 'https://via.placeholder.com/300x200?text=Chicken+Wings', category: 'Appetizers' },
    { id: '5', name: 'Caesar Salad', price: 8.99, description: 'Crisp romaine and parmesan', imageUrl: 'https://via.placeholder.com/300x200?text=Caesar+Salad', category: 'Salads' },
    { id: '6', name: 'Chocolate Cake', price: 5.99, description: 'Rich chocolate dessert', imageUrl: 'https://via.placeholder.com/300x200?text=Chocolate+Cake', category: 'Desserts' }
  ];

  constructor(private cartService: CartService) {}

  addToCart(item: MenuItem): void {
    this.cartService.addToCart(item, 1);
    alert(`${item.name} added to cart.`);
  }
}
