import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserPreferencesService } from '../../core/services/user-preferences.service';

interface PlaceSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface VehicleOption {
  type: string;
  icon: string;
  label: string;
  description: string;
  farePerKm: number;
  etaMin: number;
  capacity: number;
  tag?: string;
}

interface StopPoint {
  address: string;
  lat: number;
  lng: number;
}

interface TravelOfferRule {
  title: string;
  code: string;
  detail: string;
  type: 'flat' | 'percent';
  value: number;
  minFare: number;
  maxDiscount?: number;
}

type CaptainKycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

type CaptainKycFormState = {
  userId: string;
  kycStatus: CaptainKycStatus;
  kycDocumentType: string;
  kycDocumentNumberMasked: string;
  kycReferenceId: string;
  kycUpdatedAt: string;
};

const CAPTAIN_KYC_STORAGE_KEY = 'delivery_captain_kyc_state';

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="travel-shell">

      <!-- ── STEP 1: Detect / Confirm Pickup ── -->
      <div *ngIf="step === 1" class="step-container">
        <div class="map-box">
          <iframe
            *ngIf="pickupMapUrl"
            [src]="pickupMapUrl"
            width="100%" height="100%"
            frameborder="0" style="border:0"
            loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
          <div *ngIf="!pickupMapUrl" class="map-placeholder">
            <div class="spinner-border text-danger"></div>
            <p class="mt-2 text-muted small">Getting your location…</p>
          </div>
          <div class="pickup-badge" *ngIf="pickupMapUrl">📍 Pickup Point</div>
          <button class="locate-btn" (click)="detectLiveLocation()" title="Use my live location">🎯</button>
        </div>

        <div class="bottom-sheet">
          <div class="sheet-handle"></div>
          <div *ngIf="locating" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-danger me-2"></div>
            Detecting your location…
          </div>
          <div *ngIf="!locating">
            <p class="sheet-label mb-2">📍 Double check pickup point</p>
            <div class="addr-box mb-3">
              <span class="addr-dot">●</span>
              <span class="addr-text">{{ pickupAddress || 'Fetching address…' }}</span>
            </div>

            <p class="sheet-label mb-2">Or search pickup location</p>
            <div class="search-box mb-2">
              <span>🔍</span>
              <input class="search-input" [(ngModel)]="pickupQuery"
                (ngModelChange)="onPickupSearch($event)" placeholder="Enter pickup point" />
              <button *ngIf="pickupQuery" class="clear-btn" (click)="pickupQuery=''; pickupSuggestions=[]">✕</button>
            </div>

            <div *ngIf="pickupSuggestions.length" class="suggestion-list mb-2">
              <div class="suggestion-item" *ngFor="let s of pickupSuggestions" (click)="selectPickup(s)">
                <span class="sug-icon">🕐</span>
                <div class="overflow-hidden">
                  <div class="sug-title">{{ shortName(s.display_name) }}</div>
                  <div class="sug-sub">{{ s.display_name }}</div>
                </div>
              </div>
            </div>

            <button class="confirm-btn" [disabled]="!pickupAddress" (click)="confirmPickup()">
              Confirm Pickup
            </button>
          </div>
        </div>
      </div>

      <!-- ── STEP 2: Set Drop Location ── -->
      <div *ngIf="step === 2" class="step-container step-drop">
        <div class="drop-header">
          <button class="back-btn" (click)="step=1">←</button>
          <h5 class="mb-0">Drop</h5>
          <span class="for-me-badge">For me ▾</span>
        </div>

        <div class="route-box">
          <div class="route-row">
            <span class="route-dot green"></span>
            <span class="route-text">{{ shortName(pickupAddress) }}</span>
          </div>

          <ng-container *ngFor="let stop of stops; let i = index">
            <div class="route-divider"></div>
            <div class="route-row">
              <span class="route-dot amber"></span>
              <span class="route-text">Stop {{ i + 1 }}: {{ shortName(stop.address) }}</span>
              <button class="clear-btn-sm" (click)="removeStop(i)" title="Remove stop">✕</button>
            </div>
          </ng-container>

          <div class="route-divider"></div>
          <div class="route-row">
            <span class="route-dot orange"></span>
            <input class="route-input" [(ngModel)]="dropQuery"
              (ngModelChange)="onDropSearch($event)" placeholder="Drop location" autofocus />
            <button *ngIf="dropQuery" class="clear-btn-sm" (click)="dropQuery=''; dropSuggestions=[]">✕</button>
          </div>
        </div>

        <div class="action-row">
          <button class="action-pill" (click)="useMapForDrop()">📍 Select on map</button>
        </div>

        <div class="stop-input-row px-3">
          <div class="search-box stop-search-box">
            <span>➕</span>
            <input
              class="search-input"
              [(ngModel)]="stopQuery"
              (ngModelChange)="onStopSearch($event)"
              placeholder="Add a stop (optional)"
            />
            <button *ngIf="stopQuery" class="clear-btn" (click)="stopQuery=''; stopSuggestions=[]">✕</button>
          </div>
          <button class="action-pill" [disabled]="!stopQuery.trim()" (click)="addStop()">Add stop</button>
        </div>

        <div *ngIf="stopSuggestions.length" class="suggestion-list px-3">
          <div class="suggestion-item" *ngFor="let s of stopSuggestions" (click)="selectStopSuggestion(s)">
            <span class="sug-icon">➕</span>
            <div class="overflow-hidden flex-1">
              <div class="sug-title">{{ shortName(s.display_name) }}</div>
              <div class="sug-sub">{{ s.display_name }}</div>
            </div>
          </div>
        </div>

        <div *ngIf="dropSuggestions.length" class="suggestion-list px-3">
          <div class="suggestion-item" *ngFor="let s of dropSuggestions" (click)="selectDrop(s)">
            <span class="sug-icon">🕐</span>
            <div class="overflow-hidden flex-1">
              <div class="sug-title">{{ shortName(s.display_name) }}</div>
              <div class="sug-sub">{{ s.display_name }}</div>
            </div>
            <span class="fav-icon">🤍</span>
          </div>
        </div>

        <div *ngIf="!dropSuggestions.length && dropQuery.length < 2" class="px-3">
          <p class="section-title mt-2 mb-2" *ngIf="recentStops.length">Recent Stops</p>
          <div class="popular-grid" *ngIf="recentStops.length">
            <div class="popular-card" *ngFor="let stop of recentStops" (click)="useRecentStop(stop)">
              <span>🕘</span>
              <span>{{ shortName(stop.address) }}</span>
              <span class="pop-arrow">›</span>
            </div>
          </div>

          <p class="section-title mt-3 mb-2">Popular Places</p>
          <div class="popular-grid">
            <div class="popular-card" *ngFor="let p of popularPlaces" (click)="selectPopular(p)">
              <span>{{ p.icon }}</span>
              <span>{{ p.name }}</span>
              <span class="pop-arrow">›</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── STEP 3: Vehicle Selection ── -->
      <div *ngIf="step === 3" class="step-container">
        <div class="map-box map-box-route">
          <iframe *ngIf="routeMapUrl" [src]="routeMapUrl"
            width="100%" height="100%" frameborder="0" style="border:0" loading="lazy"></iframe>
          <div class="route-top-bar">
            <button class="back-btn-float" (click)="step=2">←</button>
            <span class="addr-chip">{{ shortName(pickupAddress) }}</span>
            <span class="addr-chip">{{ shortName(dropAddress) }}</span>
            <button class="add-stop-float" (click)="addStop()">＋ Add stop</button>
          </div>
        </div>

        <div class="bottom-sheet bottom-sheet-tall">
          <div class="sheet-handle"></div>
          <div class="dist-row">
            <span class="dist-label">📏 {{ distanceKm }} km</span>
            <span class="dist-label">⏱ ~{{ etaMinutes }} min drive</span>
          </div>

          <div class="vehicle-card" *ngFor="let v of vehicleOptions"
            [class.selected]="selectedVehicle?.type === v.type" (click)="selectVehicle(v)">
            <div class="veh-icon">{{ v.icon }}</div>
            <div class="veh-info">
              <div class="veh-name">{{ v.label }}
                <span class="veh-tag" *ngIf="v.tag">{{ v.tag }}</span>
              </div>
              <div class="veh-desc">{{ v.description }}&nbsp;•&nbsp;{{ v.capacity }} seat(s)</div>
              <div class="veh-meta">{{ v.etaMin }} min away • Drop {{ getDropTime(v.etaMin) }}</div>
            </div>
            <div class="veh-fare">₹{{ calculateFare(v) }}</div>
          </div>

          <div class="payment-row">
            <button class="pay-pill">💳 Cash ›</button>
            <button class="pay-pill" (click)="toggleOffersPanel()">% Offers ›</button>
          </div>

          <div class="travel-offers-box" *ngIf="showOffersPanel">
            <div class="small fw-semibold mb-1">Available Offers</div>
            <div class="travel-offer-item" *ngFor="let offer of travelOfferRules">
              <div>
                <div class="fw-semibold">{{ offer.title }}</div>
                <div class="small text-muted">{{ offer.detail }}</div>
                <div class="small mt-1">Code: <span class="travel-offer-code">{{ offer.code }}</span></div>
              </div>
              <button class="btn btn-outline-success btn-sm" type="button" (click)="claimTravelOffer(offer.code)">I am eligible</button>
            </div>
            <div class="small text-success" *ngIf="appliedTravelOfferCode">
              Offer {{ appliedTravelOfferCode }} applied. You save ₹{{ selectedVehicle ? getOfferDiscountForVehicle(selectedVehicle) : 0 }}.
            </div>
            <button class="btn btn-outline-secondary btn-sm mt-1" *ngIf="appliedTravelOfferCode" (click)="clearTravelOffer()" type="button">Remove Offer</button>
          </div>

          <button class="confirm-btn" [disabled]="!selectedVehicle || booking" (click)="bookRide()">
            <span *ngIf="!booking">Book {{ selectedVehicle?.label || 'Ride' }}</span>
            <span *ngIf="booking">
              <span class="spinner-border spinner-border-sm me-1"></span> Booking…
            </span>
          </button>
        </div>
      </div>

      <!-- ── STEP 4: Confirmed ── -->
      <div *ngIf="step === 4" class="confirm-screen">
        <div class="confirm-content">
          <div class="uber-status-card">
            <div class="uber-status-top">
              <div>
                <div class="uber-status-title">Ride Confirmed</div>
                <div class="uber-status-sub">Your {{ selectedVehicle?.label }} is on the way</div>
              </div>
              <div class="uber-fare-pill">₹{{ selectedVehicle ? calculateFare(selectedVehicle) : 0 }}</div>
            </div>
            <div class="uber-meta-row">
              <span>⏱ Arrives in ~{{ selectedVehicle?.etaMin || etaMinutes || 3 }} min</span>
              <span>📏 {{ distanceKm }} km</span>
              <span>🆔 {{ currentBookingId || 'Pending ID' }}</span>
            </div>
            <div class="uber-eta-progress" aria-label="Captain arrival progress">
              <div class="uber-eta-fill" [style.width.%]="etaProgressPercent"></div>
            </div>
            <div class="uber-eta-caption">Captain is heading to your pickup point</div>
          </div>

          <div class="uber-otp-card">
            <div class="otp-heading">START RIDE OTP</div>
            <div class="otp-code">{{ bookingOtp }}</div>
            <div class="otp-help">Share this OTP with your captain when they arrive.</div>
          </div>

          <div class="confirm-card">
            <div class="confirm-row">
              <span class="cr-label">Pickup</span>
              <span class="cr-val">{{ shortName(pickupAddress) }}</span>
            </div>
            <div class="confirm-row">
              <span class="cr-label">Drop</span>
              <span class="cr-val">{{ shortName(dropAddress) }}</span>
            </div>
            <div class="confirm-row">
              <span class="cr-label">Vehicle</span>
              <span class="cr-val">{{ selectedVehicle?.icon }} {{ selectedVehicle?.label }}</span>
            </div>
            <div class="confirm-row">
              <span class="cr-label">Drop ETA</span>
              <span class="cr-val">{{ getDropTime(selectedVehicle?.etaMin || 0) }}</span>
            </div>
          </div>

          <div class="driver-verify-banner" *ngIf="assignedCaptainName; else searchingCaptainTemplate">
            <div class="driver-main">
              <div class="driver-avatar">{{ captainInitials }}</div>
              <div class="driver-copy">
                <div class="driver-name">{{ assignedCaptainName }}</div>
                <div class="driver-sub">Your captain has been assigned</div>
                <div class="driver-rating-row">
                  <span class="driver-rating">★ {{ assignedCaptainRating | number: '1.1-1' }}</span>
                  <span class="driver-dot">•</span>
                  <span class="driver-plate">{{ assignedVehiclePlate }}</span>
                </div>
              </div>
            </div>
            <span class="driver-verified-pill" *ngIf="assignedCaptainKycStatus === 'verified'">Verified Driver</span>
          </div>
          <div class="driver-action-row" *ngIf="assignedCaptainName">
            <button type="button" class="driver-action-btn" (click)="callCaptain()">📞 Call</button>
            <button type="button" class="driver-action-btn" (click)="chatCaptain()">💬 Chat</button>
          </div>
          <ng-template #searchingCaptainTemplate>
            <div class="driver-searching-banner">Finding your nearest captain...</div>
          </ng-template>
          <div class="driver-verify-note" *ngIf="assignedCaptainName && assignedCaptainKycStatus !== 'verified'">
            Captain assigned. Verified badge will appear only after admin approval.
          </div>

          <div class="ola-cancel-sheet" *ngIf="!isRideCancelled">
            <div class="ola-cancel-title">Cancel ride?</div>
            <div class="ola-cancel-sub">Select a reason (Ola-style quick cancel)</div>
            <div class="ola-reason-grid">
              <button
                type="button"
                class="ola-reason-chip"
                *ngFor="let reason of cancelReasonOptions"
                [class.active]="cancelReason === reason"
                (click)="cancelReason = reason"
              >
                {{ reason }}
              </button>
            </div>
            <input
              *ngIf="cancelReason === 'Other'"
              class="cancel-input ola-other-input"
              placeholder="Type your cancel reason"
              [(ngModel)]="cancelReasonOther"
            />
            <div class="ola-cancel-note">Cancelling frequently may reduce faster captain priority.</div>
            <button class="cancel-btn ola-cancel-cta" [disabled]="!canCancelRide" (click)="cancelBookedRide()">Confirm Cancellation</button>
          </div>

          <div class="cancelled-note" *ngIf="isRideCancelled">
            Ride cancelled. Reason: {{ resolvedCancelReason }}
          </div>
        </div>

        <div class="confirm-sticky-actions">
          <div class="sticky-primary-row">
            <button class="confirm-btn" [disabled]="isRideCancelled" (click)="trackRide()">Track Ride</button>
            <button class="secondary-solid-btn" [disabled]="!assignedCaptainName || isRideCancelled" (click)="callCaptain()">Call Captain</button>
          </div>
          <button class="outline-btn" (click)="resetFlow()">Book Another Ride</button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .travel-shell {
      height: 100dvh; display: flex; flex-direction: column;
      background: #f8f9fa; overflow: hidden;
      color: #0f172a;
    }
    .step-container { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    /* MAP */
    .map-box {
      flex: 1; min-height: 0; position: relative;
      background: #e8eaed; display: flex; align-items: center; justify-content: center;
    }
    .map-box iframe { width: 100%; height: 100%; display: block; }
    .map-box-route { flex: 1.1; }
    .map-placeholder { display: flex; flex-direction: column; align-items: center; }
    .pickup-badge {
      position: absolute; top: 48%; left: 50%; transform: translate(-50%, -100%);
      background: #1a6e32; color: #fff; font-size: 13px; font-weight: 700;
      padding: 5px 14px; border-radius: 20px; pointer-events: none; white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,.2);
    }
    .locate-btn {
      position: absolute; bottom: 14px; right: 14px;
      width: 44px; height: 44px; border-radius: 50%; background: #fff;
      border: none; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.2); cursor: pointer;
    }

    /* BOTTOM SHEET */
    .bottom-sheet {
      background: #fff; border-radius: 20px 20px 0 0;
      padding: 10px 16px 20px; flex-shrink: 0;
      max-height: 58%; overflow-y: auto;
      box-shadow: 0 -4px 20px rgba(0,0,0,.08);
    }
    .bottom-sheet-tall { max-height: 64%; }
    .sheet-handle {
      width: 36px; height: 4px; background: #ddd;
      border-radius: 2px; margin: 0 auto 12px;
    }
    .sheet-label { font-size: 13px; font-weight: 600; color: #333; }

    .addr-box {
      border: 2px solid #1a6e32; border-radius: 12px;
      padding: 10px 12px; display: flex; align-items: flex-start; gap: 8px;
    }
    .addr-dot { color: #1a6e32; font-size: 16px; line-height: 1.5; }
    .addr-text { font-size: 13px; color: #222; line-height: 1.5; }

    .search-box {
      display: flex; align-items: center; background: #f5f5f5;
      border-radius: 30px; padding: 10px 14px; gap: 8px;
    }
    .search-input {
      flex: 1; border: none; background: transparent;
      font-size: 15px; outline: none; font-weight: 600; color: #0f172a;
    }
    .search-input::placeholder { color: #94a3b8; }
    .clear-btn { background: none; border: none; font-size: 14px; color: #888; cursor: pointer; }

    /* SUGGESTIONS */
    .suggestion-list { border-top: 1px solid #f0f0f0; }
    .suggestion-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer;
    }
    .suggestion-item:active { background: #fafafa; }
    .sug-icon { font-size: 18px; flex-shrink: 0; color: #888; }
    .sug-title { font-size: 14px; font-weight: 600; color: #222; }
    .sug-sub { font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 270px; }
    .fav-icon { margin-left: auto; font-size: 16px; flex-shrink: 0; }

    /* CONFIRM BUTTON */
    .confirm-btn {
      width: 100%; padding: 16px; background: #f9a825; color: #1a1a1a;
      font-weight: 700; font-size: 16px; border: none; border-radius: 30px;
      cursor: pointer; transition: opacity .15s;
    }
    .confirm-btn:disabled { opacity: .45; cursor: not-allowed; }
    .outline-btn {
      width: 100%; padding: 14px; background: transparent;
      border: 2px solid #ddd; border-radius: 30px;
      font-weight: 600; font-size: 15px; cursor: pointer; color: #444;
    }

    .cancel-input {
      width: 100%;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 9px 10px;
      font-size: 13px;
      margin-bottom: 8px;
      background: #fff;
      outline: none;
    }

    .cancel-btn {
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 10px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      background: #dc2626;
      cursor: pointer;
    }

    .cancel-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .cancelled-note {
      width: 100%;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
    }

    /* STEP 2 DROP */
    .step-drop { background: #fff; overflow-y: auto; }
    .drop-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-bottom: 1px solid #eee;
    }
    .back-btn {
      background: none; border: 1px solid #ddd; border-radius: 50%;
      width: 34px; height: 34px; font-size: 16px; cursor: pointer;
    }
    .for-me-badge {
      margin-left: auto; background: #f5f5f5; border: 1px solid #ddd;
      border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600;
    }
    .route-box {
      margin: 10px 14px; border-radius: 14px; padding: 12px 14px;
      box-shadow: 0 1px 6px rgba(0,0,0,.08); background: #fff;
    }
    .route-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
    .route-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .route-dot.green { background: #1a6e32; }
    .route-dot.amber { background: #f9a825; }
    .route-dot.orange { background: #e65100; }
    .route-text { font-size: 13px; font-weight: 600; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
    .route-divider { width: 2px; height: 16px; background: #ddd; margin-left: 5px; margin-block: 2px; }
    .route-input { flex: 1; border: none; outline: none; font-size: 14px; color: #333; background: transparent; font-weight: 500; }
    .route-input::placeholder { color: #aaa; }
    .clear-btn-sm { background: none; border: none; font-size: 13px; color: #aaa; cursor: pointer; }
    .action-row { display: flex; gap: 10px; padding: 8px 14px 10px; }
    .stop-input-row {
      display: flex;
      gap: 10px;
      align-items: center;
      padding-bottom: 8px;
    }
    .stop-search-box { flex: 1; }
    .action-pill {
      border: 1px solid #ddd; background: #fff; border-radius: 20px;
      padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: #334155;
    }
    .action-pill:disabled {
      color: #94a3b8;
      border-color: #e2e8f0;
      background: #f8fafc;
      opacity: 1;
    }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .popular-grid { display: flex; gap: 10px; flex-wrap: wrap; padding-bottom: 10px; }
    .popular-card {
      border: 1px solid #eee; border-radius: 12px; padding: 10px 14px;
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; background: #fff; font-size: 13px; font-weight: 600; color: #1e293b;
    }
    .pop-arrow {
      background: #f9a825; border-radius: 50%; width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
    }

    /* STEP 3 VEHICLE */
    .route-top-bar {
      position: absolute; top: 10px; left: 10px; right: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .back-btn-float {
      background: #fff; border: none; border-radius: 50%;
      width: 36px; height: 36px; font-size: 16px; cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,.15); flex-shrink: 0;
    }
    .addr-chip {
      background: #fff; border-radius: 20px; padding: 5px 10px;
      font-size: 11px; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.12);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;
    }
    .add-stop-float {
      margin-left: auto; background: #fff; border: none; border-radius: 20px;
      padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }
    .dist-row { display: flex; gap: 16px; padding: 4px 0 10px; border-bottom: 1px solid #f0f0f0; margin-bottom: 8px; }
    .dist-label { font-size: 12px; color: #475569; font-weight: 600; }
    .vehicle-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 8px; border-radius: 14px; border: 2px solid transparent;
      cursor: pointer; transition: border-color .15s, background .15s; margin-bottom: 4px; color: #1e293b;
    }
    .vehicle-card.selected { border-color: #1a6e32; background: #f0fdf4; }
    .veh-icon { font-size: 30px; width: 48px; text-align: center; flex-shrink: 0; }
    .veh-info { flex: 1; }
    .veh-name { font-size: 15px; font-weight: 700; color: #0f172a; }
    .veh-tag {
      background: #e8f5e9; color: #1a6e32; font-size: 10px; font-weight: 700;
      padding: 2px 7px; border-radius: 20px; margin-left: 6px; vertical-align: middle;
    }
    .veh-desc { font-size: 11px; color: #666; margin-top: 1px; }
    .veh-meta { font-size: 11px; color: #999; margin-top: 1px; }
    .veh-fare { font-size: 18px; font-weight: 800; color: #111; flex-shrink: 0; }
    .payment-row {
      display: flex; gap: 10px; padding: 10px 0 8px;
      border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; margin-bottom: 10px;
    }
    .pay-pill {
      flex: 1; border: 1px solid #ddd; background: #fafafa;
      border-radius: 20px; padding: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #0f172a;
    }

    .travel-offers-box {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #fafafa;
      padding: 10px;
      margin-bottom: 10px;
      display: grid;
      gap: 8px;
    }

    .travel-offer-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      padding: 8px;
      display: flex;
      gap: 8px;
      justify-content: space-between;
      align-items: flex-start;
    }

    .travel-offer-code {
      display: inline-flex;
      align-items: center;
      border: 1px dashed #cbd5e1;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      background: #f8fafc;
      color: #0f172a;
    }

    /* STEP 4 CONFIRM */
    .confirm-screen {
      display: flex; flex-direction: column; align-items: stretch;
      justify-content: flex-start; background: #fff; overflow: hidden; height: 100%;
    }
    .confirm-content {
      flex: 1;
      overflow-y: auto;
      padding: 18px 16px 10px;
      display: grid;
      gap: 10px;
    }
    .confirm-content > * {
      animation: confirm-card-in 0.32s ease both;
    }
    .confirm-content > *:nth-child(2) { animation-delay: 0.04s; }
    .confirm-content > *:nth-child(3) { animation-delay: 0.08s; }
    .confirm-content > *:nth-child(4) { animation-delay: 0.12s; }
    .confirm-content > *:nth-child(5) { animation-delay: 0.16s; }
    .confirm-content > *:nth-child(6) { animation-delay: 0.2s; }
    .uber-status-card {
      border-radius: 16px;
      background: linear-gradient(140deg, #111827 0%, #1f2937 100%);
      color: #f8fafc;
      padding: 14px;
    }
    .uber-status-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .uber-status-title {
      font-size: 1.02rem;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .uber-status-sub {
      font-size: 0.78rem;
      color: #cbd5e1;
      margin-top: 2px;
    }
    .uber-fare-pill {
      border-radius: 999px;
      background: #f59e0b;
      color: #111827;
      font-size: 0.88rem;
      font-weight: 800;
      padding: 6px 12px;
      white-space: nowrap;
    }
    .uber-meta-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      font-size: 0.72rem;
      color: #e2e8f0;
    }
    .uber-meta-row span {
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      padding: 6px 7px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .uber-eta-progress {
      margin-top: 8px;
      height: 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.16);
      overflow: hidden;
    }
    .uber-eta-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #f59e0b 0%, #22c55e 100%);
      transition: width .35s ease;
      position: relative;
      overflow: hidden;
    }
    .uber-eta-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.45) 45%, transparent 100%);
      transform: translateX(-100%);
      animation: eta-shimmer 1.6s linear infinite;
    }
    .uber-eta-caption {
      margin-top: 6px;
      font-size: 0.7rem;
      color: #e2e8f0;
    }
    .uber-otp-card {
      border: 1px solid #bbf7d0;
      background: #ecfdf5;
      border-radius: 14px;
      padding: 12px;
      text-align: center;
    }
    .otp-heading {
      font-size: 0.68rem;
      font-weight: 700;
      color: #166534;
      letter-spacing: 0.12em;
      margin-bottom: 6px;
    }
    .otp-code {
      font-size: 1.9rem;
      font-weight: 900;
      letter-spacing: 0.32rem;
      color: #14532d;
      line-height: 1;
      margin-bottom: 6px;
    }
    .otp-help {
      font-size: 0.75rem;
      color: #166534;
    }
    .driver-verify-banner {
      width: 100%;
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: 12px;
      padding: 10px 12px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .driver-main {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .driver-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
      color: #fff;
      font-size: 0.78rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .driver-copy {
      min-width: 0;
      display: grid;
      gap: 1px;
    }
    .driver-name { font-size: 12px; font-weight: 700; color: #1f2937; }
    .driver-sub {
      font-size: 0.7rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .driver-rating-row {
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.69rem;
      color: #334155;
      font-weight: 700;
    }
    .driver-rating {
      color: #b45309;
    }
    .driver-dot {
      opacity: 0.5;
    }
    .driver-plate {
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      padding: 1px 6px;
      font-size: 0.64rem;
      color: #1e293b;
      background: #f8fafc;
    }
    .driver-searching-banner {
      width: 100%;
      border: 1px solid #dbeafe;
      background: #eff6ff;
      color: #1e40af;
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .driver-action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .driver-action-btn {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #fff;
      color: #0f172a;
      font-size: 0.76rem;
      font-weight: 700;
      padding: 8px;
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
    }
    .driver-action-btn:hover {
      border-color: #94a3b8;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
    }
    .driver-action-btn:active {
      transform: scale(0.98);
    }
    .driver-verified-pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid #bbf7d0;
      background: #ecfdf3;
      color: #166534;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }
    .driver-verify-note {
      width: 100%;
      border-radius: 10px;
      padding: 8px 10px;
      margin-bottom: 10px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
    }
    .confirm-card {
      width: 100%; border: 1px solid #e5e7eb; border-radius: 14px;
      padding: 12px; background: #f8fafc;
    }
    .confirm-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #f0f0f0;
    }
    .confirm-row:last-child { border-bottom: none; }
    .cr-label { font-size: 12px; color: #64748b; font-weight: 700; }
    .cr-val { font-size: 13px; color: #0f172a; font-weight: 700; max-width: 55%; text-align: right; }
    .ola-cancel-sheet {
      width: 100%;
      border: 1px solid #fecaca;
      border-radius: 14px;
      background: #fff7f7;
      padding: 12px;
      display: grid;
      gap: 8px;
    }
    .ola-cancel-title {
      font-size: 0.9rem;
      font-weight: 800;
      color: #991b1b;
    }
    .ola-cancel-sub {
      font-size: 0.76rem;
      color: #7f1d1d;
    }
    .ola-reason-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .ola-reason-chip {
      border: 1px solid #fecaca;
      background: #ffffff;
      color: #7f1d1d;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      transition: all .15s ease;
    }
    .ola-reason-chip.active {
      border-color: #dc2626;
      background: #dc2626;
      color: #fff;
      box-shadow: 0 4px 10px rgba(220, 38, 38, 0.25);
    }
    .ola-other-input {
      margin-bottom: 0;
      border-color: #fca5a5;
      color: #7f1d1d;
    }
    .ola-cancel-note {
      font-size: 0.7rem;
      color: #7f1d1d;
    }
    .ola-cancel-cta {
      background: #dc2626;
      color: #fff;
      font-weight: 800;
    }
    .ola-cancel-cta:disabled {
      opacity: .45;
    }
    .confirm-sticky-actions {
      border-top: 1px solid #e5e7eb;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(8px);
      padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
      display: grid;
      gap: 8px;
      flex-shrink: 0;
    }
    .sticky-primary-row {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 8px;
    }
    .confirm-sticky-actions .confirm-btn,
    .confirm-sticky-actions .outline-btn {
      margin: 0 !important;
    }
    .confirm-sticky-actions .confirm-btn,
    .confirm-sticky-actions .outline-btn,
    .secondary-solid-btn,
    .cancel-btn,
    .ola-reason-chip {
      transition: transform .12s ease, box-shadow .16s ease, filter .16s ease;
    }
    .confirm-sticky-actions .confirm-btn:hover,
    .secondary-solid-btn:hover,
    .cancel-btn:hover {
      filter: brightness(1.03);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
    }
    .confirm-sticky-actions .outline-btn:hover,
    .ola-reason-chip:hover {
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
    }
    .confirm-sticky-actions .confirm-btn:active,
    .confirm-sticky-actions .outline-btn:active,
    .secondary-solid-btn:active,
    .cancel-btn:active,
    .ola-reason-chip:active {
      transform: scale(0.98);
    }
    .secondary-solid-btn {
      border: none;
      border-radius: 30px;
      padding: 12px;
      background: #0f172a;
      color: #fff;
      font-size: 0.84rem;
      font-weight: 800;
      cursor: pointer;
    }
    .secondary-solid-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    @keyframes confirm-card-in {
      0% {
        opacity: 0;
        transform: translateY(10px) scale(0.99);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes eta-shimmer {
      100% {
        transform: translateX(100%);
      }
    }
    .flex-1 { flex: 1; }
  `]
})
export class TravelComponent implements OnInit, OnDestroy {
  step = 1;
  locating = false;

  pickupLat = 0;
  pickupLng = 0;
  pickupAddress = '';
  pickupQuery = '';
  pickupSuggestions: PlaceSuggestion[] = [];
  pickupMapUrl: SafeResourceUrl | null = null;

  dropLat = 0;
  dropLng = 0;
  dropAddress = '';
  dropQuery = '';
  dropSuggestions: PlaceSuggestion[] = [];
  stopQuery = '';
  stopSuggestions: PlaceSuggestion[] = [];
  stops: StopPoint[] = [];
  recentStops: StopPoint[] = [];
  routeMapUrl: SafeResourceUrl | null = null;

  distanceKm = 0;
  etaMinutes = 0;
  selectedVehicle: VehicleOption | null = null;
  booking = false;
  bookingOtp = '';
  currentBookingId = '';
  isRideCancelled = false;
  cancelReason = '';
  cancelReasonOther = '';
  assignedCaptainName = '';
  assignedCaptainPhone = '';
  assignedCaptainRating = 4.8;
  assignedVehiclePlate = '';
  assignedCaptainKycStatus: CaptainKycStatus | '' = '';
  showOffersPanel = false;
  appliedTravelOfferCode = '';
  readonly travelOfferRules: TravelOfferRule[] = [
    { title: 'First Trip 50% OFF', code: 'FIRST50', detail: 'Valid for new users on first completed ride only.', type: 'percent', value: 50, minFare: 100, maxDiscount: 150 },
    { title: 'Night Ride 30% OFF', code: 'NIGHT30', detail: 'Available from 10 PM to 6 AM.', type: 'percent', value: 30, minFare: 120, maxDiscount: 120 },
    { title: 'City Ride 20% OFF', code: 'CAPTAIN20', detail: 'Best for premium captain assignment rides.', type: 'percent', value: 20, minFare: 100, maxDiscount: 80 },
    { title: 'Flat ₹40 OFF', code: 'PARCEL25', detail: 'Flat discount on eligible city rides.', type: 'flat', value: 40, minFare: 140 }
  ];
  readonly cancelReasonOptions = ['Taking too long', 'Changed my mind', 'Wrong location selected', 'Driver not reachable', 'Other'];

  readonly vehicleOptions: VehicleOption[] = [
    { type: 'bike', icon: '🏍️', label: 'Bike', description: 'Quick Bike rides', farePerKm: 8, etaMin: 3, capacity: 1 },
    { type: 'auto', icon: '🛺', label: 'Auto', description: 'City travel, affordable', farePerKm: 12, etaMin: 1, capacity: 3, tag: 'FASTEST' },
    { type: 'cab', icon: '🚗', label: 'Cab Economy', description: 'Comfortable ride', farePerKm: 18, etaMin: 5, capacity: 4 },
  ];

  readonly popularPlaces = [
    { name: 'Bus Stand', icon: '🚌', address: 'Bus Stand' },
    { name: 'Railway Station', icon: '🚂', address: 'Railway Station' },
    { name: 'Airport', icon: '✈️', address: 'Airport' },
    { name: 'Hospital', icon: '🏥', address: 'Hospital' },
  ];

  private readonly pickupSearch$ = new Subject<string>();
  private readonly dropSearch$ = new Subject<string>();
  private readonly stopSearch$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private zone: NgZone,
    private router: Router,
    private auth: AuthService,
    private bookingService: BookingService,
    private notifications: NotificationService,
    private userPreferences: UserPreferencesService
  ) {}

  ngOnInit(): void {
    this.loadRecentStops();
    this.detectLiveLocation();
    this.selectedVehicle = this.vehicleOptions[1];

    this.pickupSearch$
      .pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.nominatimSearch(q)))
      .subscribe(results => this.zone.run(() => this.pickupSuggestions = results));

    this.dropSearch$
      .pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.nominatimSearch(q)))
      .subscribe(results => this.zone.run(() => this.dropSuggestions = results));

    this.stopSearch$
      .pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.nominatimSearch(q)))
      .subscribe(results => this.zone.run(() => this.stopSuggestions = results));

    this.bookingService.bookings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshAssignedCaptainState());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  detectLiveLocation(): void {
    if (!navigator.geolocation) {
      this.notifications.push('Geolocation not supported.', 'warning');
      this.useFallbackLocation();
      return;
    }
    this.locating = true;
    this.pickupMapUrl = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.zone.run(() => {
          this.pickupLat = pos.coords.latitude;
          this.pickupLng = pos.coords.longitude;
          this.updatePickupMap();
          this.reverseGeocode(this.pickupLat, this.pickupLng).subscribe(addr => {
            this.zone.run(() => {
              this.pickupAddress = addr;
              this.pickupQuery = addr;
              this.locating = false;
            });
          });
        });
      },
      () => {
        this.zone.run(() => { this.useFallbackLocation(); });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  private useFallbackLocation(): void {
    this.pickupLat = 17.3850;
    this.pickupLng = 78.4867;
    this.updatePickupMap();
    this.pickupAddress = 'Hyderabad, Telangana, India';
    this.pickupQuery = this.pickupAddress;
    this.locating = false;
    this.notifications.push('Using default location. Enable GPS for live location.', 'warning');
  }

  private updatePickupMap(): void {
    const url = `https://maps.google.com/maps?q=${this.pickupLat},${this.pickupLng}&z=16&output=embed`;
    this.pickupMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private updateRouteMap(): void {
    const waypoints = this.stops
      .map(s => `${s.lat},${s.lng}`)
      .join('|');
    const waypointPart = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '';
    const url = `https://maps.google.com/maps?saddr=${this.pickupLat},${this.pickupLng}&daddr=${this.dropLat},${this.dropLng}${waypointPart}&output=embed`;
    this.routeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private reverseGeocode(lat: number, lng: number) {
    return this.http
      .get<any>(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'Accept-Language': 'en' }
      })
      .pipe(switchMap(r => of(r?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)));
  }

  private nominatimSearch(query: string) {
    if (!query || query.length < 2) return of([] as PlaceSuggestion[]);
    return this.http.get<PlaceSuggestion[]>(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6`,
      { headers: { 'Accept-Language': 'en' } }
    );
  }

  onPickupSearch(q: string): void { this.pickupSearch$.next(q); }

  selectPickup(s: PlaceSuggestion): void {
    this.pickupLat = parseFloat(s.lat);
    this.pickupLng = parseFloat(s.lon);
    this.pickupAddress = s.display_name;
    this.pickupQuery = s.display_name;
    this.pickupSuggestions = [];
    this.updatePickupMap();
  }

  confirmPickup(): void { this.step = 2; }

  onDropSearch(q: string): void { this.dropSearch$.next(q); }

  onStopSearch(q: string): void { this.stopSearch$.next(q); }

  selectDrop(s: PlaceSuggestion): void {
    this.dropLat = parseFloat(s.lat);
    this.dropLng = parseFloat(s.lon);
    this.dropAddress = s.display_name;
    this.dropQuery = s.display_name;
    this.dropSuggestions = [];
    this.storeRecentStop({ address: s.display_name, lat: this.dropLat, lng: this.dropLng });
    this.computeDistance();
    this.updateRouteMap();
    this.step = 3;
  }

  selectPopular(p: { name: string }): void {
    this.dropQuery = p.name;
    this.dropSearch$.next(p.name);
  }

  selectStopSuggestion(s: PlaceSuggestion): void {
    this.stopQuery = s.display_name;
    this.stopSuggestions = [];
    this.addStop();
  }

  useMapForDrop(): void {
    const hasDropText = !!this.dropQuery?.trim();
    const dropText = encodeURIComponent(this.dropQuery.trim());
    const origin = this.pickupLat && this.pickupLng
      ? `${this.pickupLat},${this.pickupLng}`
      : '';

    const mapsUrl = hasDropText
      ? (origin
        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${dropText}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${dropText}`)
      : (origin
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origin)}`
        : 'https://www.google.com/maps');

    if (typeof window !== 'undefined') {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    }

    this.notifications.push('Google Maps opened. Choose the drop point there, then copy/search it here.', 'info' as any);
  }

  addStop(): void {
    if (this.step === 3) {
      this.step = 2;
      this.notifications.push('Add stops from the stop field in Drop screen.', 'info');
      return;
    }

    const query = this.stopQuery.trim();
    if (!query) {
      this.notifications.push('Type stop location and tap Add stop.', 'warning');
      return;
    }

    this.nominatimSearch(query).subscribe((results) => {
      this.zone.run(() => {
        const first = results?.[0];
        if (!first) {
          this.notifications.push('Stop not found. Try a more specific location.', 'warning');
          return;
        }

        const stop: StopPoint = {
          address: first.display_name,
          lat: parseFloat(first.lat),
          lng: parseFloat(first.lon)
        };

        const exists = this.stops.some(s => s.address === stop.address);
        if (!exists) {
          this.stops.push(stop);
          this.storeRecentStop(stop);
        }

        this.stopQuery = '';
        this.stopSuggestions = [];
        this.notifications.push(`Stop added: ${this.shortName(stop.address)}`, 'success');
      });
    });
  }

  removeStop(index: number): void {
    this.stops.splice(index, 1);
    if (this.step === 3 && this.dropLat && this.dropLng) {
      this.updateRouteMap();
    }
  }

  useRecentStop(stop: StopPoint): void {
    const exists = this.stops.some(s => s.address === stop.address);
    if (!exists) {
      this.stops.push(stop);
      this.notifications.push(`Stop added: ${this.shortName(stop.address)}`, 'success');
    }
  }

  private loadRecentStops(): void {
    this.userPreferences.getTravelRecentStops()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stops) => {
          this.recentStops = Array.isArray(stops) ? stops.slice(0, 6) : [];
        },
        error: () => {
          this.recentStops = [];
        }
      });
  }

  private storeRecentStop(stop: StopPoint): void {
    this.recentStops = [stop, ...this.recentStops.filter(s => s.address !== stop.address)].slice(0, 6);
    this.userPreferences.saveTravelRecentStops(this.recentStops).subscribe({ error: () => void 0 });
  }

  private computeDistance(): void {
    const R = 6371;
    const dLat = this.toRad(this.dropLat - this.pickupLat);
    const dLng = this.toRad(this.dropLng - this.pickupLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(this.pickupLat)) * Math.cos(this.toRad(this.dropLat)) * Math.sin(dLng / 2) ** 2;
    this.distanceKm = Math.max(1, parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)));
    this.etaMinutes = Math.round((this.distanceKm / 25) * 60);
  }

  private toRad(deg: number): number { return deg * Math.PI / 180; }

  selectVehicle(v: VehicleOption): void { this.selectedVehicle = v; }

  private calculateFareBase(v: VehicleOption): number {
    return Math.round(20 + this.distanceKm * v.farePerKm);
  }

  private getTravelOfferRule(code: string): TravelOfferRule | undefined {
    const normalized = String(code || '').trim().toUpperCase();
    return this.travelOfferRules.find((rule) => rule.code === normalized);
  }

  private computeOfferDiscount(baseFare: number, code: string): number {
    const rule = this.getTravelOfferRule(code);
    if (!rule || baseFare < rule.minFare) {
      return 0;
    }

    if (rule.type === 'flat') {
      return Math.min(baseFare, rule.value);
    }

    const raw = Math.round((baseFare * rule.value) / 100);
    if (rule.maxDiscount !== undefined) {
      return Math.min(raw, rule.maxDiscount);
    }
    return raw;
  }

  getOfferDiscountForVehicle(v: VehicleOption): number {
    const base = this.calculateFareBase(v);
    return this.computeOfferDiscount(base, this.appliedTravelOfferCode);
  }

  calculateFare(v: VehicleOption): number {
    const baseFare = this.calculateFareBase(v);
    const discount = this.computeOfferDiscount(baseFare, this.appliedTravelOfferCode);
    return Math.max(0, baseFare - discount);
  }

  toggleOffersPanel(): void {
    this.showOffersPanel = !this.showOffersPanel;
  }

  claimTravelOffer(code: string): void {
    if (!code) {
      return;
    }

    const rule = this.getTravelOfferRule(code);
    if (!rule) {
      this.notifications.push('Selected offer is not available.', 'warning');
      return;
    }

    const probeVehicle = this.selectedVehicle || this.vehicleOptions[1];
    const baseFare = this.calculateFareBase(probeVehicle);
    if (baseFare < rule.minFare) {
      this.notifications.push(`You are not eligible yet. Minimum fare should be ₹${rule.minFare} for ${rule.code}.`, 'warning');
      return;
    }

    this.appliedTravelOfferCode = rule.code;
    this.notifications.push(`Offer ${rule.code} applied successfully.`, 'success');
  }

  clearTravelOffer(): void {
    this.appliedTravelOfferCode = '';
    this.notifications.push('Offer removed.', 'info');
  }

  getDropTime(etaMin: number): string {
    const d = new Date(Date.now() + (etaMin + this.etaMinutes) * 60000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  get etaProgressPercent(): number {
    const eta = this.selectedVehicle?.etaMin ?? this.etaMinutes ?? 3;
    const clamped = Math.max(1, Math.min(12, eta));
    const progress = ((12 - clamped) / 11) * 100;
    return Math.max(8, Math.min(100, Math.round(progress)));
  }

  get captainInitials(): string {
    const source = (this.assignedCaptainName || 'Captain').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'CP';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  callCaptain(): void {
    if (!this.assignedCaptainPhone) {
      this.notifications.push('Captain phone is not available yet.', 'warning');
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${this.assignedCaptainPhone}`;
    }
  }

  chatCaptain(): void {
    this.notifications.push('In-app captain chat will be available soon.', 'info');
  }

  get canCancelRide(): boolean {
    if (!this.cancelReason) {
      return false;
    }

    if (this.cancelReason === 'Other') {
      return this.cancelReasonOther.trim().length > 0;
    }

    return true;
  }

  get resolvedCancelReason(): string {
    return this.cancelReason === 'Other' ? this.cancelReasonOther.trim() : this.cancelReason;
  }

  bookRide(): void {
    if (!this.selectedVehicle) return;
    this.booking = true;
    const payload = {
      serviceType: 'ride',
      pickup: { address: this.pickupAddress, lat: this.pickupLat, lng: this.pickupLng },
      drop: { address: this.dropAddress, lat: this.dropLat, lng: this.dropLng },
      fare: this.calculateFare(this.selectedVehicle),
      vehicleType: this.selectedVehicle.type,
    } as any;

    try {
      const user = this.auth.getCurrentUser();
      const booking = this.bookingService.createBooking(
        user?.id || '',
        user?.displayName || '',
        payload
      );
      this.booking = false;
      this.currentBookingId = (booking as any)?.id || '';
      this.bookingOtp = (booking as any)?.otp || `${Math.floor(1000 + Math.random() * 9000)}`;
      this.isRideCancelled = false;
      this.cancelReason = '';
      this.cancelReasonOther = '';
      this.step = 4;
      this.refreshAssignedCaptainState();
    } catch {
      this.booking = false;
      this.currentBookingId = '';
      this.bookingOtp = `${Math.floor(1000 + Math.random() * 9000)}`;
      this.isRideCancelled = false;
      this.cancelReason = '';
      this.cancelReasonOther = '';
      this.step = 4;
      this.refreshAssignedCaptainState();
    }
  }

  cancelBookedRide(): void {
    if (!this.canCancelRide) {
      this.notifications.push('Please select a cancel reason.', 'warning');
      return;
    }

    if (!this.currentBookingId) {
      this.notifications.push('Booking reference is not available to cancel this ride.', 'warning');
      return;
    }

    const reason = this.resolvedCancelReason;
    const result = this.bookingService.cancelRide(this.currentBookingId, 'customer');
    if (!result.success) {
      this.notifications.push(result.message, 'warning');
      return;
    }

    this.isRideCancelled = true;
    this.notifications.push(`Ride cancelled. Reason: ${reason}`, 'info');
  }

  trackRide(): void { this.router.navigate(['/tracking']); }

  resetFlow(): void {
    this.step = 1;
    this.stops = [];
    this.dropAddress = '';
    this.dropQuery = '';
    this.stopQuery = '';
    this.stopSuggestions = [];
    this.dropLat = 0;
    this.dropLng = 0;
    this.routeMapUrl = null;
    this.selectedVehicle = this.vehicleOptions[1];
    this.bookingOtp = '';
    this.currentBookingId = '';
    this.isRideCancelled = false;
    this.cancelReason = '';
    this.cancelReasonOther = '';
    this.assignedCaptainName = '';
    this.assignedCaptainPhone = '';
    this.assignedCaptainRating = 4.8;
    this.assignedVehiclePlate = '';
    this.assignedCaptainKycStatus = '';
    this.showOffersPanel = false;
    this.appliedTravelOfferCode = '';
  }

  private refreshAssignedCaptainState(): void {
    if (!this.currentBookingId) {
      this.assignedCaptainName = '';
      this.assignedCaptainPhone = '';
      this.assignedCaptainRating = 4.8;
      this.assignedVehiclePlate = '';
      this.assignedCaptainKycStatus = '';
      return;
    }

    const booking = this.bookingService.getAllBookingsSnapshot().find((item) => item.id === this.currentBookingId);
    if (!booking) {
      this.assignedCaptainName = '';
      this.assignedCaptainPhone = '';
      this.assignedCaptainRating = 4.8;
      this.assignedVehiclePlate = '';
      this.assignedCaptainKycStatus = '';
      return;
    }

    this.assignedCaptainName = booking.driverName || '';
    this.assignedCaptainPhone = booking.driverPhone || '';
    this.assignedCaptainRating = this.computeCaptainRating(booking.captainId || booking.id);
    this.assignedVehiclePlate = this.computeVehiclePlate(booking.id, booking.vehicleType);
    if (!booking.captainId) {
      this.assignedCaptainKycStatus = '';
      return;
    }

    this.assignedCaptainKycStatus = this.readCaptainKycStatus(booking.captainId);
  }

  private computeCaptainRating(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const normalized = Math.abs(hash % 5);
    return 4.6 + normalized * 0.1;
  }

  private computeVehiclePlate(bookingId: string, vehicleType: string): string {
    const prefix = vehicleType === 'bike' ? 'TS09 BK' : vehicleType === 'auto' ? 'TS09 AU' : 'TS09 CB';
    let hash = 0;
    for (let i = 0; i < bookingId.length; i += 1) {
      hash = ((hash << 5) - hash + bookingId.charCodeAt(i)) | 0;
    }
    const number = 1000 + (Math.abs(hash) % 9000);
    return `${prefix} ${number}`;
  }

  private readCaptainKycStatus(captainId: string): CaptainKycStatus {
    const raw = localStorage.getItem(CAPTAIN_KYC_STORAGE_KEY);
    if (!raw) {
      return 'not_started';
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, CaptainKycFormState> | CaptainKycFormState;
      if ('userId' in (parsed as any)) {
        const legacy = parsed as CaptainKycFormState;
        return legacy.userId === captainId ? legacy.kycStatus : 'not_started';
      }
      const map = parsed as Record<string, CaptainKycFormState>;
      return map[captainId]?.kycStatus || 'not_started';
    } catch {
      return 'not_started';
    }
  }

  shortName(addr: string): string {
    if (!addr) return '';
    return addr.split(',').slice(0, 2).join(',').trim();
  }
}
