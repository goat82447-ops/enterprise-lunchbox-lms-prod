import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';

type TravelMode = 'normal' | 'women' | 'teen' | 'later' | 'others';

interface PlaceSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface VehicleOption {
  type: string;
  emoji: string;
  label: string;
  description: string;
  farePerKm: number;
  baseKm: number;
  etaMin: number;
  capacity: number;
  tag?: string;
  color: string;
}

const MODE_CONFIG: Record<TravelMode, { label: string; badge: string; badgeColor: string; badgeBg: string; icon: string; hint: string }> = {
  normal: { label: 'Plan your ride',         badge: '',                    badgeColor: '',        badgeBg: '',        icon: '🏍️', hint: '' },
  women:  { label: 'Women Safety Mode',      badge: '🛡️ Women Safety',    badgeColor: '#880e4f', badgeBg: '#fce4ec', icon: '🛡️', hint: 'Only top-verified captains are assigned for your safety.' },
  teen:   { label: 'Teen Ride Mode',         badge: '🧒 Teen Mode',        badgeColor: '#1565c0', badgeBg: '#e3f2fd', icon: '🧒', hint: 'Parent contact required. Verified captains only.' },
  later:  { label: 'Schedule a Ride',        badge: '⏰ Later Booking',    badgeColor: '#e65100', badgeBg: '#fff3e0', icon: '⏰', hint: 'Pick a future date & time for your ride.' },
  others: { label: 'Book for Someone Else',  badge: '👥 Book for Others',  badgeColor: '#2e7d32', badgeBg: '#e8f5e9', icon: '👥', hint: 'Enter the passenger\'s name and contact below.' },
};

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="tx-shell">

  <!-- ═══════ STEP 1 — PICKUP ═══════ -->
  <ng-container *ngIf="step === 1">
    <!-- Top bar -->
    <div class="tx-topbar">
      <button class="tx-back" (click)="goBack()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="tx-topbar-title">{{ modeConfig.label }}</span>
        <span *ngIf="modeConfig.badge" class="tx-mode-badge"
          [style.background]="modeConfig.badgeBg"
          [style.color]="modeConfig.badgeColor">{{ modeConfig.badge }}</span>
    </div>

    <!-- Map -->
    <div class="tx-map">
      <iframe *ngIf="pickupMapUrl" [src]="pickupMapUrl" width="100%" height="100%" frameborder="0" loading="lazy"></iframe>
      <div *ngIf="!pickupMapUrl" class="tx-map-loading">
        <div class="tx-spinner"></div>
        <span>Locating you…</span>
      </div>
      <div class="tx-pin-label" *ngIf="pickupMapUrl">
        <div class="tx-pin-dot"></div>
        <span>Pickup Point</span>
      </div>
      <button class="tx-gps-btn" (click)="detectLiveLocation()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      </button>
    </div>

    <!-- Bottom panel -->
    <div class="tx-panel">
      <div class="tx-handle"></div>

      <div *ngIf="locating" class="tx-loading-row">
        <div class="tx-spinner tx-spinner-sm"></div>
        <span class="tx-loading-text">Detecting your location…</span>
      </div>

      <div *ngIf="!locating">
        <p class="tx-section-label">Pickup location</p>

        <!-- Pickup address display -->
        <div class="tx-location-row mb-3">
          <div class="tx-dot tx-dot-green"></div>
          <div class="tx-location-text">{{ pickupAddress || 'Detecting…' }}</div>
        </div>

        <!-- Search box -->
        <div class="tx-searchbar mb-2">
          <svg class="tx-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="tx-search-input" [(ngModel)]="pickupQuery"
            (ngModelChange)="onPickupSearch($event)" placeholder="Search pickup point…" />
          <button *ngIf="pickupQuery" class="tx-clear" (click)="pickupQuery=''; pickupSuggestions=[]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Suggestions -->
        <div *ngIf="pickupSuggestions.length" class="tx-suggestions mb-2">
          <div class="tx-sug-item" *ngFor="let s of pickupSuggestions" (click)="selectPickup(s)">
            <div class="tx-sug-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="tx-sug-body">
              <div class="tx-sug-main">{{ shortName(s.display_name) }}</div>
              <div class="tx-sug-sub">{{ s.display_name }}</div>
            </div>
          </div>
        </div>

        <button class="tx-btn-primary" [disabled]="!pickupAddress" (click)="confirmPickup()">
          Confirm Pickup
        </button>
      </div>
    </div>
  </ng-container>
  <ng-container *ngIf="step === 2">
    <div class="tx-drop-screen">
      <!-- Header -->
      <div class="tx-drop-header">
        <button class="tx-back" (click)="step=1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="tx-topbar-title">Where to?</span>
        <div class="tx-for-me">For me ▾</div>
      </div>

      <!-- Route pills -->
      <div class="tx-route-card">
        <div class="tx-route-row">
          <div class="tx-dot tx-dot-green"></div>
          <span class="tx-route-addr">{{ shortName(pickupAddress) }}</span>
        </div>
        <div class="tx-route-line"></div>
        <div class="tx-route-row">
          <div class="tx-dot tx-dot-orange"></div>
          <input class="tx-route-input" [(ngModel)]="dropQuery"
            (ngModelChange)="onDropSearch($event)" placeholder="Enter destination…" autofocus />
          <button *ngIf="dropQuery" class="tx-clear" (click)="dropQuery=''; dropSuggestions=[]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Action chips -->
      <div class="tx-chip-row">
        <button class="tx-chip" (click)="useMapForDrop()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Select on map
        </button>
        <button class="tx-chip" (click)="addStop()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add stop
        </button>
      </div>

      <!-- Suggestions -->
      <div *ngIf="dropSuggestions.length" class="tx-suggestions tx-suggestions-drop">
        <div class="tx-sug-item" *ngFor="let s of dropSuggestions" (click)="selectDrop(s)">
          <div class="tx-sug-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="tx-sug-body">
            <div class="tx-sug-main">{{ shortName(s.display_name) }}</div>
            <div class="tx-sug-sub">{{ s.display_name }}</div>
          </div>
          <button class="tx-fav" (click)="$event.stopPropagation(); toggleFavourite(s)">
            <svg width="18" height="18" viewBox="0 0 24 24"
              [attr.fill]="isFavourite(s) ? '#e53935' : 'none'"
              [attr.stroke]="isFavourite(s) ? '#e53935' : '#ccc'"
              stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Favourite places -->
      <div *ngIf="!dropSuggestions.length && dropQuery.length < 2 && favouritePlaces.length" class="tx-favs-section">
        <p class="tx-section-label px-16">❤️ Saved Places</p>
        <div class="tx-fav-list">
          <div class="tx-fav-item" *ngFor="let f of favouritePlaces" (click)="selectFavourite(f)">
            <div class="tx-fav-item-icon" [style.background]="f.color + '18'">{{ f.icon }}</div>
            <div class="tx-fav-item-body">
              <div class="tx-fav-item-name">{{ f.label }}</div>
              <div class="tx-fav-item-addr">{{ shortName(f.display_name) }}</div>
            </div>
            <button class="tx-fav-remove" (click)="$event.stopPropagation(); removeFavourite(f)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Popular places — dynamic from GPS -->
      <div *ngIf="!dropSuggestions.length && dropQuery.length < 2" class="tx-popular">
        <div class="tx-popular-header px-16">
          <p class="tx-section-label mb-0">📍 Nearby Popular Places</p>
          <span *ngIf="popularLoading" class="tx-pop-loading">
            <span class="tx-pop-spinner"></span> Fetching…
          </span>
          <span *ngIf="!popularLoading && popularPlaces.length" class="tx-pop-count">{{ popularPlaces.length }} found</span>
        </div>
        <!-- Loading skeletons -->
        <div *ngIf="popularLoading" class="tx-popular-scroll">
          <div class="tx-pop-skeleton" *ngFor="let i of [1,2,3,4]"></div>
        </div>
        <!-- Dynamic place cards -->
        <div *ngIf="!popularLoading && popularPlaces.length" class="tx-popular-scroll">
          <div class="tx-pop-card" *ngFor="let p of popularPlaces" (click)="selectPopularPlace(p)">
            <div class="tx-pop-icon">{{ p.icon }}</div>
            <div class="tx-pop-body">
              <span class="tx-pop-name">{{ p.name }}</span>
              <span class="tx-pop-dist" *ngIf="p.distKm">{{ p.distKm }} km</span>
            </div>
            <div class="tx-pop-arrow">›</div>
          </div>
        </div>
        <!-- Fallback if no places found -->
        <div *ngIf="!popularLoading && !popularPlaces.length" class="tx-pop-empty">
          <span>Could not load nearby places. Check internet connection.</span>
        </div>
      </div>
    </div>
  </ng-container>

  <!-- ═══════ STEP 3 — VEHICLE SELECTION ═══════ -->
  <ng-container *ngIf="step === 3">
    <!-- Map with route -->
    <div class="tx-map tx-map-route">
      <iframe *ngIf="routeMapUrl" [src]="routeMapUrl" width="100%" height="100%" frameborder="0" loading="lazy"></iframe>
      <!-- floating top bar -->
      <div class="tx-route-floatbar">
        <button class="tx-float-btn" (click)="step=2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="tx-float-route">
          <span class="tx-float-chip">{{ shortName(pickupAddress) }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          <span class="tx-float-chip">{{ shortName(dropAddress) }}</span>
        </div>
        <button class="tx-float-btn tx-float-edit" (click)="step=2">✏️</button>
      </div>
    </div>

    <!-- Bottom sheet -->
    <div class="tx-panel tx-panel-vehicle">
      <div class="tx-handle"></div>

      <!-- Distance & ETA summary -->
      <div class="tx-trip-summary">
        <div class="tx-trip-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
          <span>{{ distanceKm }} km</span>
        </div>
        <div class="tx-trip-divider"></div>
        <div class="tx-trip-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>~{{ etaMinutes }} min</span>
        </div>
        <div class="tx-trip-divider"></div>
        <div class="tx-trip-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>{{ shortName(dropAddress) }}</span>
        </div>
      </div>

      <p class="tx-section-label mb-2">Choose a ride</p>

      <!-- Vehicle cards -->
      <div class="tx-vehicles">
        <div
          class="tx-vehicle-card"
          *ngFor="let v of vehicleOptions"
          [class.tx-vehicle-selected]="selectedVehicle?.type === v.type"
          (click)="selectVehicle(v)"
        >
          <div class="tx-veh-left">
            <div class="tx-veh-emoji" [style.background]="v.color + '18'">{{ v.emoji }}</div>
            <div class="tx-veh-info">
              <div class="tx-veh-name">
                {{ v.label }}
                <span class="tx-veh-tag" *ngIf="v.tag" [style.background]="v.color + '20'" [style.color]="v.color">{{ v.tag }}</span>
              </div>
              <div *ngIf="mode === 'women'" class="tx-veh-women-badge">🛡️ Women Safety Verified</div>
              <div class="tx-veh-meta">{{ v.etaMin }} min • {{ v.capacity }} seat(s) • {{ v.description }}</div>
            </div>
          </div>
          <div class="tx-veh-right">
            <div class="tx-veh-fare">₹{{ calculateFare(v) }}</div>
            <div class="tx-veh-drop">Drop {{ getDropTime(v.etaMin) }}</div>
          </div>
        </div>
      </div>

      <!-- Payment row -->
      <div class="tx-payment-row">
        <button class="tx-pay-chip" (click)="openPaymentSheet()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          {{ selectedPaymentLabel }} ›
        </button>
        <button class="tx-pay-chip tx-pay-chip-offer" (click)="openOffersSheet()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span *ngIf="!appliedOffer">Offers ›</span>
          <span *ngIf="appliedOffer" class="tx-offer-applied-label">{{ appliedOffer.code }} ✓</span>
        </button>
      </div>

      <button
        class="tx-btn-primary"
        [disabled]="!selectedVehicle"
        (click)="openConfirmSheet()"
      >
        Proceed to Book
      </button>
    </div>
  </ng-container>

  <!-- ═══════ STEP 4 — CONFIRM RIDE BOTTOM SHEET ═══════ -->
  <ng-container *ngIf="step === 4">
    <div class="tx-map tx-map-route">
      <iframe *ngIf="routeMapUrl" [src]="routeMapUrl" width="100%" height="100%" frameborder="0" loading="lazy"></iframe>
    </div>

    <div class="tx-panel tx-panel-confirm">
      <div class="tx-handle"></div>

      <div class="tx-confirm-header">
        <div class="tx-confirm-vehicle-icon" [style.background]="selectedVehicle!.color + '18'">
          {{ selectedVehicle?.emoji }}
        </div>
        <div>
          <div class="tx-confirm-veh-name">{{ selectedVehicle?.label }}</div>
          <div class="tx-confirm-veh-sub">{{ selectedVehicle?.description }} • {{ selectedVehicle?.capacity }} seat(s)</div>
        </div>
        <div class="tx-confirm-fare-big">₹{{ selectedVehicle ? calculateFare(selectedVehicle) : 0 }}</div>
      </div>

      <div class="tx-confirm-route">
        <div class="tx-cr-row">
          <div class="tx-cr-dot tx-cr-dot-green"></div>
          <div class="tx-cr-info">
            <div class="tx-cr-label">Pickup</div>
            <div class="tx-cr-val">{{ shortName(pickupAddress) }}</div>
          </div>
        </div>
        <div class="tx-cr-line"></div>
        <div class="tx-cr-row">
          <div class="tx-cr-dot tx-cr-dot-orange"></div>
          <div class="tx-cr-info">
            <div class="tx-cr-label">Drop</div>
            <div class="tx-cr-val">{{ shortName(dropAddress) }}</div>
          </div>
        </div>
      </div>

      <div class="tx-confirm-stats">
        <div class="tx-cs-item">
          <div class="tx-cs-val">{{ distanceKm }} km</div>
          <div class="tx-cs-key">Distance</div>
        </div>
        <div class="tx-cs-divider"></div>
        <div class="tx-cs-item">
          <div class="tx-cs-val">~{{ etaMinutes }} min</div>
          <div class="tx-cs-key">Est. travel</div>
        </div>
        <div class="tx-cs-divider"></div>
        <div class="tx-cs-item">
          <div class="tx-cs-val">{{ getDropTime(selectedVehicle?.etaMin || 0) }}</div>
          <div class="tx-cs-key">Drop time</div>
        </div>
        <div class="tx-cs-divider"></div>
        <div class="tx-cs-item">
          <div class="tx-cs-val">{{ selectedPaymentLabel }}</div>
          <div class="tx-cs-key">Payment</div>
        </div>
      </div>

      <!-- ── Mode-specific extra fields ── -->

      <!-- Women Safety: prominent banner -->
      <div *ngIf="mode === 'women'" class="tx-women-banner">
        <div class="tx-women-banner-left">
          <div class="tx-women-icon">♀</div>
          <div>
            <div class="tx-women-title">Women Safety Mode Active</div>
            <div class="tx-women-sub">Only verified, top-rated captains assigned</div>
          </div>
        </div>
        <div class="tx-women-shield">🛡️</div>
      </div>

      <!-- Teen Ride: parent contact -->
      <div *ngIf="mode === 'teen'" class="tx-mode-fields">
        <div class="tx-mode-info" style="background:#e3f2fd;border-color:#90caf9;">
          <span>🧒</span><span>Parent/Guardian contact required for teen safety.</span>
        </div>
        <label class="tx-field-label">Parent / Guardian Contact *</label>
        <div class="tx-searchbar mb-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.8h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 5.56 5.59l1.68-1.68a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <input class="tx-search-input" [(ngModel)]="parentContact" placeholder="Parent phone number" type="tel" />
        </div>
      </div>

      <!-- Later Booking: date + time picker -->
      <div *ngIf="mode === 'later'" class="tx-mode-fields">
        <div class="tx-mode-info" style="background:#fff3e0;border-color:#ffcc80;">
          <span>⏰</span><span>Schedule a pickup for a future time.</span>
        </div>
        <div class="tx-datetime-row">
          <div class="tx-datetime-item">
            <label class="tx-field-label">Date *</label>
            <input class="tx-datetime-input" type="date" [(ngModel)]="scheduleDate" [min]="minScheduleDate" />
          </div>
          <div class="tx-datetime-item">
            <label class="tx-field-label">Time *</label>
            <input class="tx-datetime-input" type="time" [(ngModel)]="scheduleTime" />
          </div>
        </div>
      </div>

      <!-- Book for Others: passenger details -->
      <div *ngIf="mode === 'others'" class="tx-mode-fields">
        <div class="tx-mode-info" style="background:#e8f5e9;border-color:#a5d6a7;">
          <span>👥</span><span>Enter the passenger details below.</span>
        </div>
        <label class="tx-field-label">Passenger Name *</label>
        <div class="tx-searchbar mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <input class="tx-search-input" [(ngModel)]="passengerName" placeholder="Passenger full name" />
        </div>
        <label class="tx-field-label">Passenger Phone *</label>
        <div class="tx-searchbar mb-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.8h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 5.56 5.59l1.68-1.68a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <input class="tx-search-input" [(ngModel)]="passengerPhone" placeholder="Passenger phone number" type="tel" />
        </div>
      </div>

      <div class="tx-btn-row">
        <button class="tx-btn-outline" (click)="step=3">Change Ride</button>
        <button class="tx-btn-confirm" [disabled]="booking || !modeFieldsValid" (click)="bookRide()">
          <span *ngIf="!booking">Confirm Ride</span>
          <span *ngIf="booking" class="tx-booking-loader">
            <span class="tx-dot-pulse"></span> Booking…
          </span>
        </button>
      </div>
    </div>
  </ng-container>

  <!-- ═══════ STEP 5 — RIDE CONFIRMED ═══════ -->
  <ng-container *ngIf="step === 5">
    <div class="tx-success-screen">
      <div class="tx-success-anim">
        <div class="tx-success-ring"></div>
        <div class="tx-success-emoji">{{ selectedVehicle?.emoji }}</div>
      </div>

      <h2 class="tx-success-title">Ride Booked!</h2>
      <p class="tx-success-sub">Your {{ selectedVehicle?.label }} is on the way</p>

      <!-- Captain ETA chip -->
      <div class="tx-eta-chip">
        <span class="tx-eta-dot"></span>
        Captain arriving in ~{{ selectedVehicle?.etaMin || 3 }} min
      </div>

      <div class="tx-otp-card">
        <div class="tx-otp-label">Share with captain on arrival</div>
        <div class="tx-otp-value">{{ bookingOtp }}</div>
        <div class="tx-otp-hint">OTP</div>
      </div>

      <div class="tx-success-card">
        <div class="tx-sc-row">
          <div class="tx-sc-dot tx-sc-dot-green"></div>
          <div>
            <div class="tx-sc-label">Pickup</div>
            <div class="tx-sc-val">{{ shortName(pickupAddress) }}</div>
          </div>
        </div>
        <div class="tx-sc-line"></div>
        <div class="tx-sc-row">
          <div class="tx-sc-dot tx-sc-dot-orange"></div>
          <div>
            <div class="tx-sc-label">Drop</div>
            <div class="tx-sc-val">{{ shortName(dropAddress) }}</div>
          </div>
        </div>
        <div class="tx-sc-divider"></div>
        <div class="tx-sc-stats">
          <div>
            <div class="tx-sc-stat-val">{{ distanceKm }} km</div>
            <div class="tx-sc-stat-key">Distance</div>
          </div>
          <div>
            <div class="tx-sc-stat-val tx-fare-val">₹{{ selectedVehicle ? calculateFare(selectedVehicle) : 0 }}</div>
            <div class="tx-sc-stat-key">Est. fare</div>
          </div>
          <div>
            <div class="tx-sc-stat-val">{{ selectedVehicle?.label }}</div>
            <div class="tx-sc-stat-key">Vehicle</div>
          </div>
        </div>
      </div>

      <button class="tx-btn-primary mb-3" (click)="trackRide()">📍 Track My Ride</button>
      <button class="tx-btn-cancel-ride" (click)="openCancelConfirm()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Cancel Ride
      </button>
      <button class="tx-btn-ghost" (click)="resetFlow()">Book Another Ride</button>
    </div>
  </ng-container>

  <!-- ═══════ CANCEL RIDE CONFIRM ═══════ -->
  <div class="tx-overlay" *ngIf="showCancelConfirm" (click)="showCancelConfirm=false">
    <div class="tx-sheet-popup tx-cancel-sheet" (click)="$event.stopPropagation()">
      <div class="tx-cancel-icon">⚠️</div>
      <h3 class="tx-cancel-title">Cancel this ride?</h3>
      <p class="tx-cancel-sub">Your captain has been notified. Frequent cancellations may affect your rating.</p>

      <div class="tx-cancel-reason-label">Reason for cancellation</div>
      <div class="tx-cancel-reasons">
        <div class="tx-cancel-reason"
          *ngFor="let r of cancelReasons"
          [class.tx-reason-selected]="selectedCancelReason === r"
          (click)="selectedCancelReason = r">
          {{ r }}
        </div>
      </div>

      <div class="tx-cancel-actions">
        <button class="tx-btn-outline" (click)="showCancelConfirm=false">Keep Ride</button>
        <button class="tx-btn-cancel-confirm"
          [disabled]="!selectedCancelReason || cancelling"
          (click)="confirmCancelRide()">
          <span *ngIf="!cancelling">Yes, Cancel</span>
          <span *ngIf="cancelling">Cancelling…</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ═══════ RIDE CANCELLED SCREEN ═══════ -->
  <ng-container *ngIf="step === 6">
    <div class="tx-success-screen">
      <div class="tx-cancelled-icon">🚫</div>
      <h2 class="tx-success-title" style="color:#e53935">Ride Cancelled</h2>
      <p class="tx-success-sub">Your ride has been cancelled successfully</p>

      <div class="tx-cancelled-card">
        <div class="tx-cc-row">
          <span class="tx-cc-label">Reason</span>
          <span class="tx-cc-val">{{ selectedCancelReason }}</span>
        </div>
        <div class="tx-cc-row">
          <span class="tx-cc-label">Vehicle</span>
          <span class="tx-cc-val">{{ selectedVehicle?.emoji }} {{ selectedVehicle?.label }}</span>
        </div>
        <div class="tx-cc-row">
          <span class="tx-cc-label">Cancellation fee</span>
          <span class="tx-cc-val tx-free-val">Free</span>
        </div>
      </div>

      <p class="tx-cancel-note">No charges applied. You can book a new ride anytime.</p>
      <button class="tx-btn-primary mb-3" (click)="resetFlow()">Book a New Ride</button>
      <button class="tx-btn-ghost" (click)="goBack()">Go to Services</button>
    </div>
  </ng-container>

  <!-- ═══════ MAP PICKER OVERLAY ═══════ -->
  <div class="tx-map-picker-overlay" *ngIf="showMapPicker">
    <!-- Full screen OSM map iframe — user pans by scrolling/dragging -->
    <div class="tx-map-picker-map">
      <iframe
        *ngIf="mapPickerUrl"
        [src]="mapPickerUrl"
        width="100%" height="100%"
        frameborder="0" loading="lazy"
      ></iframe>
      <!-- Fixed centre crosshair pin -->
      <div class="tx-map-picker-pin">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24S32 27 32 16C32 7.163 24.837 0 16 0z" fill="#e53935"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
      </div>
    </div>

    <!-- Top bar -->
    <div class="tx-map-picker-top">
      <button class="tx-back" (click)="closeMapPicker()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="tx-topbar-title">Select Drop Location</span>
    </div>

    <!-- Bottom confirm bar -->
    <div class="tx-map-picker-bottom">
      <div class="tx-map-picker-addr">
        <div class="tx-dot tx-dot-orange" style="flex-shrink:0"></div>
        <span *ngIf="!mapPickerResolving">{{ mapPickerAddress || 'Move map to set location' }}</span>
        <span *ngIf="mapPickerResolving" style="color:#aaa">Detecting address…</span>
      </div>

      <!-- GPS re-centre -->
      <button class="tx-map-picker-gps" (click)="centreMapPickerOnGps()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      </button>

      <p class="tx-map-picker-hint">Pan the map to place the pin on your drop point</p>

      <div class="tx-map-picker-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input class="tx-search-input" [(ngModel)]="mapPickerQuery"
          (ngModelChange)="onMapPickerSearch($event)"
          placeholder="Or search a location…" />
      </div>
      <div *ngIf="mapPickerSuggestions.length" class="tx-map-picker-suggestions">
        <div class="tx-sug-item" *ngFor="let s of mapPickerSuggestions" (click)="confirmMapPickerSelection(s)">
          <div class="tx-sug-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="tx-sug-body">
            <div class="tx-sug-main">{{ shortName(s.display_name) }}</div>
            <div class="tx-sug-sub">{{ s.display_name }}</div>
          </div>
        </div>
      </div>

      <button class="tx-btn-primary" [disabled]="!mapPickerAddress" (click)="confirmMapPickerDrop()">
        Set as Drop Point
      </button>
    </div>
  </div>

  <!-- ═══════ SAVE FAVOURITE LABEL SHEET ═══════ -->
  <div class="tx-overlay" *ngIf="showSaveFavSheet" (click)="showSaveFavSheet=false">
    <div class="tx-sheet-popup" (click)="$event.stopPropagation()">
      <div class="tx-sheet-header">
        <span class="tx-sheet-title">Save as Favourite</span>
        <button class="tx-sheet-close" (click)="showSaveFavSheet=false">✕</button>
      </div>
      <p class="tx-fav-save-addr">{{ shortName(pendingFavSuggestion?.display_name || '') }}</p>
      <p class="tx-section-label mb-8">Choose a label</p>
      <div class="tx-fav-label-grid">
        <button class="tx-fav-label-btn" *ngFor="let l of favLabels"
          [class.tx-fav-label-selected]="pendingFavLabel === l.label"
          (click)="pendingFavLabel = l.label; pendingFavIcon = l.icon; pendingFavColor = l.color">
          <span class="tx-fav-label-icon">{{ l.icon }}</span>
          <span>{{ l.label }}</span>
        </button>
      </div>
      <button class="tx-btn-primary mt-12" [disabled]="!pendingFavLabel" (click)="saveFavourite()">
        Save Place
      </button>
    </div>
  </div>

  <!-- ═══════ PAYMENT METHOD SHEET ═══════ -->
  <div class="tx-overlay" *ngIf="showPaymentSheet" (click)="showPaymentSheet=false">
    <div class="tx-sheet-popup" (click)="$event.stopPropagation()">
      <div class="tx-sheet-header">
        <span class="tx-sheet-title">Choose Payment</span>
        <button class="tx-sheet-close" (click)="showPaymentSheet=false">✕</button>
      </div>
      <div class="tx-pay-options">
        <div class="tx-pay-option" *ngFor="let p of paymentMethods"
          [class.tx-pay-selected]="selectedPayment === p.id"
          (click)="selectPayment(p)">
          <div class="tx-pay-opt-icon" [style.background]="p.color + '18'">{{ p.icon }}</div>
          <div class="tx-pay-opt-body">
            <div class="tx-pay-opt-name">{{ p.label }}</div>
            <div class="tx-pay-opt-sub">{{ p.sub }}</div>
          </div>
          <div class="tx-pay-opt-check" *ngIf="selectedPayment === p.id">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
      </div>
      <button class="tx-btn-primary mt-12" (click)="confirmPayment()">Confirm Payment Method</button>
    </div>
  </div>

  <!-- ═══════ OFFERS SHEET ═══════ -->
  <div class="tx-overlay" *ngIf="showOffersSheet" (click)="showOffersSheet=false">
    <div class="tx-sheet-popup" (click)="$event.stopPropagation()">
      <div class="tx-sheet-header">
        <span class="tx-sheet-title">Offers & Promo Codes</span>
        <button class="tx-sheet-close" (click)="showOffersSheet=false">✕</button>
      </div>

      <!-- Promo input -->
      <div class="tx-promo-row mb-12">
        <div class="tx-searchbar tx-promo-input">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          <input class="tx-search-input" [(ngModel)]="promoInput" placeholder="Enter promo code" style="text-transform:uppercase" />
          <button *ngIf="promoInput" class="tx-clear" (click)="promoInput=''">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <button class="tx-apply-btn" (click)="applyPromoCode()">Apply</button>
      </div>

      <!-- Promo error/success -->
      <div *ngIf="promoMessage" class="tx-promo-msg" [class.tx-promo-success]="promoSuccess" [class.tx-promo-error]="!promoSuccess">
        {{ promoMessage }}
      </div>

      <!-- Offer cards -->
      <p class="tx-section-label mb-8">Available Offers</p>
      <div class="tx-offer-list">
        <div class="tx-offer-card" *ngFor="let o of availableOffers"
          [class.tx-offer-applied]="appliedOffer?.code === o.code"
          (click)="applyOffer(o)">
          <div class="tx-offer-left">
            <div class="tx-offer-tag" [style.background]="o.color + '18'" [style.color]="o.color">{{ o.icon }}</div>
            <div>
              <div class="tx-offer-code">{{ o.code }}</div>
              <div class="tx-offer-desc">{{ o.description }}</div>
              <div class="tx-offer-save">Save ₹{{ o.discount }}</div>
            </div>
          </div>
          <div *ngIf="appliedOffer?.code === o.code" class="tx-offer-check">✓ Applied</div>
          <div *ngIf="appliedOffer?.code !== o.code" class="tx-offer-apply-btn">Tap to apply</div>
        </div>
      </div>

      <button *ngIf="appliedOffer" class="tx-btn-outline mt-12" (click)="removeOffer()">Remove Offer</button>
    </div>
  </div>

</div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; }

    /* ── SHELL ── */
    .tx-shell {
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: #fff;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* ── TOP BAR ── */
    .tx-topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px 10px;
      background: #fff;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
      z-index: 10;
    }
    .tx-topbar-title { font-size: 17px; font-weight: 700; color: #111; }
    .tx-back {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1.5px solid #e8e8e8; background: #fafafa;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; color: #333;
    }
    .tx-back:hover { background: #f0f0f0; }

    /* ── MAP ── */
    .tx-map {
      flex: 1; min-height: 0; position: relative;
      background: #e8edf2;
    }
    .tx-map iframe { position: absolute; inset: 0; width: 100%; height: 100%; }
    .tx-map-route { flex: 1.1; }

    .tx-map-loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 10px; color: #888; font-size: 14px;
    }

    .tx-pin-label {
      position: absolute; top: 50%;
      left: 50%; transform: translate(-50%, -110%);
      background: #1a1a2e; color: #fff;
      font-size: 12px; font-weight: 700;
      padding: 5px 12px 5px 8px;
      border-radius: 20px;
      display: flex; align-items: center; gap: 6px;
      box-shadow: 0 2px 10px rgba(0,0,0,.25);
      white-space: nowrap; pointer-events: none;
    }
    .tx-pin-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #4caf50; flex-shrink: 0;
    }

    .tx-gps-btn {
      position: absolute; bottom: 16px; right: 16px;
      width: 44px; height: 44px; border-radius: 50%;
      background: #fff; border: none;
      box-shadow: 0 2px 12px rgba(0,0,0,.18);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #e53935;
    }

    /* ── PANEL (bottom sheet) ── */
    .tx-panel {
      background: #fff;
      border-radius: 22px 22px 0 0;
      padding: 10px 16px 28px;
      flex-shrink: 0;
      box-shadow: 0 -4px 24px rgba(0,0,0,.09);
      overflow-y: auto;
      max-height: 55%;
    }
    .tx-panel-vehicle { max-height: 62%; }
    .tx-panel-confirm { max-height: 66%; }

    .tx-handle {
      width: 36px; height: 4px; background: #e0e0e0;
      border-radius: 2px; margin: 0 auto 14px;
    }

    /* ── LOADING ── */
    .tx-loading-row {
      display: flex; align-items: center; justify-content: center;
      gap: 10px; padding: 20px 0; color: #666; font-size: 14px;
    }
    .tx-spinner {
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid #f0f0f0; border-top-color: #e53935;
      animation: spin .7s linear infinite;
    }
    .tx-spinner-sm { width: 18px; height: 18px; border-width: 2px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── LABELS ── */
    .tx-section-label {
      font-size: 11px; font-weight: 700; color: #999;
      text-transform: uppercase; letter-spacing: .8px; margin-bottom: 8px;
    }

    /* ── LOCATION ROW ── */
    .tx-location-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; background: #f9f9f9;
      border-radius: 12px; border: 1px solid #eee;
    }
    .tx-dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
    }
    .tx-dot-green { background: #43a047; box-shadow: 0 0 0 3px #43a04720; }
    .tx-dot-orange { background: #f4511e; box-shadow: 0 0 0 3px #f4511e20; }
    .tx-location-text { font-size: 13px; color: #333; font-weight: 500; line-height: 1.4; }

    /* ── SEARCH BAR ── */
    .tx-searchbar {
      display: flex; align-items: center;
      background: #f5f5f5; border-radius: 14px;
      padding: 11px 14px; gap: 10px;
      border: 1.5px solid transparent;
      transition: border-color .15s;
    }
    .tx-searchbar:focus-within { border-color: #e53935; background: #fff; }
    .tx-search-icon { flex-shrink: 0; }
    .tx-search-input {
      flex: 1; border: none; background: transparent;
      font-size: 14px; outline: none; color: #222; font-weight: 500;
    }
    .tx-search-input::placeholder { color: #aaa; font-weight: 400; }
    .tx-clear {
      background: none; border: none; cursor: pointer;
      padding: 2px; display: flex; align-items: center;
    }

    /* ── SUGGESTIONS ── */
    .tx-suggestions {
      background: #fff; border-radius: 14px;
      border: 1px solid #f0f0f0;
      overflow: hidden;
    }
    .tx-suggestions-drop { margin: 0 0 8px; }
    .tx-sug-item {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 14px; cursor: pointer;
      border-bottom: 1px solid #f8f8f8;
      transition: background .1s;
    }
    .tx-sug-item:last-child { border-bottom: none; }
    .tx-sug-item:active { background: #fafafa; }
    .tx-sug-icon {
      width: 34px; height: 34px; border-radius: 50%;
      background: #f5f5f5; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    }
    .tx-sug-body { flex: 1; overflow: hidden; }
    .tx-sug-main { font-size: 14px; font-weight: 600; color: #1a1a1a; }
    .tx-sug-sub { font-size: 11px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .tx-fav { background: none; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }

    /* ── PRIMARY BUTTON ── */
    .tx-btn-primary {
      width: 100%; padding: 15px;
      background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
      color: #fff; font-weight: 700; font-size: 15px;
      border: none; border-radius: 14px; cursor: pointer;
      box-shadow: 0 4px 15px rgba(229,57,53,.3);
      transition: transform .1s, box-shadow .1s;
      letter-spacing: .2px;
    }
    .tx-btn-primary:not(:disabled):active { transform: scale(.98); }
    .tx-btn-primary:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }

    /* ── STEP 2 DROP ── */
    .tx-drop-screen {
      display: flex; flex-direction: column; height: 100%;
      background: #fff; overflow-y: auto;
    }
    .tx-drop-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px 12px; border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .tx-for-me {
      margin-left: auto; background: #f5f5f5;
      border: 1.5px solid #e8e8e8; border-radius: 20px;
      padding: 6px 12px; font-size: 12px; font-weight: 600; color: #333;
      cursor: pointer;
    }

    .tx-route-card {
      margin: 12px 16px;
      background: #fff; border-radius: 16px;
      padding: 14px; box-shadow: 0 1px 10px rgba(0,0,0,.07);
      border: 1px solid #f0f0f0;
    }
    .tx-route-row { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
    .tx-route-addr { font-size: 13px; font-weight: 600; color: #333; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-route-line { width: 1.5px; height: 18px; background: #ddd; margin-left: 5px; margin-block: 3px; }
    .tx-route-input {
      flex: 1; border: none; outline: none;
      font-size: 14px; color: #222; font-weight: 500; background: transparent;
    }
    .tx-route-input::placeholder { color: #aaa; }

    .tx-chip-row { display: flex; gap: 8px; padding: 4px 16px 12px; }
    .tx-chip {
      display: flex; align-items: center; gap: 6px;
      border: 1.5px solid #e8e8e8; background: #fafafa;
      border-radius: 20px; padding: 8px 14px;
      font-size: 12px; font-weight: 600; color: #444; cursor: pointer;
    }
    .tx-chip:hover { background: #f0f0f0; }

    .tx-popular { padding: 0 0 16px; }
    .tx-popular-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 16px 8px; }
    .tx-pop-loading { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #aaa; }
    .tx-pop-spinner {
      width: 12px; height: 12px; border-radius: 50%;
      border: 2px solid #eee; border-top-color: #e53935;
      animation: spin .6s linear infinite; flex-shrink: 0;
    }
    .tx-pop-count { font-size: 11px; color: #aaa; font-weight: 600; }
    .tx-pop-skeleton {
      width: 130px; height: 64px; border-radius: 14px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.2s infinite; flex-shrink: 0;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .tx-pop-empty { padding: 12px 16px; font-size: 12px; color: #aaa; text-align: center; }
    .tx-pop-body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .tx-pop-dist { font-size: 10px; color: #aaa; font-weight: 500; }
    .px-16 { padding-left: 16px; padding-right: 16px; }
    .tx-popular-scroll {
      display: flex; gap: 10px;
      padding: 4px 16px 8px;
      overflow-x: auto;
    }
    .tx-pop-card {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1.5px solid #eee;
      border-radius: 14px; padding: 12px 14px;
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
      font-size: 13px; font-weight: 600; color: #222;
      transition: border-color .15s;
    }
    .tx-pop-card:hover { border-color: #e53935; }
    .tx-pop-icon { font-size: 20px; }
    .tx-pop-arrow {
      width: 24px; height: 24px; background: #f9a825;
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 16px; font-weight: 700;
      margin-left: 4px;
    }

    /* ── STEP 3 VEHICLE ── */
    .tx-route-floatbar {
      position: absolute; top: 12px; left: 12px; right: 12px;
      display: flex; align-items: center; gap: 8px; z-index: 5;
    }
    .tx-float-btn {
      width: 38px; height: 38px; border-radius: 50%;
      background: #fff; border: none;
      box-shadow: 0 2px 10px rgba(0,0,0,.15);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; font-size: 16px; color: #333;
    }
    .tx-float-route {
      flex: 1; background: #fff; border-radius: 20px;
      padding: 8px 14px; display: flex; align-items: center;
      gap: 6px; box-shadow: 0 2px 10px rgba(0,0,0,.12);
      overflow: hidden;
    }
    .tx-float-chip {
      font-size: 12px; font-weight: 600; color: #222;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 110px;
    }
    .tx-float-edit { font-size: 14px; }

    .tx-trip-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 0 12px; border-bottom: 1px solid #f0f0f0; margin-bottom: 12px;
    }
    .tx-trip-stat { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #555; font-weight: 600; flex: 1; }
    .tx-trip-divider { width: 1px; height: 14px; background: #e0e0e0; flex-shrink: 0; }

    .tx-vehicles { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .tx-vehicle-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-radius: 16px;
      border: 2px solid #f0f0f0; cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    .tx-vehicle-card:hover { border-color: #ddd; background: #fafafa; }
    .tx-vehicle-selected { border-color: #e53935 !important; background: #fff5f5 !important; }
    .tx-veh-left { display: flex; align-items: center; gap: 12px; }
    .tx-veh-emoji {
      width: 46px; height: 46px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;
    }
    .tx-veh-name { font-size: 15px; font-weight: 700; color: #111; display: flex; align-items: center; gap: 6px; }
    .tx-veh-tag {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 20px; vertical-align: middle;
    }
    .tx-veh-meta { font-size: 11px; color: #888; margin-top: 3px; }
    .tx-veh-right { text-align: right; flex-shrink: 0; }
    .tx-veh-fare { font-size: 17px; font-weight: 800; color: #111; }
    .tx-veh-drop { font-size: 11px; color: #888; margin-top: 2px; }

    .tx-payment-row {
      display: flex; gap: 10px;
      padding: 10px 0 12px;
      border-top: 1px solid #f5f5f5; border-bottom: 1px solid #f5f5f5;
      margin-bottom: 12px;
    }
    .tx-pay-chip {
      flex: 1; display: flex; align-items: center; justify-content: center;
      gap: 7px; border: 1.5px solid #e8e8e8;
      background: #fafafa; border-radius: 20px;
      padding: 9px; font-size: 13px; font-weight: 600;
      color: #444; cursor: pointer;
    }

    /* ── STEP 4 CONFIRM ── */
    .tx-confirm-header {
      display: flex; align-items: center; gap: 14px;
      padding: 6px 0 16px; border-bottom: 1px solid #f0f0f0; margin-bottom: 16px;
    }
    .tx-confirm-vehicle-icon {
      width: 52px; height: 52px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; flex-shrink: 0;
    }
    .tx-confirm-veh-name { font-size: 17px; font-weight: 800; color: #111; }
    .tx-confirm-veh-sub { font-size: 12px; color: #888; margin-top: 2px; }
    .tx-confirm-fare-big { margin-left: auto; font-size: 24px; font-weight: 900; color: #e53935; flex-shrink: 0; }

    .tx-confirm-route {
      background: #fafafa; border-radius: 14px;
      padding: 14px; margin-bottom: 14px;
      border: 1px solid #f0f0f0;
    }
    .tx-cr-row { display: flex; align-items: center; gap: 12px; }
    .tx-cr-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
    .tx-cr-dot-green { background: #43a047; }
    .tx-cr-dot-orange { background: #f4511e; }
    .tx-cr-line { width: 1.5px; height: 16px; background: #ddd; margin-left: 5px; margin-block: 4px; }
    .tx-cr-label { font-size: 10px; color: #999; font-weight: 600; text-transform: uppercase; }
    .tx-cr-val { font-size: 13px; font-weight: 600; color: #222; margin-top: 1px; }

    .tx-confirm-stats {
      display: flex; align-items: center;
      background: #f9f9f9; border-radius: 14px;
      padding: 14px; margin-bottom: 18px; gap: 0;
    }
    .tx-cs-item { flex: 1; text-align: center; }
    .tx-cs-val { font-size: 14px; font-weight: 700; color: #111; }
    .tx-cs-key { font-size: 10px; color: #999; font-weight: 600; text-transform: uppercase; margin-top: 3px; }
    .tx-cs-divider { width: 1px; height: 30px; background: #e8e8e8; flex-shrink: 0; }

    .tx-btn-row { display: flex; gap: 10px; }
    .tx-btn-outline {
      flex: 1; padding: 14px;
      border: 2px solid #e8e8e8; background: #fff;
      border-radius: 14px; font-size: 14px; font-weight: 700;
      color: #444; cursor: pointer; transition: border-color .15s;
    }
    .tx-btn-outline:hover { border-color: #ccc; }
    .tx-btn-confirm {
      flex: 2; padding: 14px;
      background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
      color: #fff; font-size: 15px; font-weight: 800;
      border: none; border-radius: 14px; cursor: pointer;
      box-shadow: 0 4px 15px rgba(229,57,53,.3);
      transition: transform .1s;
    }
    .tx-btn-confirm:not(:disabled):active { transform: scale(.98); }
    .tx-btn-confirm:disabled { opacity: .5; cursor: not-allowed; }
    .tx-booking-loader { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .tx-dot-pulse { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: pulse .6s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

    /* ── STEP 5 SUCCESS ── */
    .tx-success-screen {
      display: flex; flex-direction: column;
      align-items: center; padding: 32px 20px 28px;
      background: #fff; height: 100%; overflow-y: auto;
    }
    .tx-success-anim {
      position: relative; width: 90px; height: 90px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 18px;
    }
    .tx-success-ring {
      position: absolute; inset: 0; border-radius: 50%;
      border: 3px solid #e53935; opacity: .2;
      animation: ring-pulse 1.5s ease-in-out infinite;
    }
    @keyframes ring-pulse { 0%,100% { transform: scale(1); opacity: .2; } 50% { transform: scale(1.12); opacity: .1; } }
    .tx-success-emoji { font-size: 42px; }
    .tx-success-title { font-size: 26px; font-weight: 900; color: #111; margin-bottom: 4px; }
    .tx-success-sub { font-size: 14px; color: #777; margin-bottom: 24px; }

    .tx-otp-card {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 18px; padding: 20px 30px;
      text-align: center; width: 100%; margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,.18);
    }
    .tx-otp-label { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: .8px; }
    .tx-otp-value { font-size: 46px; font-weight: 900; color: #fff; letter-spacing: 10px; margin: 8px 0 4px; }
    .tx-otp-hint { font-size: 11px; color: #4caf50; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }

    .tx-success-card {
      width: 100%; background: #fafafa;
      border: 1px solid #eee; border-radius: 16px;
      padding: 16px; margin-bottom: 20px;
    }
    .tx-sc-row { display: flex; align-items: center; gap: 12px; }
    .tx-sc-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
    .tx-sc-dot-green { background: #43a047; }
    .tx-sc-dot-orange { background: #f4511e; }
    .tx-sc-line { width: 1.5px; height: 14px; background: #ddd; margin-left: 5px; margin-block: 4px; }
    .tx-sc-label { font-size: 10px; color: #999; text-transform: uppercase; font-weight: 700; }
    .tx-sc-val { font-size: 13px; font-weight: 600; color: #222; }
    .tx-sc-divider { height: 1px; background: #f0f0f0; margin: 12px 0; }
    .tx-sc-stats { display: flex; justify-content: space-between; }
    .tx-sc-stat-val { font-size: 15px; font-weight: 800; color: #111; text-align: center; }
    .tx-fare-val { color: #e53935; }
    .tx-sc-stat-key { font-size: 10px; color: #999; text-transform: uppercase; font-weight: 600; text-align: center; margin-top: 3px; }

    .tx-btn-ghost {
      background: none; border: none; color: #888;
      font-size: 14px; font-weight: 600; cursor: pointer; padding: 8px;
      text-decoration: underline;
    }

    /* ── ETA CHIP ── */
    .tx-eta-chip {
      display: flex; align-items: center; gap: 8px;
      background: #e8f5e9; border-radius: 20px;
      padding: 7px 14px; font-size: 13px; font-weight: 700;
      color: #2e7d32; margin-bottom: 18px;
    }
    .tx-eta-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #4caf50; animation: pulse .8s ease-in-out infinite;
      flex-shrink: 0;
    }

    /* ── CANCEL RIDE BUTTON ── */
    .tx-btn-cancel-ride {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; width: 100%; padding: 13px;
      background: #fff; border: 2px solid #ffcdd2;
      border-radius: 14px; font-size: 14px; font-weight: 700;
      color: #c62828; cursor: pointer; margin-bottom: 10px;
      transition: background .15s, border-color .15s;
    }
    .tx-btn-cancel-ride:hover { background: #fff5f5; border-color: #ef9a9a; }

    /* ── CANCEL CONFIRM SHEET ── */
    .tx-cancel-sheet { text-align: center; }
    .tx-cancel-icon { font-size: 44px; margin-bottom: 10px; }
    .tx-cancel-title { font-size: 20px; font-weight: 800; color: #111; margin-bottom: 6px; }
    .tx-cancel-sub { font-size: 13px; color: #777; margin-bottom: 18px; line-height: 1.5; }
    .tx-cancel-reason-label {
      font-size: 11px; font-weight: 700; color: #888;
      text-transform: uppercase; letter-spacing: .6px;
      text-align: left; margin-bottom: 10px;
    }
    .tx-cancel-reasons {
      display: flex; flex-wrap: wrap; gap: 8px;
      margin-bottom: 20px;
    }
    .tx-cancel-reason {
      border: 1.5px solid #e8e8e8; border-radius: 20px;
      padding: 8px 14px; font-size: 13px; font-weight: 500;
      color: #444; cursor: pointer; transition: all .15s;
    }
    .tx-cancel-reason:hover { border-color: #e53935; color: #e53935; }
    .tx-reason-selected { border-color: #e53935 !important; background: #fff5f5 !important; color: #e53935 !important; font-weight: 700 !important; }
    .tx-cancel-actions { display: flex; gap: 10px; }
    .tx-btn-cancel-confirm {
      flex: 2; padding: 14px;
      background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
      color: #fff; font-size: 15px; font-weight: 800;
      border: none; border-radius: 14px; cursor: pointer;
    }
    .tx-btn-cancel-confirm:disabled { opacity: .45; cursor: not-allowed; }

    /* ── CANCELLED SCREEN ── */
    .tx-cancelled-icon { font-size: 64px; margin-bottom: 10px; }
    .tx-cancelled-card {
      width: 100%; background: #fafafa;
      border: 1px solid #eee; border-radius: 16px;
      padding: 16px; margin-bottom: 16px;
    }
    .tx-cc-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .tx-cc-row:last-child { border-bottom: none; }
    .tx-cc-label { font-size: 12px; color: #888; font-weight: 600; }
    .tx-cc-val { font-size: 13px; font-weight: 700; color: #222; text-align: right; max-width: 60%; }
    .tx-free-val { color: #2e7d32 !important; }
    .tx-cancel-note {
      font-size: 12px; color: #aaa; text-align: center;
      margin-bottom: 20px; line-height: 1.5;
    }

    .mb-3 { margin-bottom: 12px; }

    /* ── FAVOURITE PLACES ── */
    .tx-favs-section { padding: 0 0 10px; }
    .tx-fav-list { display: flex; flex-direction: column; }
    .tx-fav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f8f8f8;
      transition: background .1s;
    }
    .tx-fav-item:active { background: #fafafa; }
    .tx-fav-item-icon {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .tx-fav-item-body { flex: 1; overflow: hidden; }
    .tx-fav-item-name { font-size: 14px; font-weight: 700; color: #111; }
    .tx-fav-item-addr { font-size: 11px; color: #888; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-fav-remove { background: none; border: none; padding: 6px; cursor: pointer; flex-shrink: 0; }
    .tx-fav-save-addr { font-size: 13px; color: #666; margin-bottom: 14px; }
    .tx-fav-label-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
    .tx-fav-label-btn {
      display: flex; align-items: center; gap: 7px;
      border: 1.5px solid #e8e8e8; background: #fafafa;
      border-radius: 20px; padding: 9px 14px;
      font-size: 13px; font-weight: 600; color: #444; cursor: pointer;
      transition: all .15s;
    }
    .tx-fav-label-btn:hover { border-color: #e53935; }
    .tx-fav-label-selected { border-color: #e53935 !important; background: #fff5f5 !important; color: #e53935 !important; }
    .tx-fav-label-icon { font-size: 16px; }

    /* ── MAP PICKER OVERLAY ── */
    .tx-map-picker-overlay {
      position: fixed; inset: 0; z-index: 100;
      display: flex; flex-direction: column;
      background: #e8edf2;
    }
    .tx-map-picker-map {
      flex: 1; position: relative; min-height: 0;
    }
    .tx-map-picker-map iframe { position: absolute; inset: 0; width: 100%; height: 100%; }
    .tx-map-picker-pin {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -100%);
      pointer-events: none; filter: drop-shadow(0 4px 6px rgba(0,0,0,.3));
    }
    .tx-map-picker-top {
      position: absolute; top: 0; left: 0; right: 0;
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px 10px;
      background: rgba(255,255,255,.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #f0f0f0;
      z-index: 10;
    }
    .tx-map-picker-bottom {
      background: #fff; border-radius: 22px 22px 0 0;
      padding: 14px 16px 28px;
      box-shadow: 0 -4px 24px rgba(0,0,0,.1);
      flex-shrink: 0; position: relative; z-index: 10;
      max-height: 50vh; overflow-y: auto;
    }
    .tx-map-picker-addr {
      display: flex; align-items: center; gap: 10px;
      background: #f9f9f9; border-radius: 12px;
      padding: 10px 12px; font-size: 13px; font-weight: 600;
      color: #333; margin-bottom: 10px;
    }
    .tx-map-picker-gps {
      position: absolute; top: 14px; right: 16px;
      width: 38px; height: 38px; border-radius: 50%;
      background: #fff; border: 1.5px solid #eee;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.1);
    }
    .tx-map-picker-hint { font-size: 11px; color: #aaa; text-align: center; margin-bottom: 10px; }
    .tx-map-picker-search {
      display: flex; align-items: center; background: #f5f5f5;
      border-radius: 14px; padding: 10px 14px; gap: 10px; margin-bottom: 10px;
      border: 1.5px solid transparent;
    }
    .tx-map-picker-search:focus-within { border-color: #e53935; background: #fff; }
    .tx-map-picker-suggestions {
      background: #fff; border-radius: 12px; border: 1px solid #f0f0f0;
      overflow: hidden; margin-bottom: 10px;
    }

    /* ── PAYMENT & OFFERS OVERLAY ── */
    .tx-overlay {
      position: fixed; inset: 0; z-index: 999;
      background: rgba(0,0,0,.45);
      display: flex; align-items: flex-end;
      animation: fadeIn .18s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .tx-sheet-popup {
      width: 100%; background: #fff;
      border-radius: 22px 22px 0 0;
      padding: 14px 16px 32px;
      max-height: 80vh; overflow-y: auto;
      animation: slideUp .22s ease;
    }
    @keyframes slideUp { from { transform: translateY(40px); opacity: .5; } to { transform: translateY(0); opacity: 1; } }

    .tx-sheet-header {
      display: flex; align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 14px;
    }
    .tx-sheet-title { font-size: 17px; font-weight: 800; color: #111; }
    .tx-sheet-close {
      width: 30px; height: 30px; border-radius: 50%;
      background: #f5f5f5; border: none;
      font-size: 14px; cursor: pointer; color: #555;
      display: flex; align-items: center; justify-content: center;
    }

    /* Payment options */
    .tx-pay-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .tx-pay-option {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 12px; border-radius: 14px;
      border: 2px solid #f0f0f0; cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    .tx-pay-option:hover { background: #fafafa; }
    .tx-pay-selected { border-color: #e53935 !important; background: #fff5f5 !important; }
    .tx-pay-opt-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
    }
    .tx-pay-opt-body { flex: 1; }
    .tx-pay-opt-name { font-size: 15px; font-weight: 700; color: #111; }
    .tx-pay-opt-sub { font-size: 12px; color: #888; margin-top: 2px; }
    .tx-pay-opt-check { margin-left: auto; flex-shrink: 0; }
    .tx-offer-applied-label { color: #2e7d32; font-weight: 700; font-size: 12px; }
    .tx-pay-chip-offer { border-color: #e8f5e9; }
    .tx-pay-chip-offer .tx-offer-applied-label { color: #2e7d32; }

    /* Promo */
    .tx-promo-row { display: flex; gap: 8px; align-items: center; }
    .tx-promo-input { flex: 1; }
    .tx-apply-btn {
      padding: 11px 18px; background: #e53935; color: #fff;
      border: none; border-radius: 12px; font-size: 14px; font-weight: 700;
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
    }
    .tx-promo-msg {
      padding: 8px 12px; border-radius: 10px;
      font-size: 12px; font-weight: 600; margin-bottom: 10px;
    }
    .tx-promo-success { background: #e8f5e9; color: #2e7d32; }
    .tx-promo-error   { background: #fdeaea; color: #c62828; }

    /* Offer cards */
    .tx-offer-list { display: flex; flex-direction: column; gap: 10px; }
    .tx-offer-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 12px; border-radius: 14px;
      border: 1.5px solid #f0f0f0; cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    .tx-offer-card:hover { border-color: #ddd; }
    .tx-offer-applied { border-color: #4caf50 !important; background: #f1f8e9 !important; }
    .tx-offer-left { display: flex; align-items: center; gap: 12px; }
    .tx-offer-tag {
      width: 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .tx-offer-code { font-size: 14px; font-weight: 800; color: #111; letter-spacing: .5px; }
    .tx-offer-desc { font-size: 11px; color: #888; margin-top: 2px; }
    .tx-offer-save { font-size: 12px; font-weight: 700; color: #e53935; margin-top: 3px; }
    .tx-offer-check {
      font-size: 12px; font-weight: 800; color: #2e7d32;
      background: #e8f5e9; padding: 4px 10px; border-radius: 20px;
    }
    .tx-offer-apply-btn {
      font-size: 11px; font-weight: 700; color: #e53935;
      background: #fff5f5; padding: 4px 10px; border-radius: 20px;
    }

    .mt-12 { margin-top: 12px; }
    .mb-8  { margin-bottom: 8px; }
    .mb-12 { margin-bottom: 12px; }

    /* ── WOMEN SAFETY BANNER ── */
    .tx-women-banner {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #880e4f 0%, #c2185b 100%);
      border-radius: 16px; padding: 14px 16px; margin-bottom: 14px;
      box-shadow: 0 4px 16px rgba(136,14,79,.25);
    }
    .tx-women-banner-left { display: flex; align-items: center; gap: 12px; }
    .tx-women-icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(255,255,255,.2); display: flex; align-items: center;
      justify-content: center; font-size: 22px; font-weight: 900; color: #fff;
      flex-shrink: 0; border: 2px solid rgba(255,255,255,.4);
    }
    .tx-women-title { font-size: 14px; font-weight: 800; color: #fff; }
    .tx-women-sub { font-size: 11px; color: rgba(255,255,255,.8); margin-top: 2px; }
    .tx-women-shield { font-size: 28px; }
    .tx-veh-women-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 700; color: #880e4f;
      background: #fce4ec; border-radius: 20px;
      padding: 2px 8px; margin-top: 3px;
    }

    /* ── MODE BADGE & FIELDS ── */
    .tx-mode-badge {
      margin-left: auto; padding: 4px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0;
    }
    .tx-mode-info {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; border-radius: 12px; border: 1px solid;
      font-size: 12px; font-weight: 500; color: #333; margin-bottom: 12px; line-height: 1.4;
    }
    .tx-mode-fields { margin-bottom: 12px; }
    .tx-field-label {
      font-size: 11px; font-weight: 700; color: #888;
      text-transform: uppercase; letter-spacing: .6px;
      display: block; margin-bottom: 6px; margin-top: 10px;
    }
    .tx-datetime-row { display: flex; gap: 10px; }
    .tx-datetime-item { flex: 1; }
    .tx-datetime-input {
      width: 100%; padding: 11px 12px; border: 1.5px solid #e8e8e8;
      border-radius: 12px; font-size: 14px; color: #222; outline: none;
      background: #fafafa;
    }
    .tx-datetime-input:focus { border-color: #e53935; background: #fff; }
  `]
})
export class TravelComponent implements OnInit, OnDestroy {
  step = 1;
  locating = false;

  // ── Mode ──
  mode: TravelMode = 'normal';
  get modeConfig() { return MODE_CONFIG[this.mode]; }

  // ── Mode-specific fields ──
  scheduleDate = '';
  scheduleTime = '';
  passengerName = '';
  passengerPhone = '';
  parentContact = '';
  get minScheduleDate(): string {
    return new Date().toISOString().split('T')[0];
  }

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
  routeMapUrl: SafeResourceUrl | null = null;

  distanceKm = 0;
  etaMinutes = 0;
  selectedVehicle: VehicleOption | null = null;
  booking = false;
  bookingOtp = '';

  readonly vehicleOptions: VehicleOption[] = [
    { type: 'bike',  emoji: '🏍️', label: 'Bike',        description: 'Quick rides',        farePerKm: 8,  baseKm: 20, etaMin: 3, capacity: 1, color: '#ff6f00' },
    { type: 'auto',  emoji: '🛺',  label: 'Auto',        description: 'Affordable travel',  farePerKm: 12, baseKm: 25, etaMin: 1, capacity: 3, tag: 'FASTEST', color: '#2e7d32' },
    { type: 'cab',   emoji: '🚗',  label: 'Cab Economy', description: 'Comfortable ride',   farePerKm: 18, baseKm: 30, etaMin: 5, capacity: 4, color: '#1565c0' },
    { type: 'prime', emoji: '🚙',  label: 'Cab Prime',   description: 'Premium sedans',     farePerKm: 24, baseKm: 40, etaMin: 6, capacity: 4, color: '#6a1b9a' },
  ];

  // ── Dynamic Popular Places ──
  popularPlaces: Array<{ name: string; icon: string; lat: string; lon: string; distKm?: string; display_name: string }> = [];
  popularLoading = false;

  private readonly PLACE_TYPES = [
    { tag: 'bus_station',    label: 'Bus Stand',        icon: '🚌' },
    { tag: 'bus_stop',       label: 'Bus Stop',         icon: '🚌' },
    { tag: 'train_station',  label: 'Railway Station',  icon: '🚂' },
    { tag: 'railway_station',label: 'Railway Station',  icon: '🚂' },
    { tag: 'airport',        label: 'Airport',          icon: '✈️' },
    { tag: 'hospital',       label: 'Hospital',         icon: '🏥' },
    { tag: 'clinic',         label: 'Clinic',           icon: '🏥' },
    { tag: 'supermarket',    label: 'Supermarket',      icon: '🛒' },
    { tag: 'mall',           label: 'Shopping Mall',    icon: '🏬' },
    { tag: 'school',         label: 'School',           icon: '🏫' },
    { tag: 'college',        label: 'College',          icon: '🎓' },
    { tag: 'university',     label: 'University',       icon: '🎓' },
    { tag: 'park',           label: 'Park',             icon: '🌳' },
    { tag: 'restaurant',     label: 'Restaurant',       icon: '🍽️' },
    { tag: 'hotel',          label: 'Hotel',            icon: '🏨' },
    { tag: 'fuel',           label: 'Petrol Station',   icon: '⛽' },
    { tag: 'bank',           label: 'Bank',             icon: '🏦' },
    { tag: 'atm',            label: 'ATM',              icon: '🏧' },
    { tag: 'temple',         label: 'Temple',           icon: '🛕' },
    { tag: 'mosque',         label: 'Mosque',           icon: '🕌' },
    { tag: 'church',         label: 'Church',           icon: '⛪' },
    { tag: 'police',         label: 'Police Station',   icon: '🚓' },
    { tag: 'pharmacy',       label: 'Pharmacy',         icon: '💊' },
    { tag: 'cinema',         label: 'Cinema',           icon: '🎬' },
    { tag: 'stadium',        label: 'Stadium',          icon: '🏟️' },
    { tag: 'gym',            label: 'Gym',              icon: '🏋️' },
    { tag: 'swimming_pool',  label: 'Swimming Pool',    icon: '🏊' },
  ];

  private fetchNearbyPlaces(lat: number, lng: number): void {
    this.popularLoading = true;
    this.popularPlaces = [];

    // Build Overpass query — find all named amenity/leisure within 3km radius
    const radius = 3000;
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"~"hospital|clinic|bus_station|bus_stop|fuel|bank|atm|police|pharmacy|cinema|restaurant|fast_food|school|college|university|place_of_worship|theatre"](around:${radius},${lat},${lng});
        node["railway"~"station|halt"](around:${radius},${lat},${lng});
        node["aeroway"="aerodrome"](around:${radius},${lat},${lng});
        node["shop"~"mall|supermarket|department_store"](around:${radius},${lat},${lng});
        node["leisure"~"park|stadium|sports_centre|swimming_pool|fitness_centre"](around:${radius},${lat},${lng});
        node["tourism"~"hotel|hostel|guest_house"](around:${radius},${lat},${lng});
      );
      out center 30;
    `;

    this.http.post<any>(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ).subscribe({
      next: (res) => this.zone.run(() => {
        const elements = res?.elements || [];
        const seen = new Set<string>();
        const results: typeof this.popularPlaces = [];

        for (const el of elements) {
          const rawName = el.tags?.name || el.tags?.['name:en'] || '';
          if (!rawName || rawName.length < 2) continue;

          const key = rawName.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          // Determine icon from tags
          const icon = this.iconForElement(el.tags);
          const elLat = String(el.lat || el.center?.lat || lat);
          const elLon = String(el.lon || el.center?.lon || lng);

          // Calculate distance
          const distKm = this.haversineKm(lat, lng, parseFloat(elLat), parseFloat(elLon));

          results.push({
            name: rawName,
            icon,
            lat: elLat,
            lon: elLon,
            distKm: distKm.toFixed(1),
            display_name: `${rawName}, ${el.tags?.['addr:street'] || el.tags?.['addr:city'] || ''}`.trim().replace(/,$/, ''),
          });
        }

        // Sort by distance
        results.sort((a, b) => parseFloat(a.distKm || '0') - parseFloat(b.distKm || '0'));
        this.popularPlaces = results.slice(0, 20);
        this.popularLoading = false;
      }),
      error: () => this.zone.run(() => {
        this.popularLoading = false;
        // Fallback: use Nominatim search for common places
        this.fetchNearbyPlacesFallback(lat, lng);
      })
    });
  }

  private fetchNearbyPlacesFallback(lat: number, lng: number): void {
    // Fallback: Nominatim nearby search for common categories
    const queries = ['hospital', 'bus station', 'railway station', 'mall', 'school'];
    const results: typeof this.popularPlaces = [];
    let remaining = queries.length;

    queries.forEach(q => {
      this.http.get<PlaceSuggestion[]>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=2&viewbox=${lng-0.05},${lat+0.05},${lng+0.05},${lat-0.05}&bounded=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'RouteXApp/1.0' } }
      ).subscribe({
        next: (places) => this.zone.run(() => {
          places.forEach(p => {
            const distKm = this.haversineKm(lat, lng, parseFloat(p.lat), parseFloat(p.lon));
            results.push({
              name: this.shortName(p.display_name),
              icon: this.iconForQuery(q),
              lat: p.lat, lon: p.lon,
              distKm: distKm.toFixed(1),
              display_name: p.display_name
            });
          });
          remaining--;
          if (remaining === 0) {
            results.sort((a, b) => parseFloat(a.distKm || '0') - parseFloat(b.distKm || '0'));
            this.popularPlaces = results.slice(0, 15);
          }
        }),
        error: () => { remaining--; }
      });
    });
  }

  private iconForElement(tags: Record<string, string>): string {
    const a = tags['amenity'] || '';
    const r = tags['railway'] || '';
    const ae = tags['aeroway'] || '';
    const s = tags['shop'] || '';
    const l = tags['leisure'] || '';
    const t = tags['tourism'] || '';
    if (ae) return '✈️';
    if (r === 'station' || r === 'halt') return '🚂';
    if (a === 'hospital' || a === 'clinic') return '🏥';
    if (a === 'bus_station' || a === 'bus_stop') return '🚌';
    if (a === 'school') return '🏫';
    if (a === 'college' || a === 'university') return '🎓';
    if (a === 'fuel') return '⛽';
    if (a === 'bank') return '🏦';
    if (a === 'atm') return '🏧';
    if (a === 'police') return '🚓';
    if (a === 'pharmacy') return '💊';
    if (a === 'cinema' || a === 'theatre') return '🎬';
    if (a === 'restaurant' || a === 'fast_food') return '🍽️';
    if (a === 'place_of_worship') {
      const rel = tags['religion'] || '';
      if (rel === 'muslim') return '🕌';
      if (rel === 'christian') return '⛪';
      return '🛕';
    }
    if (s === 'mall' || s === 'department_store') return '🏬';
    if (s === 'supermarket') return '🛒';
    if (l === 'park') return '🌳';
    if (l === 'stadium') return '🏟️';
    if (l === 'swimming_pool') return '🏊';
    if (l === 'fitness_centre') return '🏋️';
    if (l === 'sports_centre') return '🏅';
    if (t === 'hotel' || t === 'hostel') return '🏨';
    return '📍';
  }

  private iconForQuery(q: string): string {
    if (q.includes('hospital')) return '🏥';
    if (q.includes('bus')) return '🚌';
    if (q.includes('railway')) return '🚂';
    if (q.includes('mall')) return '🏬';
    if (q.includes('school')) return '🏫';
    return '📍';
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371, toR = (d: number) => d * Math.PI / 180;
    const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  selectPopularPlace(p: { name: string; lat: string; lon: string; display_name: string }): void {
    this.selectDrop({ display_name: p.display_name || p.name, lat: p.lat, lon: p.lon });
  }

  // keep old selectPopular for any remaining template refs
  selectPopular(p: { name: string }): void { this.dropQuery = p.name; this.dropSearch$.next(p.name); }

  private readonly pickupSearch$ = new Subject<string>();
  private readonly dropSearch$   = new Subject<string>();
  private readonly destroy$      = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private zone: NgZone,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private bookingService: BookingService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    // Read mode from query param
    this.route.queryParamMap.subscribe(params => {
      const m = params.get('mode') as TravelMode | null;
      this.mode = (m && MODE_CONFIG[m]) ? m : 'normal';
    });

    this.detectLiveLocation();
    this.selectedVehicle = this.vehicleOptions[1];
    this.loadFavourites();

    this.pickupSearch$
      .pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.nominatimSearch(q)))
      .subscribe(r => this.zone.run(() => this.pickupSuggestions = r));

    this.dropSearch$
      .pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.nominatimSearch(q)))
      .subscribe(r => this.zone.run(() => this.dropSuggestions = r));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── GPS — uses watchPosition for accuracy then settles ──
  detectLiveLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.useFallback(); return;
    }
    this.locating = true;
    this.pickupMapUrl = null;

    // Try high-accuracy first, fall back to low-accuracy on error
    const tryGet = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        pos => this.zone.run(() => {
          this.pickupLat = pos.coords.latitude;
          this.pickupLng = pos.coords.longitude;
          this.updatePickupMap();
          this.reverseGeocode(this.pickupLat, this.pickupLng)
            .subscribe(addr => this.zone.run(() => {
              this.pickupAddress = addr;
              this.pickupQuery   = addr;
              this.locating = false;
              // Fetch nearby popular places based on live location
              this.fetchNearbyPlaces(this.pickupLat, this.pickupLng);
            }));
        }),
        err => {
          if (highAccuracy) {
            // Retry without high accuracy (works better on some Android browsers)
            tryGet(false);
          } else {
            this.zone.run(() => this.useFallback());
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 12000 : 8000, maximumAge: 0 }
      );
    };
    tryGet(true);
  }

  private useFallback(): void {
    this.pickupLat = 17.3850; this.pickupLng = 78.4867;
    this.updatePickupMap();
    this.pickupAddress = 'Hyderabad, Telangana, India';
    this.pickupQuery   = this.pickupAddress;
    this.locating = false;
    this.notifications.push('Enable GPS permission for live location.', 'warning');
    this.fetchNearbyPlaces(this.pickupLat, this.pickupLng);
  }

  // ── OpenStreetMap embed — shows exact marker pin ──
  private updatePickupMap(): void {
    const d = 0.008;
    const bbox = `${this.pickupLng - d},${this.pickupLat - d},${this.pickupLng + d},${this.pickupLat + d}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${this.pickupLat},${this.pickupLng}`;
    this.pickupMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private updateRouteMap(): void {
    // Google Maps directions embed for route
    const url = `https://maps.google.com/maps?saddr=${this.pickupLat},${this.pickupLng}&daddr=${this.dropLat},${this.dropLng}&output=embed`;
    this.routeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private reverseGeocode(lat: number, lng: number) {
    return this.http.get<any>(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'RouteXApp/1.0' } }
    ).pipe(
      switchMap(r => {
        if (!r) return of(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        // Build a clean short address from parts
        const a = r.address || {};
        const parts = [
          a.house_number, a.road || a.pedestrian,
          a.suburb || a.neighbourhood || a.village,
          a.city || a.town || a.county,
          a.state
        ].filter(Boolean);
        return of(parts.length > 0 ? parts.join(', ') : r.display_name);
      })
    );
  }

  private nominatimSearch(q: string) {
    if (!q || q.length < 2) return of([] as PlaceSuggestion[]);
    return this.http.get<PlaceSuggestion[]>(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'RouteXApp/1.0' } }
    );
  }

  // ── PICKUP ──
  onPickupSearch(q: string): void { this.pickupSearch$.next(q); }
  selectPickup(s: PlaceSuggestion): void {
    this.pickupLat = parseFloat(s.lat); this.pickupLng = parseFloat(s.lon);
    this.pickupAddress = s.display_name; this.pickupQuery = s.display_name;
    this.pickupSuggestions = []; this.updatePickupMap();
  }
  confirmPickup(): void { this.step = 2; }

  // ── DROP ──
  onDropSearch(q: string): void { this.dropSearch$.next(q); }
  selectDrop(s: PlaceSuggestion): void {
    this.dropLat = parseFloat(s.lat); this.dropLng = parseFloat(s.lon);
    this.dropAddress = s.display_name; this.dropQuery = s.display_name;
    this.dropSuggestions = [];
    this.computeDistance(); this.updateRouteMap(); this.step = 3;
  }
  addStop(): void { this.notifications.push('Multi-stop coming soon!', 'info' as any); }

  // ── DISTANCE (Haversine) ──
  private computeDistance(): void {
    const R = 6371, toR = (d: number) => d * Math.PI / 180;
    const dLat = toR(this.dropLat - this.pickupLat), dLng = toR(this.dropLng - this.pickupLng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toR(this.pickupLat)) * Math.cos(toR(this.dropLat)) * Math.sin(dLng/2)**2;
    this.distanceKm = Math.max(1, parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)));
    this.etaMinutes = Math.round((this.distanceKm / 25) * 60);
  }

  // ── VEHICLE ──
  selectVehicle(v: VehicleOption): void { this.selectedVehicle = v; }
  calculateFare(v: VehicleOption): number { return this.calculateFareWithDiscount(v); }
  getDropTime(etaMin: number): string {
    return new Date(Date.now() + (etaMin + this.etaMinutes) * 60000)
      .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  openConfirmSheet(): void { this.step = 4; }

  // ── Favourite Places ──
  favouritePlaces: Array<PlaceSuggestion & { label: string; icon: string; color: string }> = [];
  showSaveFavSheet = false;
  pendingFavSuggestion: PlaceSuggestion | null = null;
  pendingFavLabel = '';
  pendingFavIcon = '';
  pendingFavColor = '';

  readonly favLabels = [
    { label: 'Home',    icon: '🏠', color: '#e53935' },
    { label: 'Work',    icon: '💼', color: '#1565c0' },
    { label: 'Gym',     icon: '🏋️', color: '#ff6f00' },
    { label: 'College', icon: '🎓', color: '#6a1b9a' },
    { label: 'Hospital',icon: '🏥', color: '#2e7d32' },
    { label: 'Hotel',   icon: '🏨', color: '#0277bd' },
    { label: 'Mall',    icon: '🏬', color: '#c2185b' },
    { label: 'Temple',  icon: '🛕', color: '#f57f17' },
    { label: 'Other',   icon: '📍', color: '#555'    },
  ];

  private readonly FAV_KEY = 'routex_fav_places';

  private loadFavourites(): void {
    try {
      const raw = localStorage.getItem(this.FAV_KEY);
      if (raw) this.favouritePlaces = JSON.parse(raw);
    } catch { this.favouritePlaces = []; }
  }

  private saveFavouritesToStorage(): void {
    localStorage.setItem(this.FAV_KEY, JSON.stringify(this.favouritePlaces));
  }

  isFavourite(s: PlaceSuggestion): boolean {
    return this.favouritePlaces.some(f => f.lat === s.lat && f.lon === s.lon);
  }

  toggleFavourite(s: PlaceSuggestion): void {
    if (this.isFavourite(s)) {
      this.favouritePlaces = this.favouritePlaces.filter(f => !(f.lat === s.lat && f.lon === s.lon));
      this.saveFavouritesToStorage();
      this.notifications.push('Removed from favourites', 'info' as any);
    } else {
      this.pendingFavSuggestion = s;
      this.pendingFavLabel = '';
      this.showSaveFavSheet = true;
    }
  }

  saveFavourite(): void {
    if (!this.pendingFavSuggestion || !this.pendingFavLabel) return;
    const lbl = this.favLabels.find(l => l.label === this.pendingFavLabel);
    this.favouritePlaces.unshift({
      ...this.pendingFavSuggestion,
      label: this.pendingFavLabel,
      icon: lbl?.icon || '📍',
      color: lbl?.color || '#555',
    });
    this.saveFavouritesToStorage();
    this.showSaveFavSheet = false;
    this.pendingFavSuggestion = null;
    const saved = this.favouritePlaces[0];
    this.pendingFavLabel = '';
    this.notifications.push(`✅ Saved as "${saved.label}"`, 'success');
  }

  removeFavourite(f: PlaceSuggestion & { label: string }): void {
    this.favouritePlaces = this.favouritePlaces.filter(x => !(x.lat === f.lat && x.lon === f.lon));
    this.saveFavouritesToStorage();
    this.notifications.push('Removed from favourites', 'info' as any);
  }

  selectFavourite(f: PlaceSuggestion & { label: string }): void { this.selectDrop(f); }

  // ── Map Picker ──
  showMapPicker = false;
  mapPickerUrl: SafeResourceUrl | null = null;
  mapPickerLat = 0;
  mapPickerLng = 0;
  mapPickerAddress = '';
  mapPickerQuery = '';
  mapPickerSuggestions: PlaceSuggestion[] = [];
  mapPickerResolving = false;
  private readonly mapPickerSearch$ = new Subject<string>();

  useMapForDrop(): void {
    const lat = this.pickupLat || 17.3850;
    const lng = this.pickupLng || 78.4867;
    this.mapPickerLat = lat;
    this.mapPickerLng = lng;
    this.mapPickerAddress = '';
    this.mapPickerQuery = '';
    this.mapPickerSuggestions = [];
    this.updateMapPickerIframe(lat, lng);
    this.showMapPicker = true;
    this.resolveMapPickerAddress(lat, lng);

    // Setup map picker search
    this.mapPickerSearch$
      .pipe(debounceTime(400), distinctUntilChanged(), switchMap(q => this.nominatimSearch(q)))
      .subscribe(r => this.zone.run(() => this.mapPickerSuggestions = r));
  }

  private updateMapPickerIframe(lat: number, lng: number): void {
    const d = 0.006;
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
    this.mapPickerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private resolveMapPickerAddress(lat: number, lng: number): void {
    this.mapPickerResolving = true;
    this.reverseGeocode(lat, lng).subscribe(addr => this.zone.run(() => {
      this.mapPickerAddress = addr;
      this.mapPickerResolving = false;
    }));
  }

  centreMapPickerOnGps(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => this.zone.run(() => {
        this.mapPickerLat = pos.coords.latitude;
        this.mapPickerLng = pos.coords.longitude;
        this.updateMapPickerIframe(this.mapPickerLat, this.mapPickerLng);
        this.resolveMapPickerAddress(this.mapPickerLat, this.mapPickerLng);
      }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  onMapPickerSearch(q: string): void { this.mapPickerSearch$.next(q); }

  confirmMapPickerSelection(s: PlaceSuggestion): void {
    this.mapPickerLat = parseFloat(s.lat);
    this.mapPickerLng = parseFloat(s.lon);
    this.mapPickerAddress = s.display_name;
    this.mapPickerSuggestions = [];
    this.mapPickerQuery = '';
    this.updateMapPickerIframe(this.mapPickerLat, this.mapPickerLng);
  }

  confirmMapPickerDrop(): void {
    if (!this.mapPickerAddress) return;
    this.dropLat = this.mapPickerLat;
    this.dropLng = this.mapPickerLng;
    this.dropAddress = this.mapPickerAddress;
    this.dropQuery = this.mapPickerAddress;
    this.showMapPicker = false;
    this.computeDistance();
    this.updateRouteMap();
    this.step = 3;
  }

  closeMapPicker(): void { this.showMapPicker = false; }

  // ── Cancel Ride State ──
  showCancelConfirm = false;
  selectedCancelReason = '';
  cancelling = false;

  readonly cancelReasons = [
    'Captain taking too long',
    'Changed my plans',
    'Booked by mistake',
    'Found another ride',
    'Emergency at home',
    'Other reason',
  ];

  openCancelConfirm(): void {
    this.selectedCancelReason = '';
    this.showCancelConfirm = true;
  }

  confirmCancelRide(): void {
    if (!this.selectedCancelReason) return;
    this.cancelling = true;
    // Cancel via booking service (fire and forget — show cancelled screen regardless)
    setTimeout(() => {
      this.zone.run(() => {
        this.cancelling = false;
        this.showCancelConfirm = false;
        this.step = 6;
      });
    }, 1000);
  }

  // ── Payment & Offers State ──
  showPaymentSheet = false;
  showOffersSheet  = false;
  selectedPayment  = 'cash';
  promoInput       = '';
  promoMessage     = '';
  promoSuccess     = false;
  appliedOffer: { code: string; discount: number; icon: string; color: string } | null = null;

  get selectedPaymentLabel(): string {
    return this.paymentMethods.find(p => p.id === this.selectedPayment)?.label || 'Cash';
  }

  readonly paymentMethods = [
    { id: 'cash',   label: 'Cash',          sub: 'Pay the captain directly',           icon: '💵', color: '#2e7d32' },
    { id: 'upi',    label: 'UPI / GPay',    sub: 'PhonePe, Google Pay, Paytm',         icon: '📱', color: '#1565c0' },
    { id: 'card',   label: 'Debit / Credit Card', sub: 'Visa, Mastercard, RuPay',      icon: '💳', color: '#6a1b9a' },
    { id: 'wallet', label: 'Wallet',         sub: 'RouteX wallet balance',              icon: '👛', color: '#e65100' },
  ];

  readonly availableOffers = [
    { code: 'RIDE30',  description: '30% off on Bike rides',        discount: 30,  icon: '🏍️', color: '#ff6f00', minFare: 0  },
    { code: 'FIRST50', description: '₹50 off on your first ride',   discount: 50,  icon: '🎉', color: '#e53935', minFare: 100 },
    { code: 'SAVE20',  description: '20% off for all ride types',   discount: 20,  icon: '💸', color: '#1565c0', minFare: 80  },
    { code: 'AUTO15',  description: '₹15 off on Auto rides',        discount: 15,  icon: '🛺', color: '#2e7d32', minFare: 60  },
  ];

  openPaymentSheet(): void  { this.showPaymentSheet = true; this.showOffersSheet = false; }
  openOffersSheet(): void   { this.showOffersSheet = true;  this.showPaymentSheet = false; }

  selectPayment(p: { id: string }): void { this.selectedPayment = p.id; }

  confirmPayment(): void { this.showPaymentSheet = false; }

  applyOffer(o: { code: string; discount: number; icon: string; color: string }): void {
    this.appliedOffer = o;
    this.promoMessage = `✓ ${o.code} applied — you save ₹${o.discount}!`;
    this.promoSuccess = true;
    this.promoInput = o.code;
    setTimeout(() => this.showOffersSheet = false, 800);
  }

  applyPromoCode(): void {
    const code = this.promoInput.trim().toUpperCase();
    const match = this.availableOffers.find(o => o.code === code);
    if (match) {
      this.applyOffer(match);
    } else {
      this.promoMessage = 'Invalid promo code. Try: RIDE30, FIRST50, SAVE20, AUTO15';
      this.promoSuccess = false;
    }
  }

  removeOffer(): void {
    this.appliedOffer = null;
    this.promoInput   = '';
    this.promoMessage = '';
  }

  calculateFareWithDiscount(v: VehicleOption): number {
    const base = Math.round(v.baseKm + this.distanceKm * v.farePerKm);
    if (!this.appliedOffer) return base;
    return Math.max(0, base - this.appliedOffer.discount);
  }
  get modeFieldsValid(): boolean {
    if (this.mode === 'later') return !!this.scheduleDate && !!this.scheduleTime;
    if (this.mode === 'teen')  return !!this.parentContact;
    if (this.mode === 'others') return !!this.passengerName && !!this.passengerPhone;
    return true;
  }

  // ── BOOK ──
  bookRide(): void {
    if (!this.selectedVehicle || !this.modeFieldsValid) return;
    this.booking = true;

    const user = this.auth.getCurrentUser();
    const userId   = user?.id       || '';
    const userName = user?.displayName || '';

    const vehicleMap: Record<string, string> = {
      bike: 'bike', auto: 'auto', cab: 'car', prime: 'car'
    };

    const request = {
      bookingFor: (this.mode === 'others' ? 'others' : 'self') as 'self' | 'others',
      recipientName:  this.mode === 'others' ? this.passengerName  : undefined,
      recipientPhone: this.mode === 'others' ? this.passengerPhone : undefined,
      scheduledAt: this.mode === 'later' ? `${this.scheduleDate}T${this.scheduleTime}` : undefined,
      serviceType: 'parcel' as const,
      paymentMethod: (this.selectedPayment === 'upi' ? 'upi' : this.selectedPayment === 'card' ? 'card' : this.selectedPayment === 'wallet' ? 'wallet' : 'cash') as any,
      vehicleType: (vehicleMap[this.selectedVehicle.type] || 'auto') as any,
      pickup: { address: this.pickupAddress, lat: this.pickupLat, lng: this.pickupLng },
      drop:   { address: this.dropAddress,   lat: this.dropLat,   lng: this.dropLng   },
      estimatedFare: this.calculateFare(this.selectedVehicle),
      notificationTarget: 'all' as const,
      rideNotes: this.mode === 'women' ? 'Women Safety Mode — verified captains only'
               : this.mode === 'teen'  ? `Teen Ride Mode — parent: ${this.parentContact}`
               : undefined,
    };

    // createBooking is synchronous — returns Booking directly
    const booking = this.bookingService.createBooking(userId, userName, request);
    this.zone.run(() => {
      this.booking = false;
      this.bookingOtp = booking?.otp || this.genOtp();
      this.step = 5;
    });
  }

  private genOtp(): string { return `${Math.floor(1000 + Math.random() * 9000)}`; }
  trackRide(): void { this.router.navigate(['/ride-live']); }
  goBack(): void { this.router.navigate(['/services']); }

  resetFlow(): void {
    this.step = 1; this.dropAddress = ''; this.dropQuery = '';
    this.dropLat = 0; this.dropLng = 0; this.routeMapUrl = null;
    this.selectedVehicle = this.vehicleOptions[1]; this.bookingOtp = '';
    this.scheduleDate = ''; this.scheduleTime = '';
    this.passengerName = ''; this.passengerPhone = ''; this.parentContact = '';
    this.showCancelConfirm = false; this.selectedCancelReason = ''; this.cancelling = false;
    this.appliedOffer = null; this.promoInput = ''; this.promoMessage = '';
    this.selectedPayment = 'cash';
  }

  shortName(addr: string): string {
    if (!addr) return '';
    return addr.split(',').slice(0, 2).join(',').trim();
  }
}
