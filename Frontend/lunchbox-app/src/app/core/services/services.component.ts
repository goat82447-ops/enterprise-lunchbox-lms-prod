import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="svc-page">
      <div class="svc-header">
        <h2 class="svc-title">All Services</h2>
      </div>

      <div class="svc-section">
        <div class="svc-section-label">Rides</div>
        <div class="svc-grid">
          <button class="svc-tile" type="button" (click)="openVehicleRide('bike')">
            <div class="svc-icon-wrap">🏍️</div>
            <div class="svc-name">Bike</div>
          </button>
          <button class="svc-tile" type="button" (click)="openVehicleRide('auto')">
            <div class="svc-icon-wrap">🛺</div>
            <div class="svc-name">Auto</div>
          </button>
          <button class="svc-tile" type="button" (click)="openVehicleRide('car')">
            <div class="svc-icon-wrap">🚗</div>
            <div class="svc-name">Cab Economy</div>
          </button>
          <button class="svc-tile" type="button" (click)="openVehicleRide('prime')">
            <div class="svc-icon-wrap">🚙</div>
            <div class="svc-name">Cab Prime</div>
          </button>
          <button class="svc-tile" type="button" (click)="openScheduledRideMode()">
            <div class="svc-icon-wrap">⏰</div>
            <div class="svc-name">Scheduled</div>
          </button>
          <button class="svc-tile" type="button" (click)="openBookingForOthersMode()">
            <div class="svc-icon-wrap">👨‍👩‍👧</div>
            <div class="svc-name">Book for Others</div>
          </button>
        </div>
      </div>

      <div class="svc-section">
        <div class="svc-section-label">Safety Modes</div>
        <div class="svc-grid">
          <button class="svc-tile" type="button" (click)="openWomenSafetyMode()">
            <div class="svc-icon-wrap">🛡️</div>
            <div class="svc-name">Women Safety</div>
          </button>
          <button class="svc-tile" type="button" (click)="openTeenageRideMode()">
            <div class="svc-icon-wrap">🧒</div>
            <div class="svc-name">Teen Ride</div>
          </button>
        </div>
      </div>

      <div class="svc-section">
        <div class="svc-section-label">Delivery</div>
        <div class="svc-grid">
          <button class="svc-tile" type="button" (click)="openPickupService()">
            <div class="svc-icon-wrap">🛍️</div>
            <div class="svc-name">Pickup</div>
          </button>
          <button class="svc-tile" type="button" (click)="openBooking('parcel')">
            <div class="svc-icon-wrap">📦</div>
            <div class="svc-name">Parcel</div>
          </button>
          <button class="svc-tile" type="button" (click)="openBooking('food')">
            <div class="svc-icon-wrap">🍱</div>
            <div class="svc-name">Food</div>
          </button>
          <button class="svc-tile" type="button" (click)="openBooking('grocery')">
            <div class="svc-icon-wrap">🛒</div>
            <div class="svc-name">Grocery</div>
          </button>
          <button class="svc-tile" type="button" (click)="openBooking('medicine')">
            <div class="svc-icon-wrap">💊</div>
            <div class="svc-name">Medicine</div>
          </button>
          <button class="svc-tile" type="button" (click)="openBooking('documents')">
            <div class="svc-icon-wrap">📄</div>
            <div class="svc-name">Documents</div>
          </button>
          <button class="svc-tile" type="button" (click)="openLunchBox()">
            <div class="svc-icon-wrap">🎒</div>
            <div class="svc-name">School Delivery</div>
          </button>
        </div>
      </div>

      <div class="svc-section">
        <div class="svc-section-label">More</div>
        <div class="svc-grid">
          <button class="svc-tile" type="button" (click)="openActivity()">
            <div class="svc-icon-wrap">🧾</div>
            <div class="svc-name">Activity</div>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .svc-page {
      padding: 0 0 100px;
      background: #fff;
      min-height: 100vh;
    }

    .svc-header {
      padding: 20px 16px 4px;
    }

    .svc-title {
      font-size: 22px;
      font-weight: 800;
      color: #111;
      margin: 0;
    }

    .svc-section {
      padding: 16px 16px 4px;
    }

    .svc-section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #999;
      margin-bottom: 12px;
    }

    .svc-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .svc-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      background: #f5f6f8;
      border: none;
      border-radius: 16px;
      padding: 16px 8px 12px;
      cursor: pointer;
      transition: background 0.15s, transform 0.12s;
      min-height: 90px;
    }

    .svc-tile:active {
      transform: scale(0.96);
      background: #eceef2;
    }

    .svc-icon-wrap {
      font-size: 32px;
      line-height: 1;
      margin-bottom: 8px;
    }

    .svc-name {
      font-size: 12px;
      font-weight: 600;
      color: #222;
      text-align: center;
      line-height: 1.3;
    }
  `]
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
    this.router.navigate(['/travel']);
  }

  openWomenSafetyMode(): void {
    this.router.navigate(['/travel'], { queryParams: { mode: 'women' } });
  }

  openTeenageRideMode(): void {
    this.router.navigate(['/travel'], { queryParams: { mode: 'teen' } });
  }

  openScheduledRideMode(): void {
    this.router.navigate(['/travel'], { queryParams: { mode: 'later' } });
  }

  openBookingForOthersMode(): void {
    this.router.navigate(['/travel'], { queryParams: { mode: 'others' } });
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
