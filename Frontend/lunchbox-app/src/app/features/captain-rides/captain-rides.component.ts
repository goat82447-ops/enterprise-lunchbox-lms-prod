import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Booking } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-captain-rides',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cr-page">
      <!-- Header -->
      <div class="cr-header">
        <h2 class="cr-title">🏍️ My Rides</h2>
        <div class="cr-summary-row">
          <div class="cr-summary-card"><div class="cr-summary-val">{{ totalRides }}</div><div class="cr-summary-label">Total Rides</div></div>
          <div class="cr-summary-card cr-green"><div class="cr-summary-val">{{ completedRides }}</div><div class="cr-summary-label">Completed</div></div>
          <div class="cr-summary-card cr-blue"><div class="cr-summary-val">₹{{ totalEarnings | number:'1.0-0' }}</div><div class="cr-summary-label">Earnings</div></div>
          <div class="cr-summary-card cr-orange"><div class="cr-summary-val">{{ activeRides }}</div><div class="cr-summary-label">Active</div></div>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="cr-tabs">
        <button class="cr-tab" [class.active]="filter === 'all'" (click)="filter = 'all'">All</button>
        <button class="cr-tab" [class.active]="filter === 'active'" (click)="filter = 'active'">🔴 Active</button>
        <button class="cr-tab" [class.active]="filter === 'completed'" (click)="filter = 'completed'">✅ Completed</button>
        <button class="cr-tab" [class.active]="filter === 'cancelled'" (click)="filter = 'cancelled'">❌ Cancelled</button>
      </div>

      <!-- Rides list -->
      <div class="cr-list">
        <div *ngIf="filteredRides.length === 0" class="cr-empty">
          <div class="cr-empty-icon">🏍️</div>
          <div class="cr-empty-text">No {{ filter === 'all' ? '' : filter }} rides yet</div>
        </div>

        <div class="cr-ride-card" *ngFor="let ride of filteredRides">
          <div class="cr-ride-top">
            <div class="cr-ride-id">{{ ride.id }}</div>
            <span class="cr-status-chip" [ngClass]="chipClass(ride.status)">{{ ride.status | titlecase }}</span>
          </div>
          <div class="cr-ride-route">
            <div class="cr-route-row"><span class="cr-dot cr-dot-green"></span><span>{{ ride.pickup.address | slice:0:35 }}</span></div>
            <div class="cr-route-line"></div>
            <div class="cr-route-row"><span class="cr-dot cr-dot-red"></span><span>{{ ride.drop.address | slice:0:35 }}</span></div>
          </div>
          <div class="cr-ride-meta">
            <span>👤 {{ ride.userName }}</span>
            <span>{{ ride.serviceType | titlecase }}</span>
            <span *ngIf="ride.finalAmount" class="cr-fare">₹{{ ride.finalAmount | number:'1.0-0' }}</span>
            <span *ngIf="!ride.finalAmount && ride.estimatedFare" class="cr-fare">~₹{{ ride.estimatedFare | number:'1.0-0' }}</span>
            <span>{{ ride.paymentMethod | titlecase }}</span>
          </div>
          <div class="cr-ride-footer">
            <span class="cr-time">{{ ride.updatedAt | date:'dd MMM, hh:mm a' }}</span>
            <span class="cr-paid-badge" *ngIf="ride.paymentDone">💰 Paid</span>
            <button class="cr-track-btn" *ngIf="isActive(ride)" (click)="openTracking(ride)">Open Tracking →</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cr-page { padding: 0 0 100px; background: #f8f9fc; min-height: 100vh; }
    .cr-header { background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); padding: 24px 16px 20px; color: #fff; }
    .cr-title { font-size: 20px; font-weight: 800; margin: 0 0 16px; }
    .cr-summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .cr-summary-card { background: rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 8px; text-align: center; }
    .cr-summary-card.cr-green { background: rgba(34,197,94,0.2); }
    .cr-summary-card.cr-blue  { background: rgba(59,130,246,0.2); }
    .cr-summary-card.cr-orange{ background: rgba(251,146,60,0.2); }
    .cr-summary-val   { font-size: 20px; font-weight: 800; }
    .cr-summary-label { font-size: 10px; opacity: 0.8; margin-top: 2px; }
    .cr-tabs { display: flex; gap: 8px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #f0f0f5; overflow-x: auto; }
    .cr-tab { padding: 6px 14px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; color: #555; }
    .cr-tab.active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
    .cr-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
    .cr-empty { text-align: center; padding: 48px 16px; }
    .cr-empty-icon { font-size: 48px; margin-bottom: 12px; }
    .cr-empty-text { font-size: 15px; color: #aaa; font-weight: 600; }
    .cr-ride-card { background: #fff; border-radius: 16px; padding: 14px 16px; border: 1px solid #f0f0f5; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
    .cr-ride-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .cr-ride-id { font-size: 13px; font-weight: 800; color: #1a1a2e; }
    .cr-status-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .chip-created   { background: #fef3c7; color: #92400e; }
    .chip-assigned  { background: #dbeafe; color: #1d4ed8; }
    .chip-completed { background: #dcfce7; color: #166534; }
    .chip-cancelled { background: #fee2e2; color: #991b1b; }
    .chip-in_transit{ background: #ede9fe; color: #6d28d9; }
    .cr-ride-route { background: #f8f9ff; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
    .cr-route-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #333; }
    .cr-route-line { width: 1.5px; height: 10px; background: #ddd; margin-left: 5px; }
    .cr-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .cr-dot-green { background: #22c55e; }
    .cr-dot-red   { background: #ef4444; }
    .cr-ride-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: #666; margin-bottom: 10px; }
    .cr-fare { font-weight: 800; color: #1a1a2e; }
    .cr-ride-footer { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .cr-time { font-size: 11px; color: #aaa; flex: 1; }
    .cr-paid-badge { font-size: 11px; font-weight: 700; background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 20px; }
    .cr-track-btn { background: #1a1a2e; color: #fff; border: none; border-radius: 10px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
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

  openTracking(ride: Booking): void { this.router.navigate(['/tracking', ride.id]); }
}
