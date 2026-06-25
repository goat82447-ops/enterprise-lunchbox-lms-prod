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
        <div class="confirm-icon">🎉</div>
        <h4 class="confirm-title">Ride Booked!</h4>
        <p class="confirm-sub">Your {{ selectedVehicle?.label }} is on the way</p>

        <div class="driver-verify-banner" *ngIf="assignedCaptainName">
          <span class="driver-name">Captain: {{ assignedCaptainName }}</span>
          <span class="driver-verified-pill" *ngIf="assignedCaptainKycStatus === 'verified'">Verified Driver</span>
        </div>
        <div class="driver-verify-note" *ngIf="assignedCaptainName && assignedCaptainKycStatus !== 'verified'">
          Captain assigned. Verified badge will appear only after admin approval.
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
            <span class="cr-label">Distance</span>
            <span class="cr-val">{{ distanceKm }} km</span>
          </div>
          <div class="confirm-row">
            <span class="cr-label">Fare</span>
            <span class="cr-val text-danger fw-bold">₹{{ selectedVehicle ? calculateFare(selectedVehicle) : 0 }}</span>
          </div>
          <div class="confirm-row">
            <span class="cr-label">OTP</span>
            <span class="cr-val fw-bold fs-4 text-success letter-spacing-wide">{{ bookingOtp }}</span>
          </div>
        </div>

        <p class="text-muted small mb-3 text-center">Share this OTP with your captain when they arrive</p>
        <div class="cancel-card" *ngIf="!isRideCancelled">
          <div class="cancel-title">Need to cancel this ride?</div>
          <div class="cancel-sub">Select a reason so we can improve your experience.</div>
          <select class="cancel-select" [(ngModel)]="cancelReason">
            <option value="">Select cancel reason</option>
            <option *ngFor="let reason of cancelReasonOptions" [value]="reason">{{ reason }}</option>
          </select>
          <input
            *ngIf="cancelReason === 'Other'"
            class="cancel-input"
            placeholder="Type your cancel reason"
            [(ngModel)]="cancelReasonOther"
          />
          <button class="cancel-btn" [disabled]="!canCancelRide" (click)="cancelBookedRide()">Cancel Ride</button>
        </div>

        <div class="cancelled-note" *ngIf="isRideCancelled">
          Ride cancelled. Reason: {{ resolvedCancelReason }}
        </div>

        <button class="confirm-btn mb-2" [disabled]="isRideCancelled" (click)="trackRide()">📍 Track Ride</button>
        <button class="outline-btn" (click)="resetFlow()">Book Another Ride</button>
      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .travel-shell {
      height: 100dvh; display: flex; flex-direction: column;
      background: #f8f9fa; overflow: hidden;
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
      font-size: 15px; outline: none; font-weight: 600;
    }
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

    .cancel-card {
      width: 100%;
      border: 1px solid #fee2e2;
      background: #fff7f7;
      border-radius: 14px;
      padding: 12px;
      margin-bottom: 10px;
    }

    .cancel-title {
      font-size: 13px;
      font-weight: 700;
      color: #991b1b;
      margin-bottom: 2px;
    }

    .cancel-sub {
      font-size: 12px;
      color: #7f1d1d;
      margin-bottom: 8px;
    }

    .cancel-select,
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
      padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .section-title { font-size: 14px; font-weight: 700; color: #222; }
    .popular-grid { display: flex; gap: 10px; flex-wrap: wrap; padding-bottom: 10px; }
    .popular-card {
      border: 1px solid #eee; border-radius: 12px; padding: 10px 14px;
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; background: #fff; font-size: 13px; font-weight: 600;
    }
      .pop-arrow {
        background: #f9a825; border-radius: 50%; width: 22px; height: 22px;
        display: flex; align-items: center; justify-content: center; font-size: 14px;
      }

      /* ── Improved contrast for Recent Stops & Popular Places ── */
      .popular-card {
        color: #000;               /* Ensure dark text for the whole card */
      }
      .popular-card .fw-semibold {
        color: #000;               /* Dark heading (place name) */
      }
      .popular-card .small {
        color: #555;               /* Slightly lighter but still high‑contrast description */
      }
      .popular-card span {
        color: #000;               /* Dark icons / arrows */
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
    .dist-label { font-size: 12px; color: #666; font-weight: 600; }
    .vehicle-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 8px; border-radius: 14px; border: 2px solid transparent;
      cursor: pointer; transition: border-color .15s, background .15s; margin-bottom: 4px;
    }
    .vehicle-card.selected { border-color: #1a6e32; background: #f0fdf4; }
    .veh-icon { font-size: 30px; width: 48px; text-align: center; flex-shrink: 0; }
    .veh-info { flex: 1; }
    .veh-name { font-size: 15px; font-weight: 700; }
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
      border-radius: 20px; padding: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
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
      display: flex; flex-direction: column; align-items: center;
      justify-content: flex-start; padding: 32px 20px 24px;
      background: #fff; overflow-y: auto; height: 100%;
    }
    .confirm-icon { font-size: 64px; margin-bottom: 8px; }
    .confirm-title { font-size: 24px; font-weight: 800; color: #111; margin-bottom: 4px; }
    .confirm-sub { font-size: 14px; color: #666; margin-bottom: 20px; }
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
    .driver-name { font-size: 12px; font-weight: 700; color: #1f2937; }
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
      width: 100%; border: 1px solid #eee; border-radius: 16px;
      padding: 16px; margin-bottom: 16px; background: #fafafa;
    }
    .confirm-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #f0f0f0;
    }
    .confirm-row:last-child { border-bottom: none; }
    .cr-label { font-size: 12px; color: #888; font-weight: 600; }
    .cr-val { font-size: 13px; color: #222; font-weight: 600; max-width: 55%; text-align: right; }
    .letter-spacing-wide { letter-spacing: 4px; }
    .flex-1 { flex: 1; }
  `]
})
export class TravelComponent implements OnInit, OnDestroy {
  private static readonly RECENT_STOPS_KEY = 'travel_recent_stops';

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
    private notifications: NotificationService
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
    try {
      const raw = localStorage.getItem(TravelComponent.RECENT_STOPS_KEY);
      if (!raw) {
        this.recentStops = [];
        return;
      }

      const parsed = JSON.parse(raw) as StopPoint[];
      this.recentStops = Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      this.recentStops = [];
    }
  }

  private storeRecentStop(stop: StopPoint): void {
    this.recentStops = [stop, ...this.recentStops.filter(s => s.address !== stop.address)].slice(0, 6);
    try {
      localStorage.setItem(TravelComponent.RECENT_STOPS_KEY, JSON.stringify(this.recentStops));
    } catch {
      // Ignore storage failures.
    }
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
    this.assignedCaptainKycStatus = '';
    this.showOffersPanel = false;
    this.appliedTravelOfferCode = '';
  }

  private refreshAssignedCaptainState(): void {
    if (!this.currentBookingId) {
      this.assignedCaptainName = '';
      this.assignedCaptainKycStatus = '';
      return;
    }

    const booking = this.bookingService.getAllBookingsSnapshot().find((item) => item.id === this.currentBookingId);
    if (!booking) {
      this.assignedCaptainName = '';
      this.assignedCaptainKycStatus = '';
      return;
    }

    this.assignedCaptainName = booking.driverName || '';
    if (!booking.captainId) {
      this.assignedCaptainKycStatus = '';
      return;
    }

    this.assignedCaptainKycStatus = this.readCaptainKycStatus(booking.captainId);
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
