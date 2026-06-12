import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Booking } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-captain-rides',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cr-page">
      <div class="cr-header">
        <div>
          <div class="cr-title">Captain Orders</div>
          <div class="cr-sub">Live delivery queue and trip history</div>
        </div>
        <div class="cr-online-chip">
          <span class="cr-online-dot"></span>
          Online
        </div>
        <div class="cr-summary-row">
          <div class="cr-summary-card">
            <div class="cr-summary-val">{{ activeRides }}</div>
            <div class="cr-summary-label">Live</div>
          </div>
          <div class="cr-summary-card">
            <div class="cr-summary-val">{{ completedRides }}</div>
            <div class="cr-summary-label">Completed</div>
          </div>
          <div class="cr-summary-card">
            <div class="cr-summary-val">₹{{ totalEarnings | number:'1.0-0' }}</div>
            <div class="cr-summary-label">Earnings</div>
          </div>
          <div class="cr-summary-card">
            <div class="cr-summary-val">{{ totalRides }}</div>
            <div class="cr-summary-label">Total</div>
          </div>
        </div>
      </div>

      <div class="cr-tabs">
        <button class="cr-tab" [class.active]="filter === 'all'" (click)="filter = 'all'">All</button>
        <button class="cr-tab" [class.active]="filter === 'active'" (click)="filter = 'active'">Live</button>
        <button class="cr-tab" [class.active]="filter === 'completed'" (click)="filter = 'completed'">Completed</button>
        <button class="cr-tab" [class.active]="filter === 'cancelled'" (click)="filter = 'cancelled'">Cancelled</button>
      </div>

      <div class="cr-list">
        <div *ngIf="filteredRides.length === 0" class="cr-empty">
          <div class="cr-empty-icon">No rides found</div>
          <div class="cr-empty-text">New assignments will appear here in realtime.</div>
        </div>

        <div class="cr-ride-card" *ngFor="let ride of filteredRides">
          <div class="cr-card-top">
            <span class="cr-status-chip" [ngClass]="chipClass(ride.status)">{{ statusLabel(ride.status) }}</span>
            <span class="cr-time">{{ ride.updatedAt | date:'dd MMM, hh:mm a' }}</span>
          </div>
          <div class="cr-ride-id">{{ ride.id }}</div>

          <div class="cr-ride-route">
            <div class="cr-route-row">
              <span class="cr-dot cr-dot-green"></span>
              <span class="cr-route-text">{{ ride.pickup.address | slice:0:55 }}</span>
            </div>
            <div class="cr-route-line"></div>
            <div class="cr-route-row">
              <span class="cr-dot cr-dot-red"></span>
              <span class="cr-route-text">{{ ride.drop.address | slice:0:55 }}</span>
            </div>
          </div>

          <div class="cr-ride-meta">
            <span>{{ ride.serviceType | titlecase }}</span>
            <span>{{ ride.paymentMethod | titlecase }}</span>
            <span>{{ ride.userName }}</span>
            <span class="cr-fare" *ngIf="ride.finalAmount">₹{{ ride.finalAmount | number:'1.0-0' }}</span>
            <span class="cr-fare" *ngIf="!ride.finalAmount && ride.estimatedFare">~₹{{ ride.estimatedFare | number:'1.0-0' }}</span>
          </div>

          <div class="cr-ride-footer">
            <span class="cr-paid-badge" *ngIf="ride.paymentDone">Paid</span>
            <button class="cr-track-btn" *ngIf="isActive(ride)" (click)="openTracking(ride)">Open tracking</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cr-page { min-height: 100vh; padding-bottom: 98px; background: #f4f5f7; }
    .cr-header { padding: 22px 16px 16px; background: linear-gradient(180deg, #1f1f1f 0%, #303030 100%); color: #fff; }
    .cr-title { font-size: 22px; font-weight: 800; letter-spacing: 0.2px; }
    .cr-sub { margin-top: 2px; font-size: 12px; color: #d6d6d6; }
    .cr-online-chip { margin-top: 12px; width: fit-content; display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: #153722; color: #8cf3b2; font-size: 11px; font-weight: 700; }
    .cr-online-dot { width: 7px; height: 7px; border-radius: 50%; background: #26e36c; box-shadow: 0 0 0 4px rgba(38, 227, 108, 0.16); }
    .cr-summary-row { margin-top: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .cr-summary-card { border-radius: 12px; padding: 10px 8px; background: rgba(255, 255, 255, 0.08); text-align: center; }
    .cr-summary-val { font-size: 17px; font-weight: 800; }
    .cr-summary-label { margin-top: 1px; font-size: 10px; color: #d8d8d8; }
    .cr-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 12px 16px; background: #fff; border-bottom: 1px solid #ececf0; }
    .cr-tab { border: 1px solid #dfdfe5; border-radius: 999px; background: #fff; color: #53545d; padding: 6px 14px; font-size: 13px; font-weight: 700; white-space: nowrap; }
    .cr-tab.active { border-color: #e23744; background: #e23744; color: #fff; }
    .cr-list { padding: 12px 16px; display: grid; gap: 12px; }
    .cr-empty { text-align: center; padding: 40px 16px; color: #828287; }
    .cr-empty-icon { font-size: 20px; font-weight: 700; }
    .cr-empty-text { margin-top: 8px; font-size: 13px; }
    .cr-ride-card { border: 1px solid #ececf0; border-radius: 14px; background: #fff; padding: 12px; box-shadow: 0 3px 10px rgba(20, 22, 28, 0.04); }
    .cr-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .cr-status-chip { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.35px; padding: 4px 8px; border-radius: 999px; }
    .chip-created { background: #fff4d6; color: #8a5900; }
    .chip-assigned, .chip-in_transit { background: #e9f0ff; color: #2452be; }
    .chip-completed { background: #e7f9ee; color: #0f7a42; }
    .chip-cancelled { background: #ffe7ea; color: #ae2e3a; }
    .cr-time { font-size: 11px; color: #8a8b94; }
    .cr-ride-id { margin-top: 8px; margin-bottom: 10px; font-size: 12px; font-weight: 700; color: #2d2d35; }
    .cr-ride-route { border: 1px solid #f0f0f3; border-radius: 12px; background: #fafafb; padding: 10px; }
    .cr-route-row { display: flex; gap: 8px; align-items: flex-start; }
    .cr-route-line { height: 12px; width: 1px; background: #cdced4; margin-left: 5px; margin-top: 2px; margin-bottom: 2px; }
    .cr-dot { width: 10px; height: 10px; margin-top: 3px; border-radius: 50%; flex-shrink: 0; }
    .cr-dot-green { background: #00b14f; }
    .cr-dot-red { background: #ef4a51; }
    .cr-route-text { font-size: 12px; color: #32333a; line-height: 1.35; }
    .cr-ride-meta { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #5f606a; }
    .cr-ride-meta span { background: #f5f5f8; border-radius: 999px; padding: 4px 8px; }
    .cr-fare { font-weight: 800; color: #2f3038; }
    .cr-ride-footer { margin-top: 10px; display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
    .cr-paid-badge { font-size: 11px; font-weight: 700; color: #0d7d3f; background: #e8f9ef; border-radius: 999px; padding: 5px 10px; }
    .cr-track-btn { border: none; border-radius: 10px; padding: 8px 12px; background: #111214; color: #fff; font-size: 12px; font-weight: 700; }
  `]
})
export class CaptainRidesComponent implements OnInit, OnDestroy {
  allRides: Booking[] = [];
  filter: 'all' | 'active' | 'completed' | 'cancelled' = 'all';
  private destroy$ = new Subject<void>();

  constructor(private auth: AuthService, private bookingService: BookingService, private router: Router) {}

  ngOnInit(): void {
    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadRides());
    this.bookingService.bookings$.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadRides());
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadRides(): void {
    const user = this.auth.getCurrentUser();
    if (!user) { this.allRides = []; return; }
    const cId   = String(user.id || '').toLowerCase();
    const cUser = String(user.username || '').toLowerCase();
    const cName = String(user.displayName || '').toLowerCase();
    this.allRides = this.bookingService.getAllBookingsSnapshot()
      .filter(b => {
        if (b.notificationTarget === 'all') return true;
        return String(b.captainId || '').toLowerCase() === cId ||
               String(b.driverName || '').toLowerCase() === cUser ||
               String(b.driverName || '').toLowerCase() === cName;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  get filteredRides(): Booking[] {
    if (this.filter === 'active') return this.allRides.filter(r => !['completed','cancelled'].includes(r.status));
    if (this.filter === 'completed') return this.allRides.filter(r => r.status === 'completed');
    if (this.filter === 'cancelled') return this.allRides.filter(r => r.status === 'cancelled');
    return this.allRides;
  }

  get totalRides(): number { return this.allRides.length; }
  get completedRides(): number { return this.allRides.filter(r => r.status === 'completed').length; }
  get activeRides(): number { return this.allRides.filter(r => !['completed','cancelled'].includes(r.status)).length; }
  get totalEarnings(): number { return this.allRides.reduce((s, r) => s + (r.finalAmount || 0), 0); }

  isActive(ride: Booking): boolean { return !['completed','cancelled'].includes(ride.status); }

  chipClass(status: string): string {
    const map: Record<string, string> = { created:'chip-created', assigned:'chip-assigned', completed:'chip-completed', cancelled:'chip-cancelled', in_transit:'chip-in_transit', pickup_in_progress:'chip-assigned', arriving:'chip-assigned' };
    return map[status] || 'chip-created';
  }

  statusLabel(status: string): string {
    if (status === 'created') return 'New request';
    if (status === 'assigned') return 'Accepted';
    if (status === 'in_transit') return 'In transit';
    if (status === 'pickup_in_progress') return 'At pickup';
    if (status === 'arriving') return 'Arriving';
    return status.replace('_', ' ');
  }

  openTracking(ride: Booking): void { this.router.navigate(['/tracking', ride.id]); }
}
