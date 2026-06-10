import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AppUser, Booking, CaptainFeedbackComment, KycStatus } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { CaptainRideAlertService } from '../../core/services/captain-ride-alert.service';
import { NotificationService } from '../../core/services/notification.service';
import { SafeResourceUrlPipe } from '../../shared/pipes/safe-resource-url.pipe';

type CaptainKycFormState = {
  userId: string;
  kycStatus: KycStatus;
  kycDocumentType: string;
  kycDocumentNumberMasked: string;
  kycReferenceId: string;
  kycUpdatedAt: string;
};

const CAPTAIN_KYC_STORAGE_KEY = 'delivery_captain_kyc_state';

@Component({
  selector: 'app-captain-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeResourceUrlPipe],
  template: `
    <div class="cp-page" *ngIf="captain as c">

      <!-- ══ HEADER HERO ══ -->
      <div class="cp-hero">
        <div class="cp-hero-inner">
          <div class="cp-hero-avatar-wrap">
            <img class="cp-hero-avatar" [src]="dpPreview || defaultDp" alt="Captain DP" />
            <span class="cp-hero-status-dot" [class.busy]="isCurrentlyBusy"></span>
          </div>
          <div class="cp-hero-info">
            <h2 class="cp-hero-name">{{ c.displayName }}</h2>
            <div class="cp-hero-meta">@{{ c.username }}
              <span class="cp-hero-veh">
                <span class="cp-veh-icon">{{ vehicleEmoji(c.captainVehicle) }}</span>
                {{ c.captainVehicle || 'Captain' | titlecase }}
              </span>
            </div>
            <div class="cp-hero-badges">
              <span class="cp-kyc-badge" [ngClass]="kycBadgeClass(kycStatus)">
                {{ kycStatus === 'verified' ? '✅ Verified Driver' : '⚠️ KYC ' + kycStatusLabel(kycStatus) }}
              </span>
              <span class="cp-avail-chip" [class.busy]="isCurrentlyBusy">
                {{ isCurrentlyBusy ? '🔴 On a Ride' : '🟢 Available' }}
              </span>
            </div>
          </div>
          <div class="cp-hero-actions">
            <label class="cp-dp-btn" title="Change profile photo">
              📷
              <input type="file" accept="image/*" hidden (change)="onDpFileSelected($event)" />
            </label>
            <button class="cp-save-dp-btn" *ngIf="dpPreview" (click)="saveDp()" [disabled]="savingDp">
              {{ savingDp ? '...' : '💾' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ══ NOTIFICATION PERMISSION BANNER ══ -->
      <div class="cp-notif-banner" *ngIf="notifPermission !== 'granted'">
        <span>🔔 Enable notifications to receive ride alerts with sound</span>
        <button (click)="requestNotificationPermission()">Enable Now</button>
      </div>

      <div class="cp-grid">

        <!-- ══ LEFT COLUMN ══ -->
        <div class="cp-col-left">

          <!-- VEHICLE DETAILS -->
          <div class="cp-card">
            <div class="cp-card-title">🚗 Vehicle Details</div>
            <div class="cp-veh-big-icon">{{ vehicleEmoji(c.captainVehicle) }}</div>
            <div class="cp-info-row"><span class="cp-info-label">Vehicle Type</span><span class="cp-info-val">{{ c.captainVehicle || 'Not set' | titlecase }}</span></div>
            <div class="cp-info-row"><span class="cp-info-label">Captain ID</span><span class="cp-info-val cp-mono">{{ c.id | slice:0:12 }}…</span></div>
            <div class="cp-info-row"><span class="cp-info-label">Username</span><span class="cp-info-val">{{ c.username }}</span></div>
            <div class="cp-info-row" *ngIf="c.email"><span class="cp-info-label">Email</span><span class="cp-info-val">{{ c.email }}</span></div>
            <div class="cp-info-row" *ngIf="c.mobile"><span class="cp-info-label">Mobile</span><span class="cp-info-val">{{ c.mobile }}</span></div>
          </div>

          <!-- KYC VERIFICATION -->
          <div class="cp-card cp-kyc-card">
            <div class="cp-card-header-row">
              <div class="cp-card-title">🪪 KYC Verification</div>
              <span class="cp-kyc-status-badge" [ngClass]="kycBadgeClass(kycStatus)">{{ kycStatusLabel(kycStatus) }}</span>
            </div>
            <div class="cp-kyc-hint">Keep your KYC updated to show Verified Driver Badge to riders.</div>
            <div class="cp-info-row" *ngIf="kycReferenceId"><span class="cp-info-label">Reference</span><span class="cp-info-val cp-mono">{{ kycReferenceId }}</span></div>
            <div class="cp-info-row" *ngIf="kycUpdatedAt"><span class="cp-info-label">Updated</span><span class="cp-info-val">{{ kycUpdatedAt | date:'mediumDate' }}</span></div>

            <label class="cp-form-label mt-2">Document Type</label>
            <select class="cp-select" [(ngModel)]="kycDocumentType">
              <option value="Driving License">Driving License</option>
              <option value="Aadhaar">Aadhaar</option>
              <option value="PAN">PAN</option>
              <option value="Voter ID">Voter ID</option>
            </select>

            <label class="cp-form-label">Document Number</label>
            <input class="cp-input" placeholder="Enter document number" [(ngModel)]="kycDocumentNumber" />
            <div class="cp-masked" *ngIf="kycDocumentNumber">Masked: {{ maskedDocumentNumber }}</div>

            <div class="cp-kyc-btns">
              <button class="cp-btn cp-btn-primary" (click)="submitKyc()" [disabled]="!canSubmitKyc">Submit KYC</button>
              <button class="cp-btn cp-btn-success" (click)="markKycVerified()" [disabled]="kycStatus !== 'pending'">✅ Verify</button>
              <button class="cp-btn cp-btn-danger" (click)="markKycRejected()" [disabled]="kycStatus !== 'pending'">❌ Reject</button>
            </div>
          </div>

          <!-- PERFORMANCE STATS -->
          <div class="cp-card">
            <div class="cp-card-title">📊 Performance</div>
            <div class="cp-stats-grid">
              <div class="cp-stat"><div class="cp-stat-val">{{ avgCaptainRating | number:'1.1-1' }}</div><div class="cp-stat-label">Captain Rating</div></div>
              <div class="cp-stat"><div class="cp-stat-val">{{ avgRideRating | number:'1.1-1' }}</div><div class="cp-stat-label">Ride Rating</div></div>
              <div class="cp-stat"><div class="cp-stat-val">{{ totalHearts }}</div><div class="cp-stat-label">❤️ Hearts</div></div>
              <div class="cp-stat"><div class="cp-stat-val">{{ feedbackCount }}</div><div class="cp-stat-label">Reviews</div></div>
            </div>
          </div>

        </div>

        <!-- ══ RIGHT COLUMN ══ -->
        <div class="cp-col-right">

          <!-- LIVE LOCATION MAP -->
          <div class="cp-card cp-map-card">
            <div class="cp-card-header-row">
              <div class="cp-card-title">📍 Live Location</div>
              <button class="cp-btn cp-btn-outline" (click)="refreshCaptainLocation()">🔄 Refresh</button>
            </div>
            <div class="cp-location-label">{{ captainLocationLabel }}</div>
            <div class="cp-location-error" *ngIf="locationError">⚠️ {{ locationError }}</div>
            <iframe
              [src]="captainMapUrl | safeResourceUrl"
              width="100%" height="260" frameborder="0"
              class="cp-map-frame" loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

          <!-- ACTIVE RIDES -->
          <div class="cp-card">
            <div class="cp-card-header-row">
              <div class="cp-card-title">🏍️ Active Rides</div>
              <div class="cp-ride-header-actions">
                <button class="cp-btn cp-btn-outline" (click)="refreshActiveRides()">🔄 Refresh</button>
                <button class="cp-btn cp-btn-test" (click)="triggerTestRideAlert()" title="Test ride alert with sound">🧪 Test Sound</button>
              </div>
            </div>
            <div class="cp-no-rides" *ngIf="activeRides.length === 0">No active rides right now</div>
            <div class="cp-ride-card" *ngFor="let ride of activeRides">
              <div class="cp-ride-row">
                <div class="cp-ride-info">
                  <div class="cp-ride-id">{{ ride.id }}</div>
                  <div class="cp-ride-route">📍 {{ ride.pickup.address | slice:0:30 }} → {{ ride.drop.address | slice:0:30 }}</div>
                  <div class="cp-ride-customer">👤 {{ ride.userName }} &nbsp;•&nbsp; OTP: <strong>{{ ride.otp }}</strong></div>
                </div>
                <span class="cp-ride-badge" [ngClass]="statusBadge(ride.status)">{{ ride.status }}</span>
              </div>
              <button class="cp-btn cp-btn-primary mt-2" (click)="openRideTracking(ride)">Open Tracking →</button>
            </div>
            <div class="cp-ready-msg" *ngIf="readyForPickupMessage">✅ {{ readyForPickupMessage }}</div>
          </div>

          <!-- JOBS & DELIVERIES -->
          <div class="cp-card" id="deliveries-section">
            <div class="cp-card-header-row">
              <div class="cp-card-title">📦 Jobs & Deliveries</div>
              <span class="cp-count-badge">{{ completedRides.length }}</span>
            </div>
            <div class="cp-no-rides" *ngIf="completedRides.length === 0">No completed rides yet</div>
            <div class="cp-delivery-card" *ngFor="let ride of completedRides" [class.highlight]="highlightedDeliveryBookingId === ride.id">
              <div class="cp-ride-row">
                <div class="cp-ride-info">
                  <div class="cp-ride-id">{{ ride.id }}</div>
                  <div class="cp-ride-route">{{ ride.pickup.address | slice:0:25 }} → {{ ride.drop.address | slice:0:25 }}</div>
                  <div class="cp-ride-status">Status: {{ ride.status }}</div>
                </div>
                <div class="cp-delivery-right">
                  <span class="cp-pay-badge" [class.paid]="ride.paymentDone">{{ ride.paymentDone ? '✅ Paid' : 'Pending' }}</span>
                  <div class="cp-fare-amt" *ngIf="ride.finalAmount">₹{{ ride.finalAmount | number:'1.0-0' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- RECENT COMMENTS -->
          <div class="cp-card" *ngIf="recentComments.length > 0">
            <div class="cp-card-title">💬 Customer Reviews</div>
            <div class="cp-comment-card" *ngFor="let item of recentComments">
              <div class="cp-comment-header">{{ item.userName }} <span class="cp-comment-id">• {{ item.bookingId }}</span></div>
              <div class="cp-comment-stars">
                ⭐ Ride {{ item.rideRating || '-' }}/5 &nbsp; 👤 Captain {{ item.captainRating || '-' }}/5
                <span *ngIf="item.lovedCaptain"> ❤️</span>
              </div>
              <div class="cp-comment-text">{{ item.feedbackText || 'No written comment.' }}</div>
            </div>
          </div>

        </div>
      </div>
    </div>

  <!-- ══════ INCOMING RIDE ALERT OVERLAY ══════ -->
  <div class="cp-alert-overlay" *ngIf="incomingRide" (click)="$event.stopPropagation()">
    <div class="cp-alert-sheet">
      <div class="cp-alert-pulse-wrap">
        <div class="cp-alert-pulse-ring"></div>
        <div class="cp-alert-pulse-ring cp-ring2"></div>
        <div class="cp-alert-icon">🏍️</div>
      </div>
      <div class="cp-alert-badge">NEW RIDE REQUEST</div>
      <h2 class="cp-alert-title">Incoming Ride!</h2>
      <div class="cp-alert-route">
        <div class="cp-alert-point"><div class="cp-point-dot cp-dot-green"></div><div class="cp-point-addr">{{ incomingRide.pickup.address | slice:0:40 }}</div></div>
        <div class="cp-alert-line"></div>
        <div class="cp-alert-point"><div class="cp-point-dot cp-dot-orange"></div><div class="cp-point-addr">{{ incomingRide.drop.address | slice:0:40 }}</div></div>
      </div>
      <div class="cp-alert-meta">
        <div class="cp-alert-meta-item"><div class="cp-meta-label">Service</div><div class="cp-meta-val">{{ incomingRide.serviceType | titlecase }}</div></div>
        <div class="cp-alert-meta-item"><div class="cp-meta-label">Customer</div><div class="cp-meta-val">{{ incomingRide.userName }}</div></div>
        <div class="cp-alert-meta-item"><div class="cp-meta-label">Fare</div><div class="cp-meta-val cp-fare">₹{{ incomingRide.estimatedFare || '—' }}</div></div>
        <div class="cp-alert-meta-item"><div class="cp-meta-label">Payment</div><div class="cp-meta-val">{{ incomingRide.paymentMethod | titlecase }}</div></div>
      </div>
      <div class="cp-alert-countdown-wrap"><div class="cp-alert-countdown-bar" [style.width.%]="alertCountdownPct"></div></div>
      <div class="cp-alert-countdown-label">{{ alertCountdown }}s to auto-decline</div>
      <div class="cp-alert-actions">
        <button class="cp-decline-btn" (click)="declineRide()">✕ Decline</button>
        <button class="cp-accept-btn" (click)="acceptRide()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Accept Ride
        </button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    /* ══ PAGE LAYOUT ══ */
    .cp-page { padding: 16px; max-width: 1200px; margin: 0 auto; }

    .cp-grid {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 16px;
      margin-top: 16px;
    }
    @media (max-width: 768px) {
      .cp-grid { grid-template-columns: 1fr; }
    }

    /* ══ HERO ══ */
    .cp-hero {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
      border-radius: 20px; padding: 24px; color: #fff; margin-bottom: 4px;
    }
    .cp-hero-inner { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .cp-hero-avatar-wrap { position: relative; flex-shrink: 0; }
    .cp-hero-avatar {
      width: 88px; height: 88px; border-radius: 50%;
      object-fit: cover; border: 3px solid rgba(255,255,255,0.3);
    }
    .cp-hero-status-dot {
      position: absolute; bottom: 4px; right: 4px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #4caf50; border: 3px solid #1a1a2e;
    }
    .cp-hero-status-dot.busy { background: #ef5350; }
    .cp-hero-info { flex: 1; min-width: 160px; }
    .cp-hero-name { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
    .cp-hero-meta { font-size: 13px; color: rgba(255,255,255,0.65); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .cp-hero-veh { background: rgba(255,255,255,0.12); border-radius: 20px; padding: 2px 10px; font-size: 12px; }
    .cp-veh-icon { margin-right: 4px; }
    .cp-hero-badges { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .cp-kyc-badge {
      font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid transparent;
    }
    .cp-kyc-badge.kyc-verified { background: #dcfce7; color: #166534; border-color: #86efac; }
    .cp-kyc-badge.kyc-pending  { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .cp-kyc-badge.kyc-rejected, .cp-kyc-badge.kyc-not-started { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
    .cp-avail-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: rgba(76,175,80,0.2); color: #a5f3a5; }
    .cp-avail-chip.busy { background: rgba(239,83,80,0.2); color: #fca5a5; }
    .cp-hero-actions { display: flex; gap: 8px; margin-left: auto; }
    .cp-dp-btn {
      width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 18px; border: none; transition: background .15s;
    }
    .cp-dp-btn:hover { background: rgba(255,255,255,0.25); }
    .cp-save-dp-btn {
      width: 40px; height: 40px; border-radius: 50%; background: #4caf50;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px; border: none;
    }

    /* ══ NOTIFICATION BANNER ══ */
    .cp-notif-banner {
      background: #fff8e1; border: 1px solid #fcd34d; border-radius: 12px;
      padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;
      gap: 12px; font-size: 13px; font-weight: 600; color: #92400e; margin-top: 12px;
    }
    .cp-notif-banner button {
      background: #f59e0b; color: #fff; border: none; border-radius: 8px;
      padding: 5px 14px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }

    /* ══ CARDS ══ */
    .cp-card {
      background: #fff; border-radius: 16px;
      border: 1px solid #f0f0f5; padding: 18px;
      margin-bottom: 14px; box-shadow: 0 2px 12px rgba(0,0,0,.04);
    }
    .cp-card-title { font-size: 14px; font-weight: 800; color: #1a1a2e; margin-bottom: 14px; letter-spacing: 0.3px; }
    .cp-card-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; flex-wrap: wrap; }
    .cp-card-header-row .cp-card-title { margin-bottom: 0; }

    /* ══ VEHICLE BIG ICON ══ */
    .cp-veh-big-icon { font-size: 48px; text-align: center; margin-bottom: 14px; }

    /* ══ INFO ROWS ══ */
    .cp-info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 7px 0; border-bottom: 1px solid #f5f5f8; font-size: 13px;
    }
    .cp-info-row:last-child { border-bottom: none; }
    .cp-info-label { color: #999; font-weight: 500; }
    .cp-info-val { font-weight: 700; color: #222; text-align: right; max-width: 60%; word-break: break-all; }
    .cp-mono { font-family: monospace; font-size: 12px; }

    /* ══ KYC CARD ══ */
    .cp-kyc-card { }
    .cp-kyc-hint { font-size: 12px; color: #888; margin-bottom: 12px; }
    .cp-kyc-status-badge {
      font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid transparent;
    }
    .cp-kyc-status-badge.kyc-verified { background: #dcfce7; color: #166534; border-color: #86efac; }
    .cp-kyc-status-badge.kyc-pending  { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .cp-kyc-status-badge.kyc-rejected, .cp-kyc-status-badge.kyc-not-started { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
    .cp-form-label { font-size: 12px; font-weight: 600; color: #666; display: block; margin-bottom: 4px; margin-top: 10px; }
    .cp-select, .cp-input {
      width: 100%; border: 1.5px solid #e5e7eb; border-radius: 8px;
      padding: 7px 10px; font-size: 13px; outline: none; background: #fafafa;
    }
    .cp-select:focus, .cp-input:focus { border-color: #6366f1; background: #fff; }
    .cp-masked { font-size: 11px; color: #999; margin-top: 4px; font-family: monospace; }
    .cp-kyc-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }

    /* ══ BUTTONS ══ */
    .cp-btn {
      padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700;
      border: none; cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .cp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .cp-btn-primary   { background: #4f46e5; color: #fff; }
    .cp-btn-primary:hover:not(:disabled) { background: #4338ca; }
    .cp-btn-success   { background: #16a34a; color: #fff; }
    .cp-btn-success:hover:not(:disabled) { background: #15803d; }
    .cp-btn-danger    { background: #dc2626; color: #fff; }
    .cp-btn-danger:hover:not(:disabled)  { background: #b91c1c; }
    .cp-btn-outline   { background: transparent; border: 1.5px solid #d1d5db; color: #555; }
    .cp-btn-outline:hover { background: #f3f4f6; }
    .cp-btn-test      { background: #fef3c7; border: 1.5px solid #fbbf24; color: #92400e; }
    .cp-btn-test:hover { background: #fde68a; }
    .mt-2 { margin-top: 8px; }

    /* ══ MAP ══ */
    .cp-map-card { }
    .cp-map-frame { border-radius: 12px; border: 1px solid #e5e7eb; display: block; }
    .cp-location-label { font-size: 12px; color: #888; margin-bottom: 8px; }
    .cp-location-error { font-size: 12px; color: #dc2626; margin-bottom: 8px; }

    /* ══ STATS ══ */
    .cp-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .cp-stat { background: #f8f9ff; border-radius: 12px; padding: 12px; text-align: center; }
    .cp-stat-val { font-size: 24px; font-weight: 800; color: #1a1a2e; }
    .cp-stat-label { font-size: 11px; color: #888; margin-top: 2px; }

    /* ══ RIDE CARDS ══ */
    .cp-ride-header-actions { display: flex; gap: 8px; align-items: center; }
    .cp-no-rides { font-size: 13px; color: #aaa; text-align: center; padding: 16px 0; }
    .cp-ride-card {
      border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px; background: #fff;
    }
    .cp-ride-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .cp-ride-info { flex: 1; }
    .cp-ride-id { font-size: 13px; font-weight: 800; color: #1a1a2e; }
    .cp-ride-route { font-size: 12px; color: #666; margin-top: 2px; }
    .cp-ride-customer { font-size: 12px; color: #888; margin-top: 2px; }
    .cp-ride-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
    .text-bg-primary { background: #dbeafe; color: #1d4ed8; }
    .text-bg-warning { background: #fef3c7; color: #92400e; }
    .text-bg-success { background: #dcfce7; color: #166534; }
    .text-bg-secondary { background: #f3f4f6; color: #6b7280; }
    .cp-ready-msg { font-size: 12px; color: #16a34a; background: #f0fdf4; border-radius: 8px; padding: 8px 12px; margin-top: 8px; }

    /* ══ DELIVERY CARDS ══ */
    .cp-delivery-card {
      border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px;
    }
    .cp-delivery-card.highlight { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .cp-delivery-right { text-align: right; flex-shrink: 0; }
    .cp-pay-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: #f3f4f6; color: #6b7280; }
    .cp-pay-badge.paid { background: #dcfce7; color: #166534; }
    .cp-fare-amt { font-size: 15px; font-weight: 800; color: #1a1a2e; margin-top: 4px; }
    .cp-ride-status { font-size: 11px; color: #aaa; margin-top: 2px; }
    .cp-count-badge { background: #1a1a2e; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }

    /* ══ COMMENTS ══ */
    .cp-comment-card { border: 1px solid #f0f0f5; border-radius: 10px; padding: 10px; margin-bottom: 8px; }
    .cp-comment-header { font-size: 13px; font-weight: 700; color: #1a1a2e; }
    .cp-comment-id { font-weight: 400; color: #999; font-size: 11px; }
    .cp-comment-stars { font-size: 12px; color: #888; margin: 3px 0; }
    .cp-comment-text { font-size: 13px; color: #444; }

    /* ══ INCOMING RIDE ALERT OVERLAY ══ */
    .cp-alert-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,.75);
      display: flex; align-items: flex-end; justify-content: center;
      animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .cp-alert-sheet {
      width: 100%; max-width: 480px; background: #fff;
      border-radius: 28px 28px 0 0; padding: 24px 20px 36px;
      animation: slideUp .28s ease; text-align: center;
    }
    @keyframes slideUp { from { transform: translateY(50px); opacity:.4; } to { transform: translateY(0); opacity:1; } }
    .cp-alert-pulse-wrap { position: relative; width: 90px; height: 90px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; }
    .cp-alert-pulse-ring { position: absolute; inset: 0; border-radius: 50%; border: 3px solid #e53935; opacity: .5; animation: ringGrow 1.4s ease-out infinite; }
    .cp-ring2 { animation-delay: .7s; }
    @keyframes ringGrow { 0% { transform: scale(.8); opacity: .6; } 100% { transform: scale(1.7); opacity: 0; } }
    .cp-alert-icon { font-size: 40px; z-index: 1; }
    .cp-alert-badge { display: inline-block; background: #e53935; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .8px; padding: 4px 12px; border-radius: 20px; margin-bottom: 8px; animation: alertPulse 1s ease-in-out infinite; }
    @keyframes alertPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(229,57,53,.4); } 50% { box-shadow: 0 0 0 8px rgba(229,57,53,0); } }
    .cp-alert-title { font-size: 24px; font-weight: 900; color: #111; margin: 0 0 16px; }
    .cp-alert-route { background: #f8f9fa; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; text-align: left; }
    .cp-alert-point { display: flex; align-items: center; gap: 10px; }
    .cp-alert-line { width: 1.5px; height: 14px; background: #ddd; margin-left: 7px; }
    .cp-point-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
    .cp-dot-green { background: #4caf50; }
    .cp-dot-orange { background: #f4511e; }
    .cp-point-addr { font-size: 13px; font-weight: 600; color: #333; }
    .cp-alert-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; text-align: left; }
    .cp-alert-meta-item { background: #f8f9fa; border-radius: 10px; padding: 10px 12px; }
    .cp-meta-label { font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; margin-bottom: 3px; }
    .cp-meta-val { font-size: 14px; font-weight: 800; color: #111; }
    .cp-fare { color: #e53935; }
    .cp-alert-countdown-wrap { height: 4px; background: #f0f0f0; border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
    .cp-alert-countdown-bar { height: 100%; background: #e53935; border-radius: 2px; transition: width 1s linear; }
    .cp-alert-countdown-label { font-size: 12px; color: #aaa; margin-bottom: 16px; }
    .cp-alert-actions { display: flex; gap: 12px; }
    .cp-decline-btn { flex: 1; padding: 16px; border: 2px solid #e0e0e0; background: #fff; border-radius: 16px; font-size: 15px; font-weight: 700; color: #666; cursor: pointer; transition: all .15s; }
    .cp-decline-btn:hover { border-color: #e53935; color: #e53935; background: #fff5f5; }
    .cp-accept-btn { flex: 2; padding: 16px; border: none; background: linear-gradient(135deg, #4caf50, #2e7d32); border-radius: 16px; font-size: 16px; font-weight: 800; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(76,175,80,.4); animation: acceptPulse 1.5s ease-in-out infinite; }
    @keyframes acceptPulse { 0%,100% { box-shadow: 0 4px 14px rgba(76,175,80,.4); } 50% { box-shadow: 0 6px 20px rgba(76,175,80,.7); } }
  `]
})
export class CaptainProfileComponent implements OnInit, OnDestroy {
  captain: AppUser | null = null;
  dpPreview = '';
  defaultDp = 'https://ui-avatars.com/api/?name=Captain&background=f8d7da&color=7a1632&size=128';
  savingDp = false;

  avgCaptainRating = 0;
  avgRideRating = 0;
  totalHearts = 0;
  feedbackCount = 0;
  recentComments: CaptainFeedbackComment[] = [];
  activeRides: Booking[] = [];
  completedRides: Booking[] = [];
  captainMapUrl = 'https://www.google.com/maps?q=17.4372,78.4011&z=14&output=embed';
  captainLocationLabel = 'Waiting for location permission...';
  locationError = '';
  private notifiedRideIds = new Set<string>();
  private notifiedPaymentRideIds = new Set<string>();

  // ── Incoming ride alert (delegated to CaptainRideAlertService) ──
  get incomingRide(): Booking | null { return this.captainRideAlert.incomingRide; }
  get alertCountdown(): number { return (this.captainRideAlert as any).countdownSubject?.value ?? 25; }
  get alertCountdownPct(): number { return (this.captainRideAlert as any).countdownPctSubject?.value ?? 100; }

  get isCurrentlyBusy(): boolean {
    return this.activeRides.some(r =>
      r.status === 'assigned' || r.status === 'pickup_in_progress' ||
      r.status === 'in_transit' || r.status === 'arriving'
    );
  }

  get notifPermission(): NotificationPermission {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission;
  }

  requestNotificationPermission(): void {
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          this.notifications.push('✅ Notifications enabled! You will now receive ride alerts.', 'success');
        }
      }).catch(() => void 0);
    }
  }

  /** Simulates a fake incoming ride to test the alert overlay + sound */
  triggerTestRideAlert(): void {
    const fakeRide: Booking = {
      id: `TEST-${Date.now().toString().slice(-6)}`,
      userId: 'test-user',
      userName: 'Test Customer',
      bookingFor: 'self',
      serviceType: 'parcel',
      paymentMethod: 'cash',
      vehicleType: 'bike',
      pickup:  { address: 'Hitech City, Hyderabad', lat: 17.4474, lng: 78.3762 },
      drop:    { address: 'Banjara Hills, Hyderabad', lat: 17.4156, lng: 78.4347 },
      currentLocation: { address: 'Hitech City, Hyderabad', lat: 17.4474, lng: 78.3762 },
      status: 'created',
      otp: '999999',
      otpVerified: false,
      driverName: 'Test Captain',
      driverPhone: '+91-00000-00000',
      notificationTarget: 'all',
      estimatedFare: 120,
      notification: 'Test ride alert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as unknown as Booking;

    this.captainRideAlert.showAlert(fakeRide);
    this.notifications.playSound('alert');
    this.notifications.push('🧪 Test alert fired! You should hear the sound and see the overlay.', 'info');
  }
  private notificationPermissionAsked = false;
  highlightedDeliveryBookingId = '';
  readyForPickupMessage = '';
  kycStatus: KycStatus = 'not_started';
  kycDocumentType = 'Driving License';
  kycDocumentNumber = '';
  kycReferenceId = '';
  kycUpdatedAt = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private bookingService: BookingService,
    private router: Router,
    private notifications: NotificationService,
    private route: ActivatedRoute,
    private captainRideAlert: CaptainRideAlertService
  ) {}

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.captain = user;
      this.dpPreview = user?.profileImageUrl || '';
      this.defaultDp = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Captain')}&background=f8d7da&color=7a1632&size=128`;
      this.loadKycState(user);
      this.loadStats();
      this.refreshActiveRides();
      this.refreshCaptainLocation();
      this.ensureBrowserNotificationPermission();

      // Alert service handles incoming ride detection automatically
    });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const focus = params.get('focus');
      const bookingId = params.get('bookingId');

      if (focus === 'deliveries' && bookingId) {
        this.highlightedDeliveryBookingId = bookingId;
        this.notifications.push(`Redirected to Jobs and Deliveries for ${bookingId}.`, 'info');
        this.readyForPickupMessage = `Ride ${bookingId} ended. I am ready to pickup you for the next trip.`;
      }
    });

    this.bookingService.bookings$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshActiveRides();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDpFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notifications.push('Please choose an image file.', 'warning');
      input.value = '';
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      this.notifications.push('Image is too large. Please select an image under 6 MB.', 'warning');
      input.value = '';
      return;
    }

    this.compressImage(file)
      .then((result) => {
        this.dpPreview = result;
      })
      .catch(() => {
        this.notifications.push('Could not read selected image. Please try another file.', 'error');
      });
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const maxWidth = 320;
          const maxHeight = 320;
          let { width, height } = image;

          const scale = Math.min(maxWidth / width, maxHeight / height, 1);
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(image, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          resolve(compressed);
        };
        image.onerror = () => reject(new Error('Invalid image data'));
        image.src = String(reader.result || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  saveDp(): void {
    if (!this.dpPreview) {
      return;
    }

    const pendingImage = this.dpPreview;
    this.savingDp = true;
    this.authService.updateProfileImage(pendingImage).subscribe({
      next: (response) => {
        const updatedImage = response.profileImageUrl || pendingImage;
        this.savingDp = false;
        this.dpPreview = updatedImage;
        this.authService.applyProfileImage(updatedImage);
        this.notifications.push(response.message, 'success');
      },
      error: (error) => {
        this.savingDp = false;
        if (pendingImage.startsWith('data:image/')) {
          this.dpPreview = pendingImage;
          this.authService.applyProfileImage(pendingImage);
          this.notifications.push('Profile image applied locally. Server sync failed, please retry later.', 'warning');
          return;
        }
        this.notifications.push(error?.error?.error || 'Failed to update profile image.', 'error');
      }
    });
  }

  get maskedDocumentNumber(): string {
    const value = this.kycDocumentNumber.trim();
    if (value.length <= 4) {
      return value;
    }
    return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
  }

  get canSubmitKyc(): boolean {
    return this.kycDocumentType.trim().length > 0 && this.kycDocumentNumber.trim().length >= 6;
  }

  vehicleEmoji(vehicle: string | undefined): string {
    const map: Record<string, string> = {
      bike: '🏍️', auto: '🛺', car: '🚗', scooter: '🛵', van: '🚐', truck: '🚛'
    };
    return map[vehicle?.toLowerCase() || ''] || '🚗';
  }

  kycStatusLabel(status: KycStatus): string {
    if (status === 'verified') {
      return 'Verified';
    }
    if (status === 'pending') {
      return 'Pending';
    }
    if (status === 'rejected') {
      return 'Rejected';
    }
    return 'Not Started';
  }

  kycBadgeClass(status: KycStatus): string {
    if (status === 'verified') {
      return 'kyc-verified';
    }
    if (status === 'pending') {
      return 'kyc-pending';
    }
    if (status === 'rejected') {
      return 'kyc-rejected';
    }
    return 'kyc-not-started';
  }

  submitKyc(): void {
    if (!this.canSubmitKyc) {
      this.notifications.push('Enter valid document details before submitting KYC.', 'warning');
      return;
    }

    this.kycStatus = 'pending';
    this.kycReferenceId = this.generateKycReference();
    this.kycUpdatedAt = new Date().toISOString();
    this.persistKycState();
    this.notifications.push('KYC submitted successfully and moved to pending verification.', 'success');
  }

  markKycVerified(): void {
    if (this.kycStatus !== 'pending') {
      return;
    }

    this.kycStatus = 'verified';
    this.kycUpdatedAt = new Date().toISOString();
    this.persistKycState();
    this.notifications.push('Captain KYC verified. Verified Driver Badge is now active.', 'success');
  }

  markKycRejected(): void {
    if (this.kycStatus !== 'pending') {
      return;
    }

    this.kycStatus = 'rejected';
    this.kycUpdatedAt = new Date().toISOString();
    this.persistKycState();
    this.notifications.push('Captain KYC rejected. Please re-submit correct document details.', 'warning');
  }

  openRideTracking(booking: Booking | null | undefined): void {
    if (!booking) return;
    this.router.navigate(['/tracking', booking.id]);
  }

  refreshActiveRides(): void {
    const captain = this.captain;
    const active = this.bookingService
      .getAllBookingsSnapshot()
      .filter((booking) => booking.status !== 'completed' && booking.status !== 'cancelled');

    if (!captain) {
      this.activeRides = [];
      return;
    }

    const captainId = String(captain.id || '').trim().toLowerCase();
    const captainUserName = String(captain.username || '').trim().toLowerCase();
    const captainDisplayName = String(captain.displayName || '').trim().toLowerCase();

    const dedicatedRides = active.filter((booking) => {
      if (booking.notificationTarget === 'all') {
        return true;
      }

      const bookingCaptainId = String(booking.captainId || '').trim().toLowerCase();
      const bookingCaptainName = String(booking.driverName || '').trim().toLowerCase();
      const preferredCaptainId = String(booking.preferredCaptainId || '').trim().toLowerCase();
      const preferredCaptainName = String(booking.preferredCaptainName || '').trim().toLowerCase();

      return (
        (bookingCaptainId && bookingCaptainId === captainId) ||
        (bookingCaptainId && bookingCaptainId === captainUserName) ||
        (preferredCaptainId && preferredCaptainId === captainId) ||
        (preferredCaptainId && preferredCaptainId === captainUserName) ||
        (bookingCaptainName && bookingCaptainName === captainDisplayName) ||
        (bookingCaptainName && bookingCaptainName === captainUserName) ||
        (preferredCaptainName && preferredCaptainName === captainDisplayName) ||
        (preferredCaptainName && preferredCaptainName === captainUserName)
      );
    });

    this.activeRides = dedicatedRides.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const completed = this.bookingService
      .getAllBookingsSnapshot()
      .filter((booking) => booking.status === 'completed' || booking.status === 'cancelled')
      .filter((booking) => {
        if (booking.notificationTarget === 'all') {
          return true;
        }

        const bookingCaptainId = String(booking.captainId || '').trim().toLowerCase();
        const bookingCaptainName = String(booking.driverName || '').trim().toLowerCase();
        const preferredCaptainId = String(booking.preferredCaptainId || '').trim().toLowerCase();
        const preferredCaptainName = String(booking.preferredCaptainName || '').trim().toLowerCase();

        return (
          (bookingCaptainId && bookingCaptainId === captainId) ||
          (bookingCaptainId && bookingCaptainId === captainUserName) ||
          (preferredCaptainId && preferredCaptainId === captainId) ||
          (preferredCaptainId && preferredCaptainId === captainUserName) ||
          (bookingCaptainName && bookingCaptainName === captainDisplayName) ||
          (bookingCaptainName && bookingCaptainName === captainUserName) ||
          (preferredCaptainName && preferredCaptainName === captainDisplayName) ||
          (preferredCaptainName && preferredCaptainName === captainUserName)
        );
      });

    this.completedRides = completed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.updateReadyForPickupMessage();
  }

  refreshCaptainLocation(): void {
    this.locationError = '';
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported in this browser.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Math.round(position.coords.latitude * 100000) / 100000;
        const lng = Math.round(position.coords.longitude * 100000) / 100000;
        this.captainLocationLabel = `${lat}, ${lng}`;
        this.captainMapUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      },
      () => {
        this.locationError = 'Location permission denied. Please allow location access.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  acceptRide(): void {
    const rideId = this.captainRideAlert.incomingRide?.id;
    this.captainRideAlert.acceptRide();
    if (rideId) {
      this.notifications.playSound('success');
      const accepted = this.activeRides.find(r => r.id === rideId);
      this.openRideTracking(accepted || null);
    }
  }

  declineRide(): void {
    this.captainRideAlert.declineRide();
  }

  private notifyForPaymentUpdates(): void {
    for (const ride of this.completedRides) {
      if (!ride.paymentDone || this.notifiedPaymentRideIds.has(ride.id)) {
        continue;
      }

      this.notifiedPaymentRideIds.add(ride.id);
      const message = `Customer paid for ${ride.id}. Amount: Rs ${Math.round(ride.finalAmount || 0)}.`;
      this.notifications.push(message, 'success');
      this.notifications.playSound('success');

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('💰 Payment Received', {
          body: message,
          tag: `payment-${ride.id}`
        });
      }
    }
  }

  private updateReadyForPickupMessage(): void {
    if (this.activeRides.length > 0) {
      this.readyForPickupMessage = '';
      return;
    }

    if (this.highlightedDeliveryBookingId) {
      this.readyForPickupMessage = `Ride ${this.highlightedDeliveryBookingId} ended. I am ready to pickup you for the next trip.`;
      return;
    }

    const latestCompletedRide = this.completedRides.find((ride) => ride.status === 'completed');
    if (!latestCompletedRide) {
      this.readyForPickupMessage = '';
      return;
    }

    this.readyForPickupMessage = `Ride ${latestCompletedRide.id} ended. I am ready to pickup you for the next trip.`;
  }

  private ensureBrowserNotificationPermission(): void {
    if (this.notificationPermissionAsked) {
      return;
    }

    this.notificationPermissionAsked = true;
    if (typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => void 0);
    }
  }

  statusBadge(status: Booking['status']): string {
    if (status === 'assigned' || status === 'pickup_in_progress' || status === 'in_transit' || status === 'arriving') {
      return 'text-bg-primary';
    }

    if (status === 'created') {
      return 'text-bg-warning';
    }

    if (status === 'delivered') {
      return 'text-bg-success';
    }

    return 'text-bg-secondary';
  }

  private loadStats(): void {
    this.authService.getCaptainFeedbackStats().subscribe({
      next: (stats) => {
        this.avgCaptainRating = stats.avgCaptainRating;
        this.avgRideRating = stats.avgRideRating;
        this.totalHearts = stats.totalHearts;
        this.feedbackCount = stats.feedbackCount;
        this.recentComments = stats.recentComments || [];
      },
      error: (error) => {
        this.avgCaptainRating = 0;
        this.avgRideRating = 0;
        this.totalHearts = 0;
        this.feedbackCount = 0;
        this.recentComments = [];
        this.notifications.push(error?.error?.error || 'Failed to load captain feedback stats.', 'warning');
      }
    });
  }

  private loadKycState(user: AppUser | null): void {
    if (!user) {
      this.kycStatus = 'not_started';
      this.kycDocumentType = 'Driving License';
      this.kycDocumentNumber = '';
      this.kycReferenceId = '';
      this.kycUpdatedAt = '';
      return;
    }

    let stored: CaptainKycFormState | null = null;
    const raw = localStorage.getItem(CAPTAIN_KYC_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CaptainKycFormState;
        if (parsed.userId === user.id) {
          stored = parsed;
        }
      } catch {
        stored = null;
      }
    }

    this.kycStatus = stored?.kycStatus || user.kycStatus || 'not_started';
    this.kycDocumentType = stored?.kycDocumentType || user.kycDocumentType || 'Driving License';
    this.kycDocumentNumber = '';
    this.kycReferenceId = stored?.kycReferenceId || user.kycReferenceId || '';
    this.kycUpdatedAt = stored?.kycUpdatedAt || user.kycUpdatedAt || '';
  }

  private persistKycState(): void {
    const userId = this.captain?.id;
    if (!userId) {
      return;
    }

    const payload: CaptainKycFormState = {
      userId,
      kycStatus: this.kycStatus,
      kycDocumentType: this.kycDocumentType.trim() || 'Driving License',
      kycDocumentNumberMasked: this.maskedDocumentNumber,
      kycReferenceId: this.kycReferenceId,
      kycUpdatedAt: this.kycUpdatedAt || new Date().toISOString()
    };

    localStorage.setItem(CAPTAIN_KYC_STORAGE_KEY, JSON.stringify(payload));
    this.authService.applyCaptainKycStatus(this.kycStatus, {
      kycDocumentType: payload.kycDocumentType,
      kycReferenceId: payload.kycReferenceId,
      kycUpdatedAt: payload.kycUpdatedAt
    });
  }

  private generateKycReference(): string {
    const stamp = Date.now().toString().slice(-6);
    const initials = (this.captain?.displayName || 'CP')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
    return `KYC-${initials || 'CP'}-${stamp}`;
  }
}
