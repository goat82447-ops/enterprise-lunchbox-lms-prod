import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AppUser, Booking, CaptainFeedbackComment, KycStatus } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';
import { CaptainRideAlertService } from '../../core/services/captain-ride-alert.service';
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
    <div class="zcp-page" *ngIf="captain as c">

      <!-- ── Action Toast ── -->
      <div *ngIf="rideActionResult" class="action-toast"
        [class.toast-accept]="rideActionResult.type === 'accept'"
        [class.toast-decline]="rideActionResult.type === 'decline'">
        <span *ngIf="rideActionResult.type === 'accept'">✅ Ride <strong>{{ rideActionResult.rideId }}</strong> Accepted! Head to pickup.</span>
        <span *ngIf="rideActionResult.type === 'decline'">❌ Ride <strong>{{ rideActionResult.rideId }}</strong> Declined.</span>
      </div>

      <!-- ── Ride Accept/Decline Modal ── -->
      <div class="ride-modal-overlay" *ngIf="activeRideModal" (click)="closeRideModal()">
        <div class="ride-modal-card" (click)="$event.stopPropagation()">
          <div class="ride-modal-header">
            <div class="ride-modal-icon-wrap">
              <span class="ride-modal-icon">🛵</span>
              <div class="ride-modal-ring r1"></div>
              <div class="ride-modal-ring r2"></div>
            </div>
            <div>
              <h4 class="ride-modal-title">New Ride Request!</h4>
              <div class="ride-modal-sub">{{ activeRideModal.serviceType | titlecase }} • {{ activeRideModal.vehicleType | titlecase }}</div>
            </div>
            <div class="ride-modal-fare">₹{{ activeRideModal.estimatedFare || 0 }}</div>
          </div>
          <div class="ride-modal-route">
            <div class="ride-modal-route-row">
              <span class="rm-dot rm-green"></span>
              <span class="rm-route-text">{{ activeRideModal.pickup.address }}</span>
            </div>
            <div class="rm-route-line-v"></div>
            <div class="ride-modal-route-row">
              <span class="rm-dot rm-red"></span>
              <span class="rm-route-text">{{ activeRideModal.drop.address }}</span>
            </div>
          </div>
          <div class="ride-modal-meta">
            <div class="rm-meta-item"><span class="rm-meta-label">Customer</span><span class="rm-meta-val">{{ activeRideModal.userName }}</span></div>
            <div class="rm-meta-item"><span class="rm-meta-label">OTP</span><span class="rm-meta-val rm-otp">{{ activeRideModal.otp }}</span></div>
            <div class="rm-meta-item"><span class="rm-meta-label">Payment</span><span class="rm-meta-val">{{ activeRideModal.paymentMethod | titlecase }}</span></div>
          </div>
          <div class="ride-modal-actions">
            <button class="rm-decline-btn" type="button" (click)="declineRide(activeRideModal!)">✕ Decline</button>
            <button class="rm-accept-btn" type="button" (click)="acceptRide(activeRideModal!)">✓ Accept Ride</button>
          </div>
        </div>
      </div>

      <!-- ── Zomato-style Header ── -->
      <div class="zcp-header">
        <div class="zcp-header-top">
          <div class="zcp-captain-info">
            <div class="zcp-avatar-wrap">
              <img class="zcp-avatar" [src]="dpPreview || defaultDp" alt="Captain" />
              <div class="zcp-avatar-status" [class.online]="isOnline"></div>
            </div>
            <div class="zcp-captain-text">
              <div class="zcp-captain-name">{{ c.displayName }}</div>
              <div class="zcp-captain-sub">{{ c.captainVehicle | titlecase }} Captain</div>
              <div class="zcp-stars">
                <span *ngFor="let s of starArray(avgCaptainRating)">{{ s }}</span>
                <span class="zcp-rating-val">{{ avgCaptainRating.toFixed(1) }}</span>
              </div>
            </div>
          </div>
          <button class="zcp-toggle-btn" [class.zcp-toggle-online]="isOnline" [class.zcp-toggle-offline]="!isOnline" (click)="toggleOnline()">
            <span class="zcp-toggle-dot"></span>
            {{ isOnline ? 'Online' : 'Offline' }}
          </button>
        </div>

        <div class="zcp-kyc-strip" *ngIf="kycStatus !== 'verified'">
          <span class="zcp-kyc-icon">⚠️</span>
          <span>KYC {{ kycStatusLabel(kycStatus) }} — complete to show Verified badge</span>
        </div>

        <!-- Earnings strip -->
        <div class="zcp-earnings-strip">
          <div class="zcp-earn-item">
            <div class="zcp-earn-val">₹{{ todayEarnings | number:'1.0-0' }}</div>
            <div class="zcp-earn-label">Today</div>
          </div>
          <div class="zcp-earn-divider"></div>
          <div class="zcp-earn-item">
            <div class="zcp-earn-val">{{ activeRides.length }}</div>
            <div class="zcp-earn-label">Active</div>
          </div>
          <div class="zcp-earn-divider"></div>
          <div class="zcp-earn-item">
            <div class="zcp-earn-val">{{ completedRides.length }}</div>
            <div class="zcp-earn-label">Trips</div>
          </div>
          <div class="zcp-earn-divider"></div>
          <div class="zcp-earn-item">
            <div class="zcp-earn-val">{{ feedbackCount }}</div>
            <div class="zcp-earn-label">Reviews</div>
          </div>
        </div>
      </div>

      <!-- ── New Ride Banner ── -->
      <div *ngIf="newRideAlert" class="zcp-new-ride-banner">
        <div class="zcp-banner-pulse"></div>
        <span>🔔 New ride request received!</span>
        <button class="zcp-banner-btn" (click)="activeRideModal = activeRides[0] || null">View</button>
      </div>

      <!-- ── Ready for Pickup Banner ── -->
      <div *ngIf="readyForPickupMessage && !newRideAlert" class="zcp-ready-banner">
        ✅ {{ readyForPickupMessage }}
      </div>

      <!-- ── Active Rides ── -->
      <div class="zcp-section">
        <div class="zcp-section-header">
          <span class="zcp-section-title">
            Active Rides
            <span *ngIf="newRideAlert" class="zcp-blink-dot"></span>
          </span>
          <div class="zcp-header-actions">
            <button class="zcp-icon-btn" type="button" (click)="testSound()" title="Test sound">🔊</button>
            <button class="zcp-icon-btn" type="button" (click)="refreshActiveRides()">↻</button>
          </div>
        </div>

        <div *ngIf="activeRides.length === 0" class="zcp-empty">
          <div class="zcp-empty-icon">🛵</div>
          <div class="zcp-empty-text">No active rides. Waiting for assignments...</div>
        </div>

        <div class="zcp-ride-card" [class.zcp-new-ride]="isNewRide(ride.id)" *ngFor="let ride of activeRides">
          <div class="zcp-ride-top">
            <span class="zcp-chip" [ngClass]="rideChipClass(ride.status)">{{ rideStatusLabel(ride.status) }}</span>
            <span class="zcp-ride-fare" *ngIf="ride.estimatedFare">₹{{ ride.estimatedFare }}</span>
          </div>
          <div class="zcp-ride-route">
            <div class="zcp-route-row">
              <span class="zcp-dot zcp-green"></span>
              <span class="zcp-route-txt">{{ ride.pickup.address | slice:0:60 }}</span>
            </div>
            <div class="zcp-route-line"></div>
            <div class="zcp-route-row">
              <span class="zcp-dot zcp-red"></span>
              <span class="zcp-route-txt">{{ ride.drop.address | slice:0:60 }}</span>
            </div>
          </div>
          <div class="zcp-ride-meta">
            <span>👤 {{ ride.userName }}</span>
            <span>🔑 {{ ride.otp }}</span>
            <span>{{ ride.serviceType | titlecase }}</span>
          </div>
          <div class="zcp-ride-actions-row">
            <button class="zcp-accept-ride-btn" type="button" *ngIf="ride.status === 'created'" (click)="openRideModal(ride)">
              Accept / Decline
            </button>
            <button class="zcp-track-btn" type="button" (click)="openRideTracking(ride)">📍 Track</button>
          </div>
        </div>
      </div>

      <!-- ── Live Location ── -->
      <div class="zcp-section">
        <div class="zcp-section-header">
          <span class="zcp-section-title">📍 Live Location</span>
          <button class="zcp-icon-btn" type="button" (click)="refreshCaptainLocation()">↻ Refresh</button>
        </div>
        <div class="zcp-location-label">{{ captainLocationLabel }}</div>
        <div class="zcp-location-err" *ngIf="locationError">{{ locationError }}</div>
        <iframe
          [src]="captainMapUrl | safeResourceUrl"
          width="100%"
          height="200"
          frameborder="0"
          class="zcp-map"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>

      <!-- ── Performance Stats ── -->
      <div class="zcp-section">
        <div class="zcp-section-title">Performance</div>
        <div class="zcp-stats-grid">
          <div class="zcp-stat-card">
            <div class="zcp-stat-icon">⭐</div>
            <div class="zcp-stat-val">{{ avgCaptainRating.toFixed(1) }}</div>
            <div class="zcp-stat-label">Captain Rating</div>
          </div>
          <div class="zcp-stat-card">
            <div class="zcp-stat-icon">🚗</div>
            <div class="zcp-stat-val">{{ avgRideRating.toFixed(1) }}</div>
            <div class="zcp-stat-label">Ride Rating</div>
          </div>
          <div class="zcp-stat-card">
            <div class="zcp-stat-icon">❤️</div>
            <div class="zcp-stat-val">{{ totalHearts }}</div>
            <div class="zcp-stat-label">Hearts</div>
          </div>
          <div class="zcp-stat-card">
            <div class="zcp-stat-icon">💬</div>
            <div class="zcp-stat-val">{{ feedbackCount }}</div>
            <div class="zcp-stat-label">Reviews</div>
          </div>
        </div>
      </div>

      <!-- ── Delivery History ── -->
      <div class="zcp-section" id="deliveries-section">
        <div class="zcp-section-header">
          <span class="zcp-section-title">Delivery History</span>
          <span class="zcp-count-badge">{{ completedRides.length }}</span>
        </div>
        <div *ngIf="completedRides.length === 0" class="zcp-empty-small">No completed rides yet.</div>
        <div class="zcp-delivery-card" *ngFor="let ride of completedRides"
          [class.zcp-delivery-highlight]="highlightedDeliveryBookingId === ride.id">
          <div class="zcp-delivery-row">
            <div>
              <div class="zcp-delivery-id">{{ ride.id }}</div>
              <div class="zcp-delivery-addr">{{ ride.pickup.address | slice:0:32 }} → {{ ride.drop.address | slice:0:32 }}</div>
              <div class="zcp-delivery-status">{{ ride.status }}</div>
            </div>
            <div class="zcp-delivery-right">
              <span class="zcp-paid-badge" [class.zcp-pending-badge]="!ride.paymentDone">
                {{ ride.paymentDone ? 'Paid' : 'Pending' }}
              </span>
              <div class="zcp-delivery-amount" *ngIf="ride.finalAmount">₹{{ ride.finalAmount | number:'1.0-0' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Customer Reviews ── -->
      <div class="zcp-section" *ngIf="recentComments.length > 0">
        <div class="zcp-section-title mb-2">Customer Reviews</div>
        <div *ngFor="let item of recentComments" class="zcp-review-card">
          <div class="zcp-review-header">
            <span class="zcp-review-user">{{ item.userName }}</span>
            <span class="zcp-review-stars">
              {{ item.rideRating || '-' }}/5 ride &nbsp;•&nbsp; {{ item.captainRating || '-' }}/5 captain
              <span *ngIf="item.lovedCaptain"> ❤️</span>
            </span>
          </div>
          <div class="zcp-review-text">{{ item.feedbackText || 'No written comment.' }}</div>
        </div>
      </div>

      <!-- ── Profile & KYC (collapsible) ── -->
      <div class="zcp-section">
        <div class="zcp-section-header zcp-collapsible" (click)="profileExpanded = !profileExpanded">
          <span class="zcp-section-title">Profile & KYC</span>
          <span class="zcp-collapse-icon">{{ profileExpanded ? '▲' : '▼' }}</span>
        </div>

        <div *ngIf="profileExpanded" class="zcp-profile-body">
          <div class="zcp-dp-section">
            <img class="zcp-profile-img" [src]="dpPreview || defaultDp" alt="Captain DP" />
            <div class="zcp-dp-controls">
              <label class="zcp-label">Update Profile Photo</label>
              <input type="file" class="zcp-file-input" accept="image/*" (change)="onDpFileSelected($event)" />
              <button class="zcp-save-dp-btn" type="button" (click)="saveDp()" [disabled]="!dpPreview || savingDp">
                {{ savingDp ? 'Saving...' : 'Save Photo' }}
              </button>
            </div>
          </div>

          <div class="zcp-kyc-card">
            <div class="zcp-kyc-header">
              <span class="zcp-kyc-title">KYC Verification</span>
              <span class="zcp-kyc-badge" [ngClass]="kycBadgeClass(kycStatus)">{{ kycStatusLabel(kycStatus) }}</span>
            </div>
            <div class="zcp-kyc-hint">Keep KYC updated to display the Verified Driver Badge to riders.</div>
            <div class="zcp-kyc-ref" *ngIf="kycReferenceId">Reference: {{ kycReferenceId }}</div>
            <div class="zcp-kyc-ref" *ngIf="kycUpdatedAt">Updated: {{ kycUpdatedAt | date:'mediumDate' }}</div>

            <label class="zcp-label mt-3">Document Type</label>
            <select class="zcp-select" [(ngModel)]="kycDocumentType">
              <option value="Driving License">Driving License</option>
              <option value="Aadhaar">Aadhaar</option>
              <option value="PAN">PAN</option>
              <option value="Voter ID">Voter ID</option>
            </select>

            <label class="zcp-label mt-2">Document Number</label>
            <input class="zcp-input" placeholder="Enter document number" [(ngModel)]="kycDocumentNumber" />
            <div class="zcp-masked-hint" *ngIf="kycDocumentNumber">Masked: {{ maskedDocumentNumber }}</div>

            <div class="zcp-kyc-actions">
              <button class="zcp-kyc-submit-btn" type="button" (click)="submitKyc()" [disabled]="!canSubmitKyc">Submit KYC</button>
              <button class="zcp-kyc-verify-btn" type="button" (click)="markKycVerified()" [disabled]="kycStatus !== 'pending'">Mark Verified</button>
              <button class="zcp-kyc-reject-btn" type="button" (click)="markKycRejected()" [disabled]="kycStatus !== 'pending'">Reject</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ─── Page ─── */
    .zcp-page { min-height: 100vh; background: #f4f5f7; padding-bottom: 80px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* ─── Action Toast ─── */
    .action-toast { position: fixed; top: 72px; left: 50%; transform: translateX(-50%); z-index: 9999; padding: 14px 28px; border-radius: 14px; font-size: 16px; font-weight: 600; box-shadow: 0 8px 32px rgba(0,0,0,.22); animation: slideDown .3s ease; min-width: 300px; text-align: center; }
    .toast-accept { background: #d1fae5; color: #065f46; border: 2px solid #34d399; }
    .toast-decline { background: #fee2e2; color: #7f1d1d; border: 2px solid #f87171; }
    @keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-16px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

    /* ─── Ride Modal ─── */
    .ride-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:9998; display:flex; align-items:center; justify-content:center; animation:fadeIn .2s ease; }
    @keyframes fadeIn { from{opacity:0}to{opacity:1} }
    .ride-modal-card { background:#fff; border-radius:22px; width:92%; max-width:440px; box-shadow:0 24px 64px rgba(0,0,0,.35); overflow:hidden; animation:popIn .25s cubic-bezier(.34,1.56,.64,1); }
    @keyframes popIn { from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1} }
    .ride-modal-header { background:linear-gradient(135deg,#1a1a2e,#e23744); color:#fff; padding:20px 20px 16px; display:flex; align-items:center; gap:14px; }
    .ride-modal-icon-wrap { position:relative; width:52px; height:52px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .ride-modal-icon { font-size:30px; z-index:1; }
    .ride-modal-ring { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(255,255,255,.5); animation:ringPulse 1.4s ease-out infinite; }
    .ride-modal-ring.r2 { animation-delay:.7s; }
    @keyframes ringPulse { 0%{transform:scale(.8);opacity:.7}100%{transform:scale(1.7);opacity:0} }
    .ride-modal-title { margin:0; font-size:19px; font-weight:800; animation:blink 1s step-start infinite; }
    @keyframes blink { 0%,100%{opacity:1}50%{opacity:.4} }
    .ride-modal-sub { font-size:12px; opacity:.8; margin-top:2px; }
    .ride-modal-fare { margin-left:auto; font-size:24px; font-weight:900; color:#fff; }
    .ride-modal-route { padding:14px 20px; background:#fafafb; border-bottom:1px solid #eee; }
    .ride-modal-route-row { display:flex; align-items:flex-start; gap:10px; }
    .rm-route-line-v { width:1.5px; height:14px; background:#ccc; margin-left:6px; }
    .rm-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; margin-top:3px; }
    .rm-green { background:#26a541; }
    .rm-red { background:#e23744; }
    .rm-route-text { font-size:13px; font-weight:600; color:#222; line-height:1.4; }
    .ride-modal-meta { padding:12px 20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
    .rm-meta-item { display:flex; flex-direction:column; gap:2px; }
    .rm-meta-label { font-size:10px; font-weight:700; color:#aaa; text-transform:uppercase; }
    .rm-meta-val { font-size:14px; font-weight:800; color:#111; }
    .rm-otp { color:#e23744; letter-spacing:2px; }
    .ride-modal-actions { display:flex; border-top:1px solid #eee; }
    .rm-decline-btn { flex:1; padding:16px; border:none; background:#fff; font-size:15px; font-weight:700; color:#666; cursor:pointer; border-bottom-left-radius:22px; transition:all .15s; }
    .rm-decline-btn:hover { background:#fff5f5; color:#e23744; }
    .rm-accept-btn { flex:2; padding:16px; border:none; background:linear-gradient(135deg,#26a541,#1d7d32); font-size:16px; font-weight:800; color:#fff; cursor:pointer; border-bottom-right-radius:22px; box-shadow:0 4px 14px rgba(38,165,65,.4); animation:acceptGlow 1.5s ease-in-out infinite; }
    @keyframes acceptGlow { 0%,100%{box-shadow:0 4px 14px rgba(38,165,65,.4)}50%{box-shadow:0 6px 20px rgba(38,165,65,.7)} }

    /* ─── Header ─── */
    .zcp-header { background:linear-gradient(160deg,#1c1c1e 0%,#2d2d30 100%); color:#fff; padding:20px 16px 0; }
    .zcp-header-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .zcp-captain-info { display:flex; align-items:center; gap:14px; }
    .zcp-avatar-wrap { position:relative; flex-shrink:0; }
    .zcp-avatar { width:62px; height:62px; border-radius:50%; object-fit:cover; border:2.5px solid rgba(255,255,255,.25); }
    .zcp-avatar-status { position:absolute; bottom:2px; right:2px; width:13px; height:13px; border-radius:50%; border:2px solid #1c1c1e; background:#555; }
    .zcp-avatar-status.online { background:#26e36c; }
    .zcp-captain-name { font-size:18px; font-weight:800; line-height:1.2; }
    .zcp-captain-sub { font-size:12px; color:#aaa; margin-top:2px; }
    .zcp-stars { display:flex; align-items:center; gap:2px; margin-top:4px; font-size:13px; color:#f5a623; }
    .zcp-rating-val { color:#ddd; font-size:12px; font-weight:700; margin-left:4px; }
    .zcp-toggle-btn { padding:10px 18px; border-radius:999px; border:none; font-size:14px; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all .2s; flex-shrink:0; }
    .zcp-toggle-dot { width:9px; height:9px; border-radius:50%; background:currentColor; opacity:.7; }
    .zcp-toggle-online { background:#153722; color:#26e36c; box-shadow:0 0 0 2px #26e36c33; }
    .zcp-toggle-offline { background:#3a1a1a; color:#f87171; box-shadow:0 0 0 2px #f8717133; }
    .zcp-kyc-strip { display:flex; align-items:center; gap:8px; background:rgba(245,166,35,.15); border:1px solid rgba(245,166,35,.3); border-radius:10px; padding:8px 12px; margin-top:14px; font-size:12px; color:#f5c842; }
    .zcp-earnings-strip { display:flex; align-items:center; margin-top:16px; background:rgba(255,255,255,.07); border-radius:14px 14px 0 0; padding:14px 8px; }
    .zcp-earn-item { flex:1; text-align:center; }
    .zcp-earn-val { font-size:18px; font-weight:900; color:#fff; }
    .zcp-earn-label { font-size:10px; color:#aaa; margin-top:3px; }
    .zcp-earn-divider { width:1px; height:28px; background:rgba(255,255,255,.12); }

    /* ─── New Ride Banner ─── */
    .zcp-new-ride-banner { display:flex; align-items:center; gap:10px; background:#1f0a0c; border-left:4px solid #e23744; padding:12px 16px; font-size:14px; font-weight:700; color:#fff; position:relative; overflow:hidden; }
    .zcp-banner-pulse { position:absolute; inset:0; background:linear-gradient(90deg,rgba(226,55,68,.12),transparent); animation:bannerSweep 2s ease-in-out infinite; }
    @keyframes bannerSweep { 0%,100%{opacity:.4}50%{opacity:1} }
    .zcp-banner-btn { margin-left:auto; background:#e23744; border:none; border-radius:8px; padding:6px 14px; color:#fff; font-size:12px; font-weight:800; cursor:pointer; }
    .zcp-ready-banner { background:#0d1f13; border-left:4px solid #26a541; padding:12px 16px; font-size:13px; font-weight:600; color:#8cf3b2; }

    /* ─── Sections ─── */
    .zcp-section { background:#fff; margin:10px 12px; border-radius:16px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .zcp-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .zcp-section-title { font-size:15px; font-weight:800; color:#1c1c1e; position:relative; }
    .zcp-blink-dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#e23744; margin-left:6px; animation:dotBlink 1s step-start infinite; vertical-align:middle; }
    @keyframes dotBlink { 0%,100%{opacity:1}50%{opacity:0} }
    .mb-2 { margin-bottom:8px; }

    /* ─── Header actions ─── */
    .zcp-header-actions { display:flex; gap:6px; }
    .zcp-icon-btn { background:#f4f5f7; border:none; border-radius:8px; padding:6px 10px; font-size:13px; font-weight:700; color:#555; cursor:pointer; }
    .zcp-count-badge { background:#e23744; color:#fff; border-radius:999px; padding:2px 9px; font-size:11px; font-weight:800; }

    /* ─── Empty ─── */
    .zcp-empty { text-align:center; padding:32px 16px; color:#999; }
    .zcp-empty-icon { font-size:36px; margin-bottom:8px; }
    .zcp-empty-text { font-size:13px; }
    .zcp-empty-small { font-size:13px; color:#999; text-align:center; padding:16px; }

    /* ─── Ride Cards ─── */
    .zcp-ride-card { border:1px solid #ececf0; border-radius:14px; padding:12px; margin-bottom:10px; background:#fafafb; }
    .zcp-ride-card.zcp-new-ride { border-color:#e23744; background:#fff5f6; box-shadow:0 0 0 2px rgba(226,55,68,.15); }
    .zcp-ride-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .zcp-chip { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.4px; padding:4px 10px; border-radius:999px; }
    .chip-created { background:#fff4d6; color:#8a5900; }
    .chip-assigned, .chip-in_transit, .chip-arriving { background:#e9f0ff; color:#2452be; }
    .chip-pickup_in_progress { background:#fff0e0; color:#b85c00; }
    .chip-delivered, .chip-completed { background:#e7f9ee; color:#0f7a42; }
    .chip-cancelled { background:#ffe7ea; color:#ae2e3a; }
    .zcp-ride-fare { font-size:16px; font-weight:900; color:#1c1c1e; }
    .zcp-ride-route { background:#fff; border:1px solid #f0f0f3; border-radius:12px; padding:10px 12px; margin-bottom:10px; }
    .zcp-route-row { display:flex; align-items:flex-start; gap:8px; }
    .zcp-route-line { width:1.5px; height:12px; background:#ddd; margin-left:4px; margin-top:2px; margin-bottom:2px; }
    .zcp-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:3px; }
    .zcp-green { background:#26a541; }
    .zcp-red { background:#e23744; }
    .zcp-route-txt { font-size:12px; font-weight:600; color:#333; line-height:1.35; }
    .zcp-ride-meta { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
    .zcp-ride-meta span { background:#f4f5f7; border-radius:999px; padding:4px 10px; font-size:11px; color:#555; font-weight:600; }
    .zcp-ride-actions-row { display:flex; gap:8px; }
    .zcp-accept-ride-btn { flex:1; padding:10px; border:none; background:linear-gradient(135deg,#e23744,#b32030); color:#fff; border-radius:10px; font-size:13px; font-weight:800; cursor:pointer; }
    .zcp-track-btn { padding:10px 16px; border:1.5px solid #1c1c1e; background:#fff; color:#1c1c1e; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; }

    /* ─── Map ─── */
    .zcp-location-label { font-size:12px; color:#666; margin-bottom:6px; }
    .zcp-location-err { font-size:12px; color:#e23744; margin-bottom:6px; }
    .zcp-map { border-radius:14px; border:none; display:block; }

    /* ─── Stats ─── */
    .zcp-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .zcp-stat-card { border:1px solid #f0f0f3; border-radius:14px; padding:12px 8px; text-align:center; background:#fafafb; }
    .zcp-stat-icon { font-size:20px; margin-bottom:6px; }
    .zcp-stat-val { font-size:20px; font-weight:900; color:#1c1c1e; }
    .zcp-stat-label { font-size:10px; color:#888; margin-top:3px; }

    /* ─── Delivery History ─── */
    .zcp-delivery-card { border:1px solid #ececf0; border-radius:12px; padding:10px 12px; margin-bottom:8px; background:#fafafb; }
    .zcp-delivery-card.zcp-delivery-highlight { border-color:#e23744; box-shadow:0 0 0 2px rgba(226,55,68,.1); }
    .zcp-delivery-row { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
    .zcp-delivery-id { font-size:12px; font-weight:800; color:#1c1c1e; }
    .zcp-delivery-addr { font-size:11px; color:#888; margin-top:2px; }
    .zcp-delivery-status { font-size:11px; color:#aaa; margin-top:2px; text-transform:capitalize; }
    .zcp-delivery-right { text-align:right; flex-shrink:0; }
    .zcp-paid-badge { background:#e7f9ee; color:#0f7a42; border-radius:999px; padding:3px 10px; font-size:10px; font-weight:800; }
    .zcp-pending-badge { background:#fff4d6; color:#8a5900; }
    .zcp-delivery-amount { font-size:14px; font-weight:900; color:#1c1c1e; margin-top:4px; }

    /* ─── Reviews ─── */
    .zcp-review-card { border:1px solid #ececf0; border-radius:12px; padding:10px 12px; margin-bottom:8px; }
    .zcp-review-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
    .zcp-review-user { font-size:13px; font-weight:700; color:#1c1c1e; }
    .zcp-review-stars { font-size:11px; color:#888; }
    .zcp-review-text { font-size:13px; color:#444; }

    /* ─── Profile & KYC ─── */
    .zcp-collapsible { cursor:pointer; user-select:none; }
    .zcp-collapse-icon { font-size:12px; color:#888; }
    .zcp-profile-body { padding-top:8px; }
    .zcp-dp-section { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
    .zcp-profile-img { width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid #ececf0; flex-shrink:0; }
    .zcp-dp-controls { flex:1; }
    .zcp-label { font-size:12px; font-weight:700; color:#666; display:block; margin-bottom:4px; }
    .zcp-file-input { width:100%; border:1px solid #ddd; border-radius:8px; padding:6px 8px; font-size:12px; margin-bottom:8px; }
    .zcp-save-dp-btn { background:#1c1c1e; color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:700; cursor:pointer; }
    .zcp-save-dp-btn:disabled { opacity:.5; }
    .zcp-kyc-card { background:#fafafb; border:1px solid #ececf0; border-radius:14px; padding:14px; }
    .zcp-kyc-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
    .zcp-kyc-title { font-size:14px; font-weight:800; color:#1c1c1e; }
    .zcp-kyc-badge { font-size:11px; font-weight:800; border-radius:999px; padding:3px 10px; }
    .kyc-verified { background:#e7f9ee; color:#0f7a42; }
    .kyc-pending { background:#fff4d6; color:#8a5900; }
    .kyc-rejected, .kyc-not-started { background:#ffe7ea; color:#ae2e3a; }
    .zcp-kyc-hint { font-size:12px; color:#888; margin-bottom:8px; }
    .zcp-kyc-ref { font-size:12px; color:#aaa; margin-bottom:2px; }
    .mt-2 { margin-top:8px; }
    .mt-3 { margin-top:12px; }
    .zcp-select { width:100%; border:1px solid #ddd; border-radius:8px; padding:8px 10px; font-size:13px; background:#fff; margin-bottom:4px; }
    .zcp-input { width:100%; border:1px solid #ddd; border-radius:8px; padding:8px 10px; font-size:13px; background:#fff; margin-bottom:4px; }
    .zcp-masked-hint { font-size:11px; color:#aaa; margin-bottom:8px; }
    .zcp-kyc-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
    .zcp-kyc-submit-btn { flex:1; padding:9px 14px; background:#1c1c1e; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; }
    .zcp-kyc-submit-btn:disabled { opacity:.4; }
    .zcp-kyc-verify-btn { flex:1; padding:9px 14px; background:#e7f9ee; color:#0f7a42; border:1px solid #86efac; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }
    .zcp-kyc-verify-btn:disabled { opacity:.4; }
    .zcp-kyc-reject-btn { padding:9px 14px; background:#ffe7ea; color:#ae2e3a; border:1px solid #fecaca; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }
    .zcp-kyc-reject-btn:disabled { opacity:.4; }
  `]
})
export class CaptainProfileComponent implements OnInit, OnDestroy {
  captain: AppUser | null = null;
  dpPreview = '';
  defaultDp = 'https://ui-avatars.com/api/?name=Captain&background=f8d7da&color=7a1632&size=128';
  savingDp = false;

  isOnline = true;
  profileExpanded = false;

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
  private notifiedPaymentRideIds = new Set<string>();
  highlightedDeliveryBookingId = '';
  readyForPickupMessage = '';
  newRideAlert = false;
  private newRideIds = new Set<string>();
  private newRideAlertTimer: ReturnType<typeof setTimeout> | null = null;

  // Modal state for Accept / Decline
  activeRideModal: Booking | null = null;
  rideActionResult: { type: 'accept' | 'decline'; rideId: string } | null = null;
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
    private rideAlert: CaptainRideAlertService
  ) {}

  get todayEarnings(): number {
    const today = new Date().toDateString();
    return this.completedRides
      .filter(r => r.paymentDone && new Date(r.updatedAt).toDateString() === today)
      .reduce((s, r) => s + (r.finalAmount || 0), 0);
  }

  toggleOnline(): void {
    this.isOnline = !this.isOnline;
    this.notifications.push(this.isOnline ? 'You are now Online.' : 'You are now Offline.', 'info');
  }

  starArray(rating: number): string[] {
    const full = Math.round(rating);
    return Array(5).fill('').map((_, i) => i < full ? '★' : '☆');
  }

  rideChipClass(status: string): string {
    const map: Record<string, string> = {
      created: 'chip-created',
      assigned: 'chip-assigned',
      in_transit: 'chip-in_transit',
      pickup_in_progress: 'chip-pickup_in_progress',
      arriving: 'chip-arriving',
      delivered: 'chip-delivered',
      completed: 'chip-completed',
      cancelled: 'chip-cancelled'
    };
    return map[status] || 'chip-created';
  }

  rideStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      created: 'New Request',
      assigned: 'Accepted',
      in_transit: 'In Transit',
      pickup_in_progress: 'At Pickup',
      arriving: 'Arriving',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status.replace('_', ' ');
  }

  ngOnInit(): void {
    this.rideAlert.requestPermission();

    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.captain = user;
      this.dpPreview = user?.profileImageUrl || '';
      this.defaultDp = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Captain')}&background=f8d7da&color=7a1632&size=128`;
      this.loadKycState(user);
      this.loadStats();
      this.refreshActiveRides();
      this.refreshCaptainLocation();
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

    // CaptainRideAlertService fires the sound + browser notification.
    // Subscribe to incomingRide$ to open the modal when a new ride arrives.
    this.rideAlert.incomingRide$.pipe(takeUntil(this.destroy$)).subscribe((ride: Booking | null) => {
      if (!ride) return;
      this.newRideIds.add(ride.id);
      this.newRideAlert = true;
      if (!this.activeRideModal) {
        this.activeRideModal = ride;
      }
      if (this.newRideAlertTimer) clearTimeout(this.newRideAlertTimer);
      this.newRideAlertTimer = setTimeout(() => {
        this.newRideAlert = false;
        this.newRideIds.clear();
      }, 30000);
    });

    // Refresh ride list + payment alerts whenever bookings change
    this.bookingService.bookings$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshActiveRides();
      this.notifyForPaymentUpdates();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.newRideAlertTimer) clearTimeout(this.newRideAlertTimer);
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

  openRideTracking(booking: Booking): void {
    this.router.navigate(['/tracking', booking.id]);
  }

  testSound(): void {
    this.rideAlert.playAlertSound();
    this.notifications.push('🔊 Sound test played! This is the exact sound captains hear for new rides.', 'info');
  }

  openRideModal(ride: Booking): void {
    this.activeRideModal = ride;
  }

  closeRideModal(): void {
    this.activeRideModal = null;
    this.rideAlert.declineRide(); // also decline in service so countdown stops
  }

  acceptRide(ride: Booking): void {
    this.activeRideModal = null;
    this.newRideIds.delete(ride.id);
    if (this.newRideIds.size === 0) this.newRideAlert = false;
    this.rideActionResult = { type: 'accept', rideId: ride.id };
    this.rideAlert.acceptRide(); // delegates to service which calls approveByCaptain
    setTimeout(() => { this.rideActionResult = null; }, 5000);
  }

  declineRide(ride: Booking): void {
    this.activeRideModal = null;
    this.newRideIds.delete(ride.id);
    if (this.newRideIds.size === 0) this.newRideAlert = false;
    this.rideActionResult = { type: 'decline', rideId: ride.id };
    this.rideAlert.declineRide(); // delegates to service which calls cancelRide
    setTimeout(() => { this.rideActionResult = null; }, 5000);
  }

  isNewRide(rideId: string): boolean {
    return this.newRideIds.has(rideId);
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

  private notifyForPaymentUpdates(): void {
    for (const ride of this.completedRides) {
      if (!ride.paymentDone || this.notifiedPaymentRideIds.has(ride.id)) {
        continue;
      }

      this.notifiedPaymentRideIds.add(ride.id);
      const message = `Customer paid for ${ride.id}. Amount: Rs ${Math.round(ride.finalAmount || 0)}.`;
      this.notifications.push(message, 'success');

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Payment Received', {
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
