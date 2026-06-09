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

      <h6 class="section-title">Safety &amp; Special Modes</h6>
      <div class="service-grid">
        <button class="service-card" type="button" (click)="openWomenSafetyMode()">
          <div class="svc-icon">🛡️</div>
          <div class="svc-body">
            <div class="svc-title">Women Safety Mode</div>
            <div class="svc-subtitle">Prioritize top-ranked captains</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openTeenageRideMode()">
          <div class="svc-icon">🧒</div>
          <div class="svc-body">
            <div class="svc-title">Teenage Ride Mode</div>
            <div class="svc-subtitle">Safer booking for teen rides</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openScheduledRideMode()">
          <div class="svc-icon">⏰</div>
          <div class="svc-body">
            <div class="svc-title">Scheduled Ride</div>
            <div class="svc-subtitle">Book now for later time</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openBookingForOthersMode()">
          <div class="svc-icon">👨‍👩‍👧</div>
          <div class="svc-body">
            <div class="svc-title">Book for Others</div>
            <div class="svc-subtitle">Family and friend ride booking</div>
          </div>
        </button>
      </div>

      <h6 class="section-title mt-4">Ride Modes</h6>
      <div class="service-grid">
        <button class="service-card" type="button" (click)="openVehicleRide('bike')">
          <div class="svc-icon">🏍️</div>
          <div class="svc-body">
            <div class="svc-title">Bike Ride</div>
            <div class="svc-subtitle">Fast and affordable</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openVehicleRide('auto')">
          <div class="svc-icon">🛺</div>
          <div class="svc-body">
            <div class="svc-title">Auto Ride</div>
            <div class="svc-subtitle">Quick city travel</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openVehicleRide('car')">
          <div class="svc-icon">🚗</div>
          <div class="svc-body">
            <div class="svc-title">Car Ride</div>
            <div class="svc-subtitle">Comfortable daily rides</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openActivity()">
          <div class="svc-icon">🧾</div>
          <div class="svc-body">
            <div class="svc-title">Track Activity</div>
            <div class="svc-subtitle">View active and past rides</div>
          </div>
        </button>
      </div>

      <h6 class="section-title mt-4">Delivery Services</h6>
      <div class="service-grid">
        <button class="service-card" type="button" (click)="openPickupService()">
          <div class="svc-icon">🛍️</div>
          <div class="svc-body">
            <div class="svc-title">Pickup Service</div>
            <div class="svc-subtitle">Pickup item from shop to drop location</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('food')">
          <div class="svc-icon">🍱</div>
          <div class="svc-body">
            <div class="svc-title">Food Delivery</div>
            <div class="svc-subtitle">Meals and restaurant delivery</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('parcel')">
          <div class="svc-icon">📦</div>
          <div class="svc-body">
            <div class="svc-title">Parcel Delivery</div>
            <div class="svc-subtitle">Send packages safely</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('grocery')">
          <div class="svc-icon">🛒</div>
          <div class="svc-body">
            <div class="svc-title">Grocery Delivery</div>
            <div class="svc-subtitle">Daily needs to doorstep</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('medicine')">
          <div class="svc-icon">💊</div>
          <div class="svc-body">
            <div class="svc-title">Medicine Delivery</div>
            <div class="svc-subtitle">Fast pharmacy support</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openBooking('documents')">
          <div class="svc-icon">📄</div>
          <div class="svc-body">
            <div class="svc-title">Documents Delivery</div>
            <div class="svc-subtitle">Secure file transport</div>
          </div>
        </button>

        <button class="service-card" type="button" (click)="openLunchBox()">
          <div class="svc-icon">🎒</div>
          <div class="svc-body">
            <div class="svc-title">RouteX School Delivery</div>
            <div class="svc-subtitle">School meal booking and history</div>
          </div>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .services-page {
        padding-left: 10px;
        padding-right: 10px;
      }

      .section-title {
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-secondary, #64748b);
        margin-bottom: 10px;
      }

      /* ── Grid: matches Popular Services on home ── */
      .service-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      /* ── Card: identical to service-showcase-card on home ── */
      .service-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        background: var(--surface, #fff);
        color: var(--text-primary, #1e293b);
        padding: 14px;
        text-align: left;
        width: 100%;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }

      .service-card:hover {
        transform: translateY(-2px);
        border-color: rgba(239, 35, 60, 0.3);
        box-shadow: 0 4px 16px rgba(2, 6, 23, 0.08);
      }

      .service-card:active {
        transform: translateY(0);
      }

      /* ── Icon box: matches service-showcase-icon on home ── */
      .svc-icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: #fff1f2;
        border: 1px solid rgba(239, 35, 60, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }

      .svc-body {
        flex: 1;
        min-width: 0;
      }

      .svc-title {
        font-size: 0.9rem;
        font-weight: 700;
        margin-bottom: 3px;
        line-height: 1.3;
      }

      .svc-subtitle {
        font-size: 0.78rem;
        color: var(--text-secondary, #64748b);
        line-height: 1.4;
      }

      /* ── Responsive ── */
      @media (max-width: 479px) {
        .services-page {
          padding-left: 4px;
          padding-right: 4px;
        }

        .service-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 480px) and (max-width: 767px) {
        .service-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 768px) {
        .service-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `
  ]
})
export class ServicesComponent {
  constructor(private router: Router) {}

  openBooking(serviceType: string): void {
    if (serviceType === 'food') {
      this.router.navigate(['/booking/food/hotels']);
      return;
    }

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
    this.router.navigate(['/lunchbox-delivery'], { queryParams: { lunchBox: 1, service: 'food' } });
  }

  openPickupService(): void {
    this.router.navigate(['/booking'], { queryParams: { service: 'parcel', pickupService: 1 } });
  }

  openActivity(): void {
    this.router.navigate(['/activity']);
  }
}
