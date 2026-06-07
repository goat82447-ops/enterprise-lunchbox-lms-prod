import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4 services-page">
      <h2 class="mb-1">Services</h2>
      <p class="text-muted mb-3">Choose any mode quickly for easy customer use.</p>

      <h6 class="section-title">Safety & Special Modes</h6>
      <div class="service-grid">
        <button class="service-card" type="button" (click)="openWomenSafetyMode()">
          <div class="emoji">🛡️</div>
          <div class="title">Women Safety Mode</div>
          <div class="subtitle">Prioritize top-ranked captains</div>
        </button>

        <button class="service-card" type="button" (click)="openTeenageRideMode()">
          <div class="emoji">🧒</div>
          <div class="title">Teenage Ride Mode</div>
          <div class="subtitle">Safer booking for teen rides</div>
        </button>

        <button class="service-card" type="button" (click)="openScheduledRideMode()">
          <div class="emoji">⏰</div>
          <div class="title">Scheduled Ride</div>
          <div class="subtitle">Book now for later time</div>
        </button>

        <button class="service-card" type="button" (click)="openBookingForOthersMode()">
          <div class="emoji">👨‍👩‍👧</div>
          <div class="title">Book for Others</div>
          <div class="subtitle">Family and friend ride booking</div>
        </button>
      </div>

      <h6 class="section-title mt-4">Ride Modes</h6>
      <div class="service-grid">
        <button class="service-card" type="button" (click)="openVehicleRide('bike')">
          <div class="emoji">🏍️</div>
          <div class="title">Bike Ride</div>
          <div class="subtitle">Fast and affordable</div>
        </button>

        <button class="service-card" type="button" (click)="openVehicleRide('auto')">
          <div class="emoji">🛺</div>
          <div class="title">Auto Ride</div>
          <div class="subtitle">Quick city travel</div>
        </button>

        <button class="service-card" type="button" (click)="openVehicleRide('car')">
          <div class="emoji">🚗</div>
          <div class="title">Car Ride</div>
          <div class="subtitle">Comfortable daily rides</div>
        </button>

        <button class="service-card" type="button" (click)="openActivity()">
          <div class="emoji">🧾</div>
          <div class="title">Track Activity</div>
          <div class="subtitle">View active and past rides</div>
        </button>
      </div>

      <h6 class="section-title mt-4">Delivery Services (Project Modes)</h6>
      <div class="service-grid">
        <button class="service-card" type="button" (click)="openPickupService()">
          <div class="emoji">🛍️</div>
          <div class="title">Pickup Service</div>
          <div class="subtitle">Pickup item from shop to drop location</div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('food')">
          <div class="emoji">🍱</div>
          <div class="title">Food Delivery</div>
          <div class="subtitle">Meals and restaurant delivery</div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('parcel')">
          <div class="emoji">📦</div>
          <div class="title">Parcel Delivery</div>
          <div class="subtitle">Send packages safely</div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('grocery')">
          <div class="emoji">🛒</div>
          <div class="title">Grocery Delivery</div>
          <div class="subtitle">Daily needs to doorstep</div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('medicine')">
          <div class="emoji">💊</div>
          <div class="title">Medicine Delivery</div>
          <div class="subtitle">Fast pharmacy support</div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('documents')">
          <div class="emoji">📄</div>
          <div class="title">Documents Delivery</div>
          <div class="subtitle">Secure file transport</div>
        </button>

        <button class="service-card" type="button" (click)="openLunchBox()">
          <div class="emoji">🎒</div>
          <div class="title">RouteX School Delivery</div>
          <div class="subtitle">School meal booking and history</div>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .service-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: stretch;
      }

      .services-page {
        padding-left: 10px;
        padding-right: 10px;
      }

      .section-title {
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 10px;
      }

      .service-card {
        border: 1px solid var(--border-color);
        background: var(--surface);
        color: var(--text-primary);
        border-radius: 14px;
        padding: 14px;
        text-align: left;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        height: 100%;
      }

      .service-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      }

      .emoji {
        font-size: 1.6rem;
        margin-bottom: 8px;
      }

      .title {
        font-weight: 700;
        margin-bottom: 4px;
      }

      .subtitle {
        font-size: 0.86rem;
        color: var(--text-secondary);
      }

      @media (max-width: 575.98px) {
        .services-page {
          padding-left: 4px;
          padding-right: 4px;
        }

        .service-grid {
          grid-template-columns: 1fr;
        }

        .service-card {
          padding: 12px;
        }

        .title {
          font-size: 0.98rem;
        }

        .subtitle {
          font-size: 0.82rem;
        }
      }

      @media (max-width: 390px) {
        .section-title {
          font-size: 0.82rem;
        }

        .emoji {
          font-size: 1.45rem;
        }
      }

      @media (min-width: 768px) and (max-width: 991.98px) {
        .service-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `
  ]
})
export class ServicesComponent {
  constructor(private router: Router) {}

  openBooking(serviceType: string): void {
    this.router.navigate(['/booking'], { queryParams: { service: serviceType } });
  }

  openVehicleRide(vehicleType: string): void {
    this.router.navigate(['/booking'], { queryParams: { vehicle: vehicleType } });
  }

  openWomenSafetyMode(): void {
    this.router.navigate(['/booking'], { queryParams: { womenSafety: 1, service: 'parcel' } });
  }

  openTeenageRideMode(): void {
    this.router.navigate(['/booking'], { queryParams: { teenRide: 1, bookingFor: 'others', service: 'parcel' } });
  }

  openScheduledRideMode(): void {
    this.router.navigate(['/booking'], { queryParams: { rideMode: 'later', service: 'parcel' } });
  }

  openBookingForOthersMode(): void {
    this.router.navigate(['/booking'], { queryParams: { bookingFor: 'others', service: 'parcel' } });
  }

  openLunchBox(): void {
    this.router.navigate(['/school-booking'], { queryParams: { lunchBox: 1, service: 'food' } });
  }

  openPickupService(): void {
    this.router.navigate(['/booking'], { queryParams: { service: 'parcel', pickupService: 1 } });
  }

  openActivity(): void {
    this.router.navigate(['/activity']);
  }
}
