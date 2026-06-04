import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Booking } from '../../core/models/delivery.models';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <h2 class="mb-3">Admin Ride Monitor</h2>

      <div class="alert alert-info">
        Ride start is customer-controlled only. Admin approval is removed. Customer must enter OTP from tracking page to start ride.
      </div>

      <div class="card p-3" *ngFor="let booking of bookings$ | async">
        <div class="row g-3 align-items-end">
          <div class="col-lg-4"><strong>{{ booking.id }}</strong></div>
          <div class="col-lg-3">{{ booking.status }}</div>
          <div class="col-lg-2">{{ booking.userName }}</div>
          <div class="col-lg-3">
            <span class="badge" [ngClass]="booking.otpVerified ? 'text-bg-success' : 'text-bg-warning'">
              {{ booking.otpVerified ? 'Customer OTP Verified' : 'Waiting Customer OTP' }}
            </span>
          </div>
        </div>
        <small class="text-muted">Drop: {{ booking.drop.address }} | Vehicle: {{ booking.vehicleType }}</small>
      </div>
    </div>
  `,
  styles: [
    `
      .card + .card {
        margin-top: 0.75rem;
      }
    `
  ]
})
export class AdminComponent {
  bookings$: Observable<Booking[]>;

  constructor(private bookingService: BookingService) {
    this.bookings$ = this.bookingService.bookings$;
  }
}
