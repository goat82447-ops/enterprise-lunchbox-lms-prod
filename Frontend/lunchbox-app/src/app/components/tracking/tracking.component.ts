import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Order } from '../../models';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4">
      <h1 class="mb-4">Track Order</h1>

      <div *ngIf="!order" class="alert alert-info">No active order. Place one from checkout.</div>

      <div *ngIf="order" class="card p-3">
        <h5 class="mb-2">Order #{{ order.id }}</h5>
        <p class="mb-2">Status: <span class="badge text-bg-success">{{ order.status }}</span></p>
        <p class="mb-2">ETA: {{ order.estimatedTime }} min</p>
        <p class="mb-2" *ngIf="order.vehicleType">Vehicle: {{ order.vehicleType | titlecase }}</p>
        <p class="mb-2" *ngIf="order.subtotal !== undefined">Subtotal: \${{ order.subtotal | number: '1.2-2' }}</p>
        <p class="mb-2" *ngIf="order.deliveryFee !== undefined">Delivery Fee: \${{ order.deliveryFee | number: '1.2-2' }}</p>
        <p class="mb-2">Total Fare: <strong>\${{ order.totalPrice | number: '1.2-2' }}</strong></p>
        <p class="mb-0">Delivery: {{ order.deliveryAddress }}</p>
      </div>

      <a class="btn btn-primary mt-3" routerLink="/home">Back to Menu</a>
    </div>
  `
})
export class TrackingComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  private destroy$ = new Subject<void>();

  constructor(private orderService: OrderService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const orderId = params.get('id');
      if (orderId) {
        this.orderService.getOrder(orderId).subscribe({
          next: (order) => (this.order = order),
          error: () => (this.order = this.orderService.getCurrentOrder())
        });
      } else {
        this.order = this.orderService.getCurrentOrder();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
