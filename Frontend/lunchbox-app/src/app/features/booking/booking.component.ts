import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppUser, Booking, BookingRequest, CaptainDirectoryItem, LiveFareRequest, LiveFareResponse, NearbyCaptain, PaymentMethod, ServiceType, VehicleType } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { NearbyHotelApiItem, PlacesService } from '../../core/services/places.service';
import { PricingService } from '../../core/services/pricing.service';

type LocationPreset = {
  name: string;
  lat: number;
  lng: number;
};

type TrafficCondition = 'low' | 'medium' | 'high';
type WeatherCondition = 'clear' | 'cloudy' | 'rainy' | 'stormy';

type NearbyHotel = {
  id: string;
  name: string;
  category: 'veg' | 'nonveg';
  locationLabel: string;
  distanceKm: number;
  etaMinutes: number;
  rating: number;
  openNow: boolean;
};

type PopularPlace = {
  name: string;
  distanceKm: number;
  etaMinutes: number;
  captainHint: string;
};

const LAST_LOCATION_KEY = 'delivery_last_location';
const RECENT_LOCATIONS_KEY = 'delivery_recent_locations';
const WOMEN_SAFETY_MODE_KEY_PREFIX = 'delivery_women_safety_mode';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <div class="card p-3 mb-3 lunchbox-mode-card">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h5 class="mb-1">Lunch Box Delivery Mode</h5>
            <div class="small text-muted">Use this for school lunch delivery with child and school details.</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-outline-primary btn-sm" type="button" (click)="openLunchboxBookingsPage()">Open Lunch Box Page</button>
            <div class="form-check form-switch m-0 pt-1">
              <input
                class="form-check-input"
                type="checkbox"
                id="lunchBoxMode"
                [(ngModel)]="lunchBoxDeliveryMode"
                (ngModelChange)="onLunchBoxDeliveryModeChange()"
              />
              <label class="form-check-label" for="lunchBoxMode">Enable</label>
            </div>
          </div>
        </div>

        <div class="row g-2 mt-1" *ngIf="lunchBoxDeliveryMode">
          <div class="col-md-6">
            <input class="form-control" placeholder="Student name" [(ngModel)]="lunchStudentName" />
          </div>
          <div class="col-md-6">
            <input class="form-control" placeholder="Class / Section" [(ngModel)]="lunchStudentClass" />
          </div>
          <div class="col-md-6">
            <input class="form-control" placeholder="School name" [(ngModel)]="lunchSchoolName" />
          </div>
          <div class="col-md-6">
            <input
              class="form-control"
              placeholder="School address"
              [(ngModel)]="lunchSchoolAddress"
              (ngModelChange)="onLunchSchoolAddressChange($event)"
            />
          </div>
          <div class="col-md-6">
            <input class="form-control" placeholder="Guardian phone" [(ngModel)]="lunchGuardianPhone" />
          </div>
          <div class="col-md-6">
            <input class="form-control" placeholder="Lunch box details (veg/non-veg/allergy note)" [(ngModel)]="lunchBoxDetails" />
          </div>
          <div class="col-12">
            <input class="form-control" placeholder="School gate / class handover instructions" [(ngModel)]="lunchDeliveryInstructions" />
          </div>
        </div>
      </div>

      <div class="card p-3 mb-3 lunchbox-mode-card">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h5 class="mb-1">Pickup Service Mode</h5>
            <div class="small text-muted">Pickup item from shop and deliver to selected drop place.</div>
          </div>
          <div class="form-check form-switch m-0 pt-1">
            <input
              class="form-check-input"
              type="checkbox"
              id="pickupServiceMode"
              [(ngModel)]="pickupServiceMode"
              (ngModelChange)="onPickupServiceModeChange()"
            />
            <label class="form-check-label" for="pickupServiceMode">Enable</label>
          </div>
        </div>

        <div class="row g-2 mt-1" *ngIf="pickupServiceMode">
          <div class="col-md-6">
            <input class="form-control" placeholder="Shop name" [(ngModel)]="pickupShopName" />
          </div>
          <div class="col-md-6">
            <input class="form-control" placeholder="Shop contact" [(ngModel)]="pickupShopPhone" />
          </div>
          <div class="col-12">
            <input class="form-control" placeholder="Item details (size/qty/type)" [(ngModel)]="pickupItemDetails" />
          </div>
          <div class="col-12">
            <input class="form-control" placeholder="Pickup instructions (counter/gate/token)" [(ngModel)]="pickupShopInstructions" />
          </div>
        </div>
      </div>

      <h2 class="mb-3">Book Delivery</h2>
      <p class="text-muted">Uber-style matching: pick from live nearby captains and confirm instantly.</p>

      <div class="status-banner mb-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div class="status-banner-title">Women Safety Protection</div>
            <div class="small mb-1">Enable this mode to prioritize top-ranked captains first.</div>
            <div class="small text-muted" *ngIf="womenSafetyProtectionMode">This mode will stay enabled for your next login.</div>
          </div>
          <div class="form-check form-switch m-0 pt-1">
            <input
              class="form-check-input"
              type="checkbox"
              id="womenSafetyMode"
              [(ngModel)]="womenSafetyProtectionMode"
              (ngModelChange)="onWomenSafetyProtectionModeChange()"
            />
            <label class="form-check-label" for="womenSafetyMode">Enable</label>
          </div>
        </div>
      </div>

      <div class="status-banner mb-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div class="status-banner-title">Teenage Ride Mode</div>
            <div class="small mb-1">Useful for school/college teen rides with stricter contact preference.</div>
            <div class="small text-muted" *ngIf="teenageRideMode">Booking is set to Others with preferred captain alerts.</div>
          </div>
          <div class="form-check form-switch m-0 pt-1">
            <input
              class="form-check-input"
              type="checkbox"
              id="teenageRideMode"
              [(ngModel)]="teenageRideMode"
              (ngModelChange)="onTeenageRideModeChange()"
            />
            <label class="form-check-label" for="teenageRideMode">Enable</label>
          </div>
        </div>
      </div>

      <div class="status-banner mb-4" *ngIf="latestPendingAcceptanceBooking as pending">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div class="status-banner-title">{{ td('Captain acceptance pending') }}</div>
            <div class="small mb-1">
              {{ td('Ride') }} <strong>{{ pending.id }}</strong> {{ td('is waiting for captain approval.') }}
              <span *ngIf="pendingAcceptanceCount > 1">{{ td('You also have') }} {{ pendingAcceptanceCount - 1 }} {{ td('more pending request(s).') }}</span>
            </div>
            <div class="small text-muted">{{ td('Requested at') }} {{ pending.createdAt | date: 'short' }}</div>
          </div>
          <button class="btn btn-sm btn-warning" type="button" (click)="openTracking(pending)">{{ td('Open Pending Ride') }}</button>
        </div>
      </div>

      <div class="card p-3 mb-4 voice-command-card">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h6 class="mb-1">Voice Booking Assistant</h6>
            <small class="text-muted">Say: "Book trip from Hitech City Metro to Gachibowli Circle"</small>
          </div>
          <button
            type="button"
            class="btn btn-sm"
            [ngClass]="isVoiceListening ? 'btn-danger' : 'btn-outline-primary'"
            [disabled]="!voiceSupported"
            (click)="toggleVoiceBooking()"
          >
            {{ isVoiceListening ? 'Stop Listening' : 'Start Voice Booking' }}
          </button>
        </div>
        <div class="small mt-2" *ngIf="!voiceSupported">Voice command is not supported in this browser. Use Chrome/Edge for mic booking.</div>
        <div class="small mt-2 text-danger" *ngIf="micPermissionDenied">Microphone permission is blocked. Allow mic access in browser and retry.</div>
        <div class="small mt-2 text-primary" *ngIf="pendingVehicleSelection">
          Route captured. Say vehicle type now: car, bike, or auto. It will book immediately.
        </div>
        <div class="input-group input-group-sm mt-2">
          <input
            class="form-control"
            placeholder="Type command: book order from A to B"
            [(ngModel)]="voiceCommandText"
          />
          <button class="btn btn-outline-secondary" type="button" (click)="applyVoiceCommandText()">Apply Command</button>
        </div>
        <div class="small mt-2" *ngIf="voiceSupported && voiceTranscript">Heard: {{ voiceTranscript }}</div>
      </div>

      <div class="card p-3 mb-4 how-to-book-card">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h5 class="mb-0">How to Book (Video Guide)</h5>
          <small class="text-muted">Watch before your first booking</small>
        </div>
        <video class="how-to-book-video" controls preload="metadata" [poster]="howToBookPosterSrc">
          <source [src]="howToBookVideoSrc" type="video/mp4" />
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <small class="text-muted d-block mt-2">Tip: You can replace /assets/how-to-book.mp4 with your own app booking tutorial video.</small>
      </div>

      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card p-4">
            <h5 class="mb-3">Service Type</h5>
            <div class="d-flex flex-wrap gap-3 mb-4">
              <label class="form-check-label" *ngFor="let option of serviceTypes">
                <input
                  type="radio"
                  class="form-check-input me-2"
                  name="serviceType"
                  [value]="option"
                  [(ngModel)]="serviceType"
                  (ngModelChange)="onServiceTypeChange($event)"
                />
                {{ option }}
              </label>
            </div>

            <div class="food-suggestion-box mb-4" *ngIf="serviceType === 'food'">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <h6 class="mb-0">Suggested Nearby Hotels</h6>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <button type="button" class="btn btn-outline-secondary btn-sm" (click)="refreshNearbyHotelsLive(true)">Refresh Now</button>
                  <div class="btn-group btn-group-sm" role="group" aria-label="Food preference filter">
                    <button type="button" class="btn" [ngClass]="foodPreference === 'all' ? 'btn-danger' : 'btn-outline-secondary'" (click)="setFoodPreference('all')">All</button>
                    <button type="button" class="btn" [ngClass]="foodPreference === 'veg' ? 'btn-danger' : 'btn-outline-secondary'" (click)="setFoodPreference('veg')">Veg</button>
                    <button type="button" class="btn" [ngClass]="foodPreference === 'nonveg' ? 'btn-danger' : 'btn-outline-secondary'" (click)="setFoodPreference('nonveg')">Non-Veg</button>
                  </div>
                </div>
              </div>

              <div class="small text-muted mb-2" *ngIf="!showAllHotels">Showing top rated hotels nearest to your pickup location.</div>
              <div class="small text-muted mb-2" *ngIf="showAllHotels">Showing all nearby hotels nearest to your pickup location.</div>
              <div class="small text-muted mb-2">Live location: {{ pickupAddress || 'Pickup Point' }} • Updated: {{ nearbyHotelsLastUpdatedAt ? (nearbyHotelsLastUpdatedAt | date:'shortTime') : 'just now' }}</div>

              <div class="hotel-grid" *ngIf="displayedNearbyHotels.length > 0">
                <div class="hotel-card" *ngFor="let hotel of displayedNearbyHotels">
                  <div class="d-flex justify-content-between align-items-start">
                    <strong>{{ hotel.name }}</strong>
                    <span class="badge" [ngClass]="hotel.category === 'veg' ? 'text-bg-success' : 'text-bg-danger'">
                      {{ hotel.category === 'veg' ? 'VEG' : 'NON-VEG' }}
                    </span>
                  </div>
                  <div class="small text-muted">{{ hotel.distanceKm }} km • ETA {{ hotel.etaMinutes }} min</div>
                  <div class="small text-muted">{{ hotel.locationLabel }}</div>
                  <div class="small">⭐ {{ hotel.rating }} • {{ hotel.openNow ? 'Open now' : 'Opens soon' }}</div>
                </div>
              </div>

              <div class="mt-2" *ngIf="filteredNearbyHotels.length > topRatedNearbyHotels.length">
                <button
                  type="button"
                  class="btn btn-sm"
                  [ngClass]="showAllHotels ? 'btn-outline-secondary' : 'btn-danger'"
                  (click)="toggleHotelView()"
                >
                  {{ showAllHotels ? 'Show Top Rated' : 'Show All Nearby Hotels' }}
                </button>
              </div>
            </div>

            <h5 class="mb-2">Booking For</h5>
            <div class="d-flex flex-wrap gap-3 mb-3">
              <label class="form-check-label">
                <input type="radio" class="form-check-input me-2" name="bookingFor" value="self" [(ngModel)]="bookingFor" />
                Pick Myself
              </label>
              <label class="form-check-label">
                <input type="radio" class="form-check-input me-2" name="bookingFor" value="others" [(ngModel)]="bookingFor" />
                Others
              </label>
            </div>

            <div class="row g-2 mb-4" *ngIf="bookingFor === 'others'">
              <div class="col-md-6">
                <input class="form-control" placeholder="Recipient name" [(ngModel)]="recipientName" />
              </div>
              <div class="col-md-6">
                <input class="form-control" placeholder="Recipient phone" [(ngModel)]="recipientPhone" />
              </div>
            </div>

            <h5 class="mb-2">Booking Time</h5>
            <div class="d-flex flex-wrap gap-3 mb-3">
              <label class="form-check-label">
                <input type="radio" class="form-check-input me-2" name="bookingTimeMode" value="now" [(ngModel)]="bookingTimeMode" />
                Book Now
              </label>
              <label class="form-check-label">
                <input type="radio" class="form-check-input me-2" name="bookingTimeMode" value="later" [(ngModel)]="bookingTimeMode" />
                Later Booking
              </label>
            </div>
            <div class="mb-4" *ngIf="bookingTimeMode === 'later'">
              <input class="form-control" type="datetime-local" [(ngModel)]="scheduledAtLocal" />
              <small class="text-muted">Select a future date and time for scheduled delivery.</small>
            </div>

            <h5 class="mb-3">Payment</h5>
            <div class="d-flex flex-wrap gap-3 mb-4">
              <label class="form-check-label" *ngFor="let option of paymentMethods">
                <input type="radio" class="form-check-input me-2" name="paymentMethod" [value]="option" [(ngModel)]="paymentMethod" />
                {{ option }}
              </label>
            </div>

            <h5 class="mb-2">Pickup</h5>
            <div class="d-flex gap-2 mb-2 flex-wrap">
              <button class="btn btn-outline-primary btn-sm" type="button" (click)="allowCurrentLocation('pickup')">Allow Current Location</button>
              <input
                class="form-control form-control-sm preset-select"
                placeholder="Search pickup place (example: JBS)"
                list="pickup-location-list"
                [ngModel]="pickupSearchTerm"
                (ngModelChange)="onPickupSearchTermChange($event)"
              />
              <datalist id="pickup-location-list">
                <option *ngFor="let p of filteredPickupLocationSuggestions" [value]="p.name"></option>
              </datalist>
            </div>
            <input class="form-control mb-2" placeholder="Pickup address" [(ngModel)]="pickupAddress" />
            <div class="row g-2 mb-4">
              <div class="col"><input class="form-control" type="number" step="0.00001" placeholder="Pickup latitude" [(ngModel)]="pickupLat" (ngModelChange)="onPickupLocationInputChanged()" /></div>
              <div class="col"><input class="form-control" type="number" step="0.00001" placeholder="Pickup longitude" [(ngModel)]="pickupLng" (ngModelChange)="onPickupLocationInputChanged()" /></div>
            </div>

            <h5 class="mb-2">Drop Location</h5>
            <div class="d-flex gap-2 mb-2 flex-wrap">
              <button class="btn btn-outline-primary btn-sm" type="button" (click)="allowCurrentLocation('drop')">Allow Current Location</button>
              <input
                class="form-control form-control-sm preset-select"
                placeholder="Search drop place (example: Ameerpet)"
                list="drop-location-list"
                [ngModel]="dropSearchTerm"
                (ngModelChange)="onDropSearchTermChange($event)"
              />
              <datalist id="drop-location-list">
                <option *ngFor="let p of filteredDropLocationSuggestions" [value]="p.name"></option>
              </datalist>
            </div>
            <input class="form-control mb-2" placeholder="Drop address" [(ngModel)]="dropAddress" />
            <div class="row g-2 mb-3">
              <div class="col"><input class="form-control" type="number" step="0.00001" placeholder="Drop latitude" [(ngModel)]="dropLat" /></div>
              <div class="col"><input class="form-control" type="number" step="0.00001" placeholder="Drop longitude" [(ngModel)]="dropLng" /></div>
            </div>

            <div class="trip-summary mb-3" *ngIf="hasRouteCoordinates">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <div class="trip-summary-title">Trip Summary</div>
                <span class="badge rounded-pill" [ngClass]="isShortTrip ? 'text-bg-success' : 'text-bg-primary'">
                  {{ isShortTrip ? 'Pickup and drop are near' : 'Standard distance trip' }}
                </span>
              </div>
              <div class="trip-summary-grid">
                <div>
                  <div class="trip-summary-label">Distance</div>
                  <div class="trip-summary-value">{{ routeDistanceKm | number: '1.2-2' }} km</div>
                </div>
                <div>
                  <div class="trip-summary-label">ETA</div>
                  <div class="trip-summary-value">{{ routeEtaMinutes }} min</div>
                </div>
                <div>
                  <div class="trip-summary-label">Fare Preview</div>
                  <div class="trip-summary-value">₹{{ totalEstimatedFare }}</div>
                </div>
              </div>
              <div class="trip-summary-route mt-2">
                <div><strong>From:</strong> {{ pickupAddress || 'Pickup Point' }}</div>
                <div><strong>To:</strong> {{ dropAddress || 'Drop Point' }}</div>
              </div>
              <div class="trip-summary-note" *ngIf="isShortTrip">
                Minimum fare applied for short-distance ride.
              </div>
              <div class="trip-summary-hint" *ngIf="isVeryShortTrip">
                Recommended: bike or walkable distance.
              </div>
            </div>

            <h5 class="mb-2">Choose Vehicle Type</h5>
            <p class="text-muted small mb-2">Captain list updates instantly based on your selected vehicle.</p>
            <div class="vehicle-grid mb-4">
              <button
                type="button"
                class="vehicle-card"
                [class.selected]="vehicleType === option.type"
                *ngFor="let option of bookingVehicleOptions"
                (click)="onVehicleTypeChange(option.type)"
              >
                <div class="vehicle-icon">{{ option.icon }}</div>
                <div class="vehicle-name">{{ option.label }}</div>
              </button>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Nearby Captains ({{ filteredNearbyCaptains.length }})</h5>
              <button class="btn btn-outline-secondary btn-sm" type="button" (click)="refreshNearbyCaptains()">Refresh</button>
            </div>
            <p class="small text-muted mb-2" *ngIf="selectedCaptain">Selected Captain({{ selectedCaptain.name }}) • ETA {{ selectedCaptain.etaMinutes }} min</p>
            <div class="captain-grid mb-4">
              <label
                class="captain-card"
                [class.selected]="selectedCaptain?.id === captain.id"
                *ngFor="let captain of filteredNearbyCaptains; let i = index"
              >
                <input
                  type="radio"
                  class="form-check-input me-2"
                  name="captain"
                  [value]="captain.id"
                  [checked]="selectedCaptain?.id === captain.id"
                  (change)="selectCaptain(captain)"
                />
                <div class="w-100">
                  <div class="d-flex justify-content-between">
                    <strong>
                      {{ vehicleIcon(captain.vehicleType) }} {{ captain.name }}
                      <span class="badge text-bg-warning ms-1" *ngIf="womenSafetyProtectionMode && i < 2">Top Rank</span>
                    </strong>
                    <span class="badge" [ngClass]="statusBadge(captain.availability)">{{ td(captain.availability) }}</span>
                  </div>
                  <small class="text-muted">{{ captain.vehicleLabel }} • {{ captain.rating }}★ • {{ captain.distanceKm }} km</small>
                  <div class="small">ETA {{ captain.etaMinutes }} min • {{ captain.phone }}</div>
                  <div class="small captain-pin" *ngIf="captain.locationLabel">
                    <span class="pin-symbol">📍</span>
                    <span>{{ captain.locationLabel }}</span>
                  </div>
                </div>
              </label>
            </div>
            <div class="alert alert-warning mb-4" *ngIf="filteredNearbyCaptains.length === 0">
              No nearby captains available for selected vehicle type. Try another vehicle or refresh.
            </div>

            <div class="vehicle-map-card mb-4">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <h5 class="mb-0">Vehicle Location Map</h5>
                <div class="d-flex align-items-center gap-2">
                  <span class="small text-muted">Live Track</span>
                  <div class="form-check form-switch m-0">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id="liveTrackMode"
                      [(ngModel)]="liveTrackMode"
                      (ngModelChange)="onLiveTrackModeChange()"
                    />
                  </div>
                </div>
              </div>
              <div class="small text-muted mb-2">
                Pickup and drop are fixed. Captain pins update automatically when live tracking is enabled.
              </div>

              <div class="vehicle-map-canvas" *ngIf="hasMapPoints; else mapNotReady">
                <div
                  class="map-pin pickup"
                  [style.left.%]="mapLeftPercent(pickupLng)"
                  [style.top.%]="mapTopPercent(pickupLat)"
                  title="Pickup"
                >
                  <span>📍</span>
                </div>

                <div
                  class="map-pin drop"
                  [style.left.%]="mapLeftPercent(dropLng)"
                  [style.top.%]="mapTopPercent(dropLat)"
                  title="Drop"
                >
                  <span>🏁</span>
                </div>

                <button
                  type="button"
                  class="map-pin captain"
                  [class.selected]="selectedCaptain?.id === captain.id"
                  *ngFor="let captain of mapCaptains"
                  [style.left.%]="mapLeftPercent(captain.locationLng || dropLng)"
                  [style.top.%]="mapTopPercent(captain.locationLat || dropLat)"
                  (click)="selectCaptain(captain)"
                  [title]="captain.name + ' • ETA ' + captain.etaMinutes + ' min'"
                >
                  <span>{{ vehicleIcon(captain.vehicleType) }}</span>
                </button>
              </div>

              <ng-template #mapNotReady>
                <div class="alert alert-light border mb-0">Map is waiting for location coordinates.</div>
              </ng-template>
            </div>

            <h5 class="mb-2">Captain Notification Audience</h5>
            <div class="d-flex flex-wrap gap-3 mb-2">
              <label class="form-check-label">
                <input type="radio" class="form-check-input me-2" name="notificationTarget" value="preferred" [(ngModel)]="notificationTarget" />
                Preferred Captain Only
              </label>
              <label class="form-check-label">
                <input type="radio" class="form-check-input me-2" name="notificationTarget" value="all" [(ngModel)]="notificationTarget" />
                All Captains
              </label>
            </div>
            <div class="small text-muted mb-4" *ngIf="notificationTarget === 'preferred' && selectedCaptain">
              Notifications with sound will be sent only to Captain({{ selectedCaptain.name }}).
            </div>
            <div class="small text-muted mb-4" *ngIf="notificationTarget === 'all'">
              Notifications with sound will be sent to all captains.
            </div>

            <h5 class="mb-2">Ride Notes (optional)</h5>
            <input class="form-control mb-3" placeholder="Ex: Ring doorbell, fragile package, call on arrival" [(ngModel)]="rideNotes" />

            <div class="fare-box mb-4">
              <div><strong>Estimated Fare:</strong> ₹{{ totalEstimatedFare }}</div>
              <small class="text-muted">Calculated using distance + traffic + weather + vehicle type.</small>
              <div class="small mt-2">Distance fare: ₹{{ fareBreakdown.distanceFare }}</div>
              <div class="small">Traffic: {{ trafficCondition | titlecase }} (x{{ fareBreakdown.trafficMultiplier }})</div>
              <div class="small">Weather: {{ weatherCondition | titlecase }} (x{{ fareBreakdown.weatherMultiplier }})</div>
              <div class="small text-danger" *ngIf="availabilitySurcharge > 0">Captain availability fee: +₹{{ availabilitySurcharge }}</div>
              <div class="small text-muted mt-1">{{ fareStatusMessage }}</div>
            </div>

            <div *ngIf="selectedCaptain" class="d-flex gap-2 mb-4 flex-wrap">
              <a class="btn btn-outline-primary btn-sm" [href]="callLink(selectedCaptain.phone)">Call Captain</a>
              <a class="btn btn-outline-success btn-sm" [href]="whatsAppLink(selectedCaptain.phone)" target="_blank" rel="noopener">WhatsApp Captain</a>
            </div>

            <button class="btn btn-danger" (click)="bookNow()">
              {{ bookingTimeMode === 'later' ? 'Schedule Booking' : 'Book Now' }}
            </button>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card p-4 mb-3" *ngIf="currentUser as u">
            <div class="d-flex align-items-center gap-3">
              <img [src]="profileImageUrl" (error)="onProfileImageError($event)" alt="Profile" class="profile-image" />
              <div>
                <h6 class="mb-0">{{ u.displayName }}</h6>
                <small class="text-muted">{{ u.username }} • {{ u.role | titlecase }}</small>
              </div>
            </div>
            <hr class="my-3" />
            <label class="form-label small mb-1">Upload DP (profile photo)</label>
            <input
              type="file"
              class="form-control form-control-sm mb-2"
              accept="image/*"
              (change)="onProfileDpFileSelected($event)"
            />
            <button
              type="button"
              class="btn btn-sm btn-primary"
              [disabled]="!selectedProfileImage || savingProfileImage"
              (click)="saveProfileDp()"
            >
              {{ savingProfileImage ? 'Saving...' : 'Save DP' }}
            </button>
          </div>

          <div class="card p-4 mb-3">
            <h5 class="mb-2">Popular Places Near You</h5>
            <small class="text-muted d-block mb-2">Based on your live location after login</small>
            <div *ngIf="popularPlaces.length === 0" class="text-muted small">Turn on location to see nearby popular places.</div>
            <div class="popular-place" *ngFor="let place of popularPlaces">
              <div class="fw-semibold">{{ place.name }}</div>
              <div class="small text-muted">{{ place.distanceKm }} km • ETA {{ place.etaMinutes }} min</div>
              <div class="small">Captain({{ place.captainHint }})</div>
            </div>
          </div>

          <div class="card p-4 bg-light">
            <h5>Included Features</h5>
            <ul class="mb-0">
              <li>Login to logout session flow</li>
              <li>Service type radio selection</li>
              <li>Payment and vehicle options</li>
              <li>15 nearby captains realtime style picker</li>
              <li>ETA, distance, rating and availability cards</li>
              <li>Live fare estimate</li>
              <li>Pickup and drop coordinates</li>
              <li>Live map tracking</li>
              <li>Pick myself or others</li>
              <li>Book now or later scheduling</li>
              <li>Booking history with one-click re-book</li>
              <li>Customer OTP starts ride directly</li>
              <li>Customer gets ride-start notification</li>
            </ul>
          </div>

          <div class="card p-4 mt-3">
            <h5 class="mb-3">Booking History</h5>
            <div class="d-flex flex-wrap gap-2 mb-2">
              <button type="button" class="btn btn-sm" [ngClass]="historyFilter === 'all' ? 'btn-danger' : 'btn-outline-secondary'" (click)="setHistoryFilter('all')">All</button>
              <button type="button" class="btn btn-sm" [ngClass]="historyFilter === 'completed' ? 'btn-danger' : 'btn-outline-secondary'" (click)="setHistoryFilter('completed')">Completed</button>
              <button type="button" class="btn btn-sm" [ngClass]="historyFilter === 'cancelled' ? 'btn-danger' : 'btn-outline-secondary'" (click)="setHistoryFilter('cancelled')">Cancelled</button>
              <button type="button" class="btn btn-sm" [ngClass]="historyFilter === 'scheduled' ? 'btn-danger' : 'btn-outline-secondary'" (click)="setHistoryFilter('scheduled')">Scheduled</button>
            </div>
            <input
              class="form-control form-control-sm mb-3"
              placeholder="Search by booking ID or recipient"
              [(ngModel)]="historySearch"
            />
            <div *ngIf="bookingHistory.length === 0" class="text-muted small">No past bookings yet.</div>
            <div class="text-muted small mb-2" *ngIf="bookingHistory.length > 0">Showing {{ filteredBookingHistory.length }} of {{ bookingHistory.length }}</div>
            <div class="history-list" *ngIf="bookingHistory.length > 0">
              <div class="history-item" *ngFor="let item of filteredBookingHistory">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div class="fw-semibold">{{ item.id }} • {{ item.serviceType | titlecase }}</div>
                    <div class="small text-muted">{{ item.pickup.address }} → {{ item.drop.address }}</div>
                    <div class="small text-muted" *ngIf="item.bookingFor === 'others'">Recipient: {{ item.recipientName }} ({{ item.recipientPhone }})</div>
                    <div class="small text-muted">{{ item.createdAt | date: 'short' }}</div>
                    <div class="small text-muted" *ngIf="item.isScheduled && item.scheduledAt">Scheduled: {{ item.scheduledAt | date: 'short' }}</div>
                  </div>
                  <span class="badge" [ngClass]="historyStatusBadge(item.status)">{{ historyStatusLabel(item.status) }}</span>
                </div>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-sm btn-outline-primary" type="button" (click)="rebookFromHistory(item)">Re-book</button>
                  <button class="btn btn-sm btn-outline-dark" type="button" (click)="openTracking(item)">Track</button>
                </div>
              </div>
            </div>
            <div class="text-muted small" *ngIf="bookingHistory.length > 0 && filteredBookingHistory.length === 0">
              No bookings match this filter/search.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .captain-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 10px;
        max-height: 360px;
        overflow-y: auto;
      }

      .vehicle-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .vehicle-card {
        border: 1px solid #d0d7de;
        border-radius: 12px;
        padding: 10px;
        background: #fff;
        display: grid;
        place-items: center;
        gap: 4px;
      }

      .vehicle-card.selected {
        border-color: #dc3545;
        box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.15);
        background: #fff4f5;
      }

      .vehicle-icon {
        font-size: 24px;
        line-height: 1;
      }

      .vehicle-name {
        font-weight: 600;
        font-size: 13px;
      }

      .captain-card {
        border: 1px solid #d0d7de;
        border-radius: 12px;
        padding: 10px;
        display: flex;
        gap: 8px;
        cursor: pointer;
        background: #fff;
      }

      .captain-card.selected {
        border-color: #dc3545;
        box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.15);
      }

      .captain-pin {
        margin-top: 4px;
        color: #495057;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .pin-symbol {
        font-size: 13px;
        line-height: 1;
      }

      .fare-box {
        border: 1px dashed #adb5bd;
        border-radius: 10px;
        padding: 10px;
        background: #f8f9fa;
      }

      .trip-summary {
        border: 1px solid #dbeafe;
        border-radius: 12px;
        padding: 12px;
        background: #f8fbff;
      }

      .trip-summary-title {
        font-weight: 700;
        color: #0f172a;
      }

      .trip-summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .trip-summary-label {
        font-size: 12px;
        color: #64748b;
      }

      .trip-summary-value {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }

      .trip-summary-route {
        font-size: 12px;
        color: #334155;
      }

      .trip-summary-note {
        margin-top: 8px;
        font-size: 12px;
        color: #166534;
        font-weight: 600;
      }

      .trip-summary-hint {
        margin-top: 6px;
        font-size: 12px;
        color: #92400e;
        font-weight: 600;
      }

      .preset-select {
        min-width: 220px;
        max-width: 320px;
      }

      .history-list {
        display: grid;
        gap: 10px;
        max-height: 420px;
        overflow-y: auto;
      }

      .history-item {
        border: 1px solid #dee2e6;
        border-radius: 10px;
        padding: 10px;
        background: #fff;
      }

      .food-suggestion-box {
        border: 1px solid #e9ecef;
        border-radius: 12px;
        background: #fcfcfd;
        padding: 12px;
      }

      .how-to-book-card {
        border: 1px solid #dee2e6;
        background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
      }

      .how-to-book-video {
        width: 100%;
        max-height: 360px;
        border-radius: 12px;
        border: 1px solid #dee2e6;
        background: #000;
      }

      .hotel-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
      }

      .hotel-card {
        border: 1px solid #dee2e6;
        border-radius: 10px;
        padding: 10px;
        background: #fff;
      }

      .profile-image {
        width: 58px;
        height: 58px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #dee2e6;
        background: #fff;
      }

      .popular-place {
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 8px;
        background: #fff;
      }

      .voice-command-card {
        border: 1px solid #dbeafe;
        background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
      }

      .status-banner {
        border: 1px solid #ffe69c;
        border-left: 5px solid #ffc107;
        border-radius: 12px;
        padding: 12px;
        background: linear-gradient(135deg, #fff8e1 0%, #fffdf5 100%);
      }

      .status-banner-title {
        font-size: 14px;
        font-weight: 700;
        color: #8a6d00;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .vehicle-map-card {
        border: 1px solid #dbeafe;
        border-radius: 12px;
        padding: 12px;
        background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
      }

      .vehicle-map-canvas {
        position: relative;
        height: 240px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        background:
          radial-gradient(circle at 10% 20%, rgba(147, 197, 253, 0.22) 0, transparent 35%),
          linear-gradient(135deg, #f8fafc, #e2e8f0);
        overflow: hidden;
      }

      .map-pin {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 5px 12px rgba(2, 6, 23, 0.22);
      }

      .map-pin.pickup {
        background: #0ea5e9;
        color: #ffffff;
        z-index: 2;
      }

      .map-pin.drop {
        background: #22c55e;
        color: #ffffff;
        z-index: 2;
      }

      .map-pin.captain {
        background: #f97316;
        color: #ffffff;
        z-index: 3;
        cursor: pointer;
      }

      .map-pin.captain.selected {
        background: #111827;
        box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.25), 0 8px 16px rgba(2, 6, 23, 0.35);
      }

      @media (max-width: 576px) {
        .captain-grid {
          grid-template-columns: 1fr;
          max-height: 320px;
        }

        .vehicle-grid {
          grid-template-columns: 1fr;
        }

        .trip-summary-grid {
          grid-template-columns: 1fr;
        }

        .preset-select {
          min-width: 0;
          max-width: 100%;
          width: 100%;
        }

        .hotel-grid {
          grid-template-columns: 1fr;
        }

        .how-to-book-video {
          max-height: 240px;
        }

        .vehicle-map-canvas {
          height: 210px;
        }

        .food-suggestion-box .btn-group {
          width: 100%;
        }

        .food-suggestion-box .btn-group .btn {
          flex: 1 1 0;
        }
      }

      @media (max-width: 390px) {
        .trip-summary,
        .status-banner,
        .food-suggestion-box,
        .vehicle-map-card {
          padding: 10px;
        }

        .captain-card,
        .hotel-card,
        .history-item,
        .popular-place {
          padding: 9px;
        }

        .map-pin {
          width: 24px;
          height: 24px;
        }
      }

      @media (min-width: 768px) and (max-width: 991.98px) {
        .captain-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .hotel-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `
  ]
})
export class BookingComponent implements OnDestroy {
  currentUser: AppUser | null = null;
  profileImageUrl = 'https://ui-avatars.com/api/?name=User&background=f0f4ff&color=0f172a&size=128';
  selectedProfileImage = '';
  savingProfileImage = false;
  popularPlaces: PopularPlace[] = [];
  howToBookVideoSrc = '/assets/how-to-book.mp4';
  howToBookPosterSrc = '/assets/login-banner.svg';
  serviceTypes: ServiceType[] = ['food', 'parcel', 'grocery', 'medicine', 'documents'];
  paymentMethods: PaymentMethod[] = ['cash', 'card', 'upi', 'wallet'];

  serviceType: ServiceType = 'parcel';
  paymentMethod: PaymentMethod = 'upi';
  bookingFor: 'self' | 'others' = 'self';
  recipientName = '';
  recipientPhone = '';
  bookingTimeMode: 'now' | 'later' = 'now';
  notificationTarget: 'all' | 'preferred' = 'preferred';
  womenSafetyProtectionMode = false;
  teenageRideMode = false;
  scheduledAtLocal = '';
  vehicleType: VehicleType = 'bike';
  bookingVehicleOptions: Array<{ type: VehicleType; label: string; icon: string }> = [
    { type: 'bike', label: 'Bike', icon: '🏍️' },
    { type: 'auto', label: 'Auto', icon: '🛺' },
    { type: 'car', label: 'Car', icon: '🚗' }
  ];
  nearbyCaptains: NearbyCaptain[] = [];
  selectedCaptain: NearbyCaptain | null = null;
  estimatedFare = 120;
  trafficCondition: TrafficCondition = 'medium';
  weatherCondition: WeatherCondition = 'clear';
  fareBreakdown = {
    baseFare: 55,
    distanceFare: 65,
    trafficMultiplier: 1.1,
    weatherMultiplier: 1,
    vehicleMultiplier: 1,
    total: 120
  };
  fareStatusMessage = 'Using local estimate.';
  nearbyHotels: NearbyHotel[] = [];
  nearbyHotelsLastUpdatedAt: Date | null = null;
  foodPreference: 'all' | 'veg' | 'nonveg' = 'all';
  showAllHotels = false;
  rideNotes = '';
  lunchBoxDeliveryMode = false;
  pickupServiceMode = false;
  pickupShopName = '';
  pickupShopPhone = '';
  pickupItemDetails = '';
  pickupShopInstructions = '';
  lunchStudentName = '';
  lunchStudentClass = '';
  lunchSchoolName = '';
  lunchSchoolAddress = '';
  lunchGuardianPhone = '';
  lunchBoxDetails = '';
  lunchDeliveryInstructions = '';
  locationPresets: LocationPreset[] = [
    { name: 'Hitech City Metro', lat: 17.4483, lng: 78.3915 },
    { name: 'Gachibowli Circle', lat: 17.4401, lng: 78.3489 },
    { name: 'Madhapur Tech Park', lat: 17.4526, lng: 78.3928 },
    { name: 'Banjara Hills Road 12', lat: 17.4148, lng: 78.4359 },
    { name: 'Secunderabad Station', lat: 17.4399, lng: 78.4983 }
  ];
  pickupLocationSuggestions: LocationPreset[] = [];
  dropLocationSuggestions: LocationPreset[] = [];
  selectedPickupPreset = '';
  selectedDropPreset = '';
  pickupSearchTerm = '';
  dropSearchTerm = '';
  bookingHistory: Booking[] = [];
  historyFilter: 'all' | 'completed' | 'cancelled' | 'scheduled' = 'all';
  historySearch = '';
  private refreshHandle: ReturnType<typeof setInterval> | null = null;
  private nearbyHotelsRefreshHandle: ReturnType<typeof setInterval> | null = null;
  private liveTrackHandle: ReturnType<typeof setInterval> | null = null;
  private historySubscription?: Subscription;
  private routeQueryParamsSubscription?: Subscription;
  private liveFareRequestCounter = 0;
  private nearbyHotelsRequestCounter = 0;
  private nearbyHotelsApiWarningShown = false;
  private speechRecognition: any | null = null;
  voiceSupported = false;
  isVoiceListening = false;
  voiceTranscript = '';
  voiceCommandText = '';
  micPermissionDenied = false;
  private captainFallbackNoticeShown = false;
  pendingVehicleSelection = false;
  private pendingVoiceTrip?: { from: string; to: string; note?: string };
  availabilitySurcharge = 0;
  liveTrackMode = true;

  pickupAddress = 'Pickup Point';
  pickupLat = 17.4372;
  pickupLng = 78.4011;

  dropAddress = 'Drop Point';
  dropLat = 17.4504;
  dropLng = 78.3827;

  constructor(
    private auth: AuthService,
    private bookingService: BookingService,
    private languageService: LanguageService,
    private notifications: NotificationService,
    private pricingService: PricingService,
    private placesService: PlacesService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.currentUser = this.auth.getCurrentUser();
    this.loadWomenSafetyProtectionMode();
    this.profileImageUrl = this.currentUser?.profileImageUrl || this.buildUserAvatar(this.currentUser);
    this.initializeVoiceBooking();
    this.loadLiveLocationDefaults();
    this.refreshNearbyCaptains();
    this.refreshHandle = setInterval(() => this.refreshNearbyCaptains(), 12000);
    this.refreshNearbyHotelsLive();
    this.popularPlaces = this.buildPopularPlaces();
    this.refreshLocationSuggestions();
    this.ensureNearbyHotelsHeartbeat();

    const user = this.auth.getCurrentUser();
    if (user) {
      this.historySubscription = this.bookingService.getBookingsForUser$(user.id).subscribe((items) => {
        this.bookingHistory = [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.refreshLocationSuggestions();
      });
    }

    this.routeQueryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      const history = params.get('history');
      const bookingId = params.get('bookingId');
      const appliedCompletedFilter = history === 'completed';
      const service = params.get('service');
      const womenSafety = params.get('womenSafety');
      const teenageRide = params.get('teenRide');
      const vehicle = params.get('vehicle');
      const lunchBox = params.get('lunchBox');
      const pickupService = params.get('pickupService');
      const bookingFor = params.get('bookingFor');
      const rideMode = params.get('rideMode');

      if (appliedCompletedFilter) {
        this.historyFilter = 'completed';
      }

      if (bookingId) {
        this.historySearch = bookingId;
      }

      if (service && this.serviceTypes.includes(service as ServiceType)) {
        this.onServiceTypeChange(service as ServiceType);
      }

      if (vehicle && this.bookingVehicleOptions.some((option) => option.type === vehicle)) {
        this.onVehicleTypeChange(vehicle as VehicleType);
      }

      if (womenSafety === '1' && !this.womenSafetyProtectionMode) {
        this.womenSafetyProtectionMode = true;
        this.onWomenSafetyProtectionModeChange();
      }

      if (teenageRide === '1' && !this.teenageRideMode) {
        this.teenageRideMode = true;
        this.onTeenageRideModeChange();
      }

      if (lunchBox === '1' && !this.lunchBoxDeliveryMode) {
        this.lunchBoxDeliveryMode = true;
        this.onLunchBoxDeliveryModeChange();
      }

      if (pickupService === '1' && !this.pickupServiceMode) {
        this.pickupServiceMode = true;
        this.onPickupServiceModeChange();
      }

      if (bookingFor === 'others') {
        this.bookingFor = 'others';
      }

      if (rideMode === 'later') {
        this.bookingTimeMode = 'later';
        if (!this.scheduledAtLocal) {
          const nextHour = new Date(Date.now() + 60 * 60 * 1000);
          nextHour.setMinutes(0, 0, 0);
          this.scheduledAtLocal = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        }
      }

      if (appliedCompletedFilter || bookingId) {
        this.notifications.push('Showing your completed ride in booking history.', 'success');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }

    if (this.nearbyHotelsRefreshHandle) {
      clearInterval(this.nearbyHotelsRefreshHandle);
      this.nearbyHotelsRefreshHandle = null;
    }

    if (this.liveTrackHandle) {
      clearInterval(this.liveTrackHandle);
      this.liveTrackHandle = null;
    }

    this.historySubscription?.unsubscribe();
    this.routeQueryParamsSubscription?.unsubscribe();

    if (this.speechRecognition) {
      this.speechRecognition.onresult = null;
      this.speechRecognition.onerror = null;
      this.speechRecognition.onend = null;
      this.speechRecognition.stop();
    }
  }

  toggleVoiceBooking(): void {
    if (!this.voiceSupported || !this.speechRecognition) {
      this.notifications.push('Voice booking is not supported on this browser.', 'warning');
      return;
    }

    if (this.isVoiceListening) {
      this.speechRecognition.stop();
      return;
    }

    this.requestMicPermissionAndStart();
  }

  applyVoiceCommandText(): void {
    const command = this.voiceCommandText.trim();
    if (!command) {
      this.notifications.push('Type a command like: book order from A to B', 'warning');
      return;
    }

    this.voiceTranscript = command;
    this.voiceCommandText = '';
    this.handleVoiceCommand(command);
  }

  refreshNearbyCaptains(): void {
    this.auth.getCaptains().subscribe({
      next: (captains) => {
        const mapped = captains.map((captain, index) => this.toNearbyCaptain(captain, index));
        this.nearbyCaptains = mapped.length > 0 ? mapped : this.generateFallbackNearbyCaptains();

        if (mapped.length === 0 && !this.captainFallbackNoticeShown) {
          this.captainFallbackNoticeShown = true;
          this.notifications.push('Live captains unavailable. Showing nearby fallback captains.', 'warning');
        }

        const matchesVehicle = this.rankNearbyCaptains(
          this.nearbyCaptains.filter((captain) => captain.vehicleType === this.vehicleType)
        );
        const currentSelected = this.selectedCaptain
          ? matchesVehicle.find((captain) => captain.id === this.selectedCaptain?.id && this.isCaptainAvailable(captain))
          : undefined;
        const firstAvailable = currentSelected || this.pickBestAvailableCaptain(matchesVehicle);

        if (firstAvailable) {
          this.selectCaptain(firstAvailable);
        } else {
          this.selectedCaptain = null;
        }

        this.popularPlaces = this.buildPopularPlaces();
        this.ensureLiveTrackHeartbeat();
      },
      error: () => {
        this.nearbyCaptains = this.generateFallbackNearbyCaptains();
        const matchesVehicle = this.rankNearbyCaptains(
          this.nearbyCaptains.filter((captain) => captain.vehicleType === this.vehicleType)
        );
        this.selectedCaptain = this.pickBestAvailableCaptain(matchesVehicle) || null;

        if (!this.captainFallbackNoticeShown) {
          this.captainFallbackNoticeShown = true;
          this.notifications.push('Captain API not reachable. Showing nearby fallback captains.', 'warning');
        }

        this.popularPlaces = this.buildPopularPlaces();
        this.ensureLiveTrackHeartbeat();
      }
    });
  }

  onLiveTrackModeChange(): void {
    const modeLabel = this.liveTrackMode ? 'enabled' : 'disabled';
    this.notifications.push(`Live track mode ${modeLabel}.`, 'info');
    this.ensureLiveTrackHeartbeat();
  }

  get filteredNearbyCaptains(): NearbyCaptain[] {
    const matchingVehicle = this.nearbyCaptains.filter((captain) => captain.vehicleType === this.vehicleType);
    return this.rankNearbyCaptains(matchingVehicle);
  }

  get mapCaptains(): NearbyCaptain[] {
    return this.filteredNearbyCaptains
      .filter((captain) => Number.isFinite(Number(captain.locationLat)) && Number.isFinite(Number(captain.locationLng)))
      .slice(0, 15);
  }

  get hasMapPoints(): boolean {
    return this.hasRouteCoordinates;
  }

  mapLeftPercent(lng: number): number {
    const bounds = this.mapBounds();
    if (!Number.isFinite(lng) || bounds.lngRange <= 0) {
      return 50;
    }
    return this.clamp(((lng - bounds.minLng) / bounds.lngRange) * 100, 4, 96);
  }

  mapTopPercent(lat: number): number {
    const bounds = this.mapBounds();
    if (!Number.isFinite(lat) || bounds.latRange <= 0) {
      return 50;
    }
    return this.clamp(((bounds.maxLat - lat) / bounds.latRange) * 100, 6, 94);
  }

  get totalEstimatedFare(): number {
    return Math.max(0, Math.round(this.estimatedFare + this.availabilitySurcharge));
  }

  get hasRouteCoordinates(): boolean {
    return Number.isFinite(Number(this.pickupLat))
      && Number.isFinite(Number(this.pickupLng))
      && Number.isFinite(Number(this.dropLat))
      && Number.isFinite(Number(this.dropLng));
  }

  get routeDistanceKm(): number {
    if (!this.hasRouteCoordinates) {
      return 0;
    }
    return this.calculateRouteDistance(
      Number(this.pickupLat),
      Number(this.pickupLng),
      Number(this.dropLat),
      Number(this.dropLng)
    );
  }

  get isShortTrip(): boolean {
    return this.routeDistanceKm > 0 && this.routeDistanceKm <= 1;
  }

  get isVeryShortTrip(): boolean {
    return this.routeDistanceKm > 0 && this.routeDistanceKm <= 0.6;
  }

  get routeEtaMinutes(): number {
    const distance = this.routeDistanceKm;
    if (!distance) {
      return 0;
    }
    const averageCitySpeedKmPerHour = 22;
    return Math.max(3, Math.round((distance / averageCitySpeedKmPerHour) * 60));
  }

  onVehicleTypeChange(vehicleType: VehicleType): void {
    this.vehicleType = vehicleType;
    const list = this.filteredNearbyCaptains;
    if (list.length === 0) {
      this.selectedCaptain = null;
      this.updateEstimatedFare(2.5, this.vehicleType);
      return;
    }
    const next = this.pickBestAvailableCaptain(list);
    if (!next) {
      this.selectedCaptain = null;
      this.updateEstimatedFare(2.5, this.vehicleType);
      return;
    }
    this.selectCaptain(next);
  }

  selectCaptain(captain: NearbyCaptain | undefined): void {
    if (!captain) {
      this.selectedCaptain = null;
      return;
    }
    if (!this.isCaptainAvailable(captain)) {
      this.selectedCaptain = null;
      return;
    }
    this.selectedCaptain = captain;
    this.vehicleType = captain.vehicleType;
    this.updateEstimatedFare(captain.distanceKm, captain.vehicleType);
    this.clearAvailabilitySurcharge();
  }

  onServiceTypeChange(serviceType: ServiceType): void {
    this.serviceType = serviceType;
    this.showAllHotels = false;
    this.refreshNearbyHotelsLive(true);
    this.ensureNearbyHotelsHeartbeat();
  }

  onPickupLocationInputChanged(): void {
    if (this.serviceType !== 'food') {
      return;
    }

    this.refreshNearbyHotelsLive(true);
  }

  setFoodPreference(preference: 'all' | 'veg' | 'nonveg'): void {
    this.foodPreference = preference;
    this.showAllHotels = false;
  }

  onWomenSafetyProtectionModeChange(): void {
    this.persistWomenSafetyProtectionMode();
    const modeLabel = this.womenSafetyProtectionMode ? 'enabled' : 'disabled';
    this.notifications.push(`Women Safety Protection mode ${modeLabel}.`, 'info');

    const bestCaptain = this.pickBestAvailableCaptain(this.filteredNearbyCaptains);
    if (bestCaptain) {
      this.selectCaptain(bestCaptain);
    }
  }

  onTeenageRideModeChange(): void {
    if (this.teenageRideMode) {
      this.bookingFor = 'others';
      this.notificationTarget = 'preferred';
      if (!this.rideNotes.toLowerCase().includes('teenage ride mode')) {
        this.rideNotes = `${this.rideNotes ? `${this.rideNotes} | ` : ''}Teenage Ride Mode`;
      }
      this.notifications.push('Teenage Ride Mode enabled. Booking is set for Others with preferred captain alerts.', 'info');
      return;
    }

    this.notifications.push('Teenage Ride Mode disabled.', 'info');
  }

  get filteredNearbyHotels(): NearbyHotel[] {
    if (this.foodPreference === 'all') {
      return this.nearbyHotels;
    }

    return this.nearbyHotels.filter((hotel) => hotel.category === this.foodPreference);
  }

  get topRatedNearbyHotels(): NearbyHotel[] {
    return [...this.filteredNearbyHotels]
      .sort((a, b) => {
        if (b.rating === a.rating) {
          return a.distanceKm - b.distanceKm;
        }
        return b.rating - a.rating;
      })
      .slice(0, 3);
  }

  get displayedNearbyHotels(): NearbyHotel[] {
    return this.showAllHotels ? this.filteredNearbyHotels : this.topRatedNearbyHotels;
  }

  toggleHotelView(): void {
    this.showAllHotels = !this.showAllHotels;
  }

  vehicleIcon(vehicleType: VehicleType): string {
    if (vehicleType === 'bike' || vehicleType === 'scooter') {
      return '🏍️';
    }
    if (vehicleType === 'auto') {
      return '🛺';
    }
    if (vehicleType === 'car') {
      return '🚗';
    }
    if (vehicleType === 'van') {
      return '🚐';
    }
    return '🚚';
  }

  statusBadge(status: NearbyCaptain['availability']): string {
    if (status === 'available') {
      return 'text-bg-success';
    }
    if (status === 'arriving') {
      return 'text-bg-info';
    }
    return 'text-bg-secondary';
  }

  historyStatusLabel(status: Booking['status']): string {
    const labels: Record<Booking['status'], string> = {
      created: 'Waiting to Start',
      assigned: 'Captain Assigned',
      pickup_in_progress: 'Heading to Pickup',
      in_transit: 'Ride in Progress',
      arriving: 'Arriving at Drop',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };

    return this.td(labels[status] || status);
  }

  td(value: string): string {
    return this.languageService.translateDynamic(value);
  }

  get filteredPickupLocationSuggestions(): LocationPreset[] {
    return this.filterLocationSuggestions('pickup', this.pickupSearchTerm);
  }

  get filteredDropLocationSuggestions(): LocationPreset[] {
    return this.filterLocationSuggestions('drop', this.dropSearchTerm);
  }

  onPickupSearchTermChange(value: string): void {
    this.pickupSearchTerm = value || '';
    this.applyPickupPreset(this.pickupSearchTerm);
  }

  onDropSearchTermChange(value: string): void {
    this.dropSearchTerm = value || '';
    this.applyDropPreset(this.dropSearchTerm);
  }

  onLunchBoxDeliveryModeChange(): void {
    if (!this.lunchBoxDeliveryMode) {
      return;
    }

    this.applyLunchDropAddressFromSchool(this.lunchSchoolAddress);
  }

  onLunchSchoolAddressChange(value: string): void {
    this.lunchSchoolAddress = value || '';
    this.applyLunchDropAddressFromSchool(this.lunchSchoolAddress);
  }

  onPickupServiceModeChange(): void {
    if (this.pickupServiceMode) {
      this.serviceType = 'parcel';
      this.notifications.push('Pickup Service mode enabled. Fill shop details and complete booking.', 'info');
      return;
    }

    this.notifications.push('Pickup Service mode disabled.', 'info');
  }

  historyStatusBadge(status: Booking['status']): string {
    if (status === 'completed') {
      return 'text-bg-success';
    }

    if (status === 'cancelled') {
      return 'text-bg-danger';
    }

    if (status === 'created' || status === 'assigned' || status === 'pickup_in_progress' || status === 'in_transit' || status === 'arriving') {
      return 'text-bg-primary';
    }

    if (status === 'delivered') {
      return 'text-bg-info';
    }

    return 'text-bg-secondary';
  }

  allowCurrentLocation(target: 'pickup' | 'drop'): void {
    if (!navigator.geolocation) {
      this.notifications.push('Geolocation is not supported in this browser.', 'warning');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = this.round(position.coords.latitude);
        const lng = this.round(position.coords.longitude);
        const label = this.dynamicCurrentLocationLabel(lat, lng);

        if (target === 'pickup') {
          this.pickupLat = lat;
          this.pickupLng = lng;
          this.pickupAddress = label;
          this.saveRecentLocation('pickup', { name: label, lat, lng });
          this.refreshNearbyCaptains();
          this.refreshNearbyHotelsLive(true);
          this.popularPlaces = this.buildPopularPlaces();
        } else {
          this.dropLat = lat;
          this.dropLng = lng;
          this.dropAddress = label;
          this.saveRecentLocation('drop', { name: label, lat, lng });
          if (this.selectedCaptain) {
            this.updateEstimatedFare(this.selectedCaptain.distanceKm, this.selectedCaptain.vehicleType);
          }
        }

        this.refreshLocationSuggestions();

        this.notifications.push(`${target === 'pickup' ? 'Pickup' : 'Drop'} location captured successfully.`, 'success');
      },
      () => {
        this.notifications.push('Unable to fetch current location. Please allow browser location permission.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  applyPickupPreset(name: string): void {
    this.selectedPickupPreset = name;
    const preset = this.findLocationByName('pickup', name);
    if (!preset) {
      return;
    }
    this.pickupSearchTerm = preset.name;
    this.pickupAddress = preset.name;
    this.pickupLat = preset.lat;
    this.pickupLng = preset.lng;
    this.saveRecentLocation('pickup', preset);
    this.refreshNearbyCaptains();
    this.refreshNearbyHotelsLive(true);
    this.popularPlaces = this.buildPopularPlaces();
    this.refreshLocationSuggestions();
  }

  applyDropPreset(name: string): void {
    this.selectedDropPreset = name;
    const preset = this.findLocationByName('drop', name);
    if (!preset) {
      return;
    }
    this.dropSearchTerm = preset.name;
    this.dropAddress = preset.name;
    this.dropLat = preset.lat;
    this.dropLng = preset.lng;
    this.saveRecentLocation('drop', preset);
    if (this.selectedCaptain) {
      this.updateEstimatedFare(this.selectedCaptain.distanceKm, this.selectedCaptain.vehicleType);
    }
    this.refreshLocationSuggestions();
  }

  bookNow(): void {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.notifications.push('Please login first.', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.selectedCaptain) {
      this.notifications.push('Please select a captain from nearby list.', 'warning');
      return;
    }

    if (!this.isCaptainAvailable(this.selectedCaptain)) {
      this.selectedCaptain = null;
      this.applyCaptainNotReadyFee(this.vehicleType);
      return;
    }

    if (this.bookingFor === 'others') {
      if (!this.recipientName.trim() || !this.recipientPhone.trim()) {
        this.notifications.push('Recipient name and phone are required when booking for others.', 'warning');
        return;
      }
    }

    if (this.bookingTimeMode === 'later') {
      if (!this.scheduledAtLocal) {
        this.notifications.push('Please select schedule date and time for later booking.', 'warning');
        return;
      }

      if (new Date(this.scheduledAtLocal).getTime() <= Date.now()) {
        this.notifications.push('Later booking time must be in the future.', 'warning');
        return;
      }
    }

    const request: BookingRequest = {
      bookingFor: this.bookingFor,
      recipientName: this.bookingFor === 'others' ? this.recipientName.trim() : undefined,
      recipientPhone: this.bookingFor === 'others' ? this.recipientPhone.trim() : undefined,
      scheduledAt: this.bookingTimeMode === 'later' ? this.scheduledAtLocal : undefined,
      serviceType: this.serviceType,
      paymentMethod: this.paymentMethod,
      vehicleType: this.vehicleType,
      pickup: {
        address: this.pickupAddress,
        lat: Number(this.pickupLat),
        lng: Number(this.pickupLng)
      },
      drop: {
        address: this.dropAddress,
        lat: Number(this.dropLat),
        lng: Number(this.dropLng)
      },
      captainId: this.selectedCaptain.id,
      captainName: this.selectedCaptain.name,
      captainPhone: this.selectedCaptain.phone,
      notificationTarget: this.notificationTarget,
      preferredCaptainId: this.notificationTarget === 'preferred' ? this.selectedCaptain.id : undefined,
      preferredCaptainName: this.notificationTarget === 'preferred' ? this.selectedCaptain.name : undefined,
      estimatedFare: this.totalEstimatedFare,
      rideNotes: this.buildCombinedRideNotes()
    };

    this.saveRecentLocation('pickup', { name: request.pickup.address, lat: request.pickup.lat, lng: request.pickup.lng });
    this.saveRecentLocation('drop', { name: request.drop.address, lat: request.drop.lat, lng: request.drop.lng });
    this.refreshLocationSuggestions();

    const booking = this.bookingService.createBooking(currentUser.id, currentUser.displayName, request);
    this.notifications.push(`Booking ${booking.id} created. OTP ${booking.otp} sent as notification.`, 'success');
    this.auth
      .recordUserAction('booking_created', {
        bookingId: booking.id,
        bookingFor: booking.bookingFor,
        serviceType: booking.serviceType,
        vehicleType: booking.vehicleType,
        paymentMethod: booking.paymentMethod,
        captainId: booking.captainId,
        scheduledAt: booking.scheduledAt,
        estimatedFare: booking.estimatedFare
      })
      .subscribe({ error: () => void 0 });
    this.notifications.push(
      `Ride request ${booking.id} sent. Waiting for captain acceptance. Once accepted, start ride with OTP from tracking/history.`,
      'info'
    );
  }

  rebookFromHistory(historyBooking: Booking): void {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.notifications.push('Please login first.', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    const request = this.bookingService.buildRebookRequest(historyBooking);
    const newBooking = this.bookingService.createBooking(currentUser.id, currentUser.displayName, request);
    this.notifications.push(`Re-book created from history: ${newBooking.id}`, 'success');
    this.router.navigate(['/tracking', newBooking.id]);
  }

  openTracking(booking: Booking): void {
    this.router.navigate(['/tracking', booking.id]);
  }

  openLunchboxBookingsPage(): void {
    this.router.navigate(['/lunchbox-bookings']);
  }

  setHistoryFilter(filter: 'all' | 'completed' | 'cancelled' | 'scheduled'): void {
    this.historyFilter = filter;
  }

  get filteredBookingHistory(): Booking[] {
    const search = this.historySearch.trim().toLowerCase();

    return this.bookingHistory.filter((item) => {
      const filterMatch =
        this.historyFilter === 'all' ||
        (this.historyFilter === 'completed' && item.status === 'completed') ||
        (this.historyFilter === 'cancelled' && item.status === 'cancelled') ||
        (this.historyFilter === 'scheduled' && !!item.isScheduled);

      if (!filterMatch) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        item.id.toLowerCase().includes(search) ||
        String(item.recipientName || '').toLowerCase().includes(search) ||
        String(item.recipientPhone || '').toLowerCase().includes(search)
      );
    });
  }

  get pendingAcceptanceCount(): number {
    return this.bookingHistory.filter((item) => item.status === 'created').length;
  }

  get latestPendingAcceptanceBooking(): Booking | null {
    const pending = this.bookingHistory.find((item) => item.status === 'created');
    return pending || null;
  }

  callLink(phone: string): string {
    return `tel:${this.normalizePhone(phone)}`;
  }

  whatsAppLink(phone: string): string {
    return `https://wa.me/${this.normalizePhone(phone)}`;
  }

  private calculateFare(distanceKm: number, vehicleType: VehicleType): number {
    const multipliers: Record<VehicleType, number> = {
      bike: 1,
      auto: 1.25,
      scooter: 1.1,
      car: 1.5,
      van: 1.9,
      truck: 2.4
    };

    const baseFare = 55;
    const distanceFare = distanceKm * 15;
    const trafficMultiplier = this.getTrafficMultiplier(this.trafficCondition);
    const weatherMultiplier = this.getWeatherMultiplier(this.weatherCondition);
    const subtotal = (baseFare + distanceFare) * multipliers[vehicleType];
    const total = Math.round(subtotal * trafficMultiplier * weatherMultiplier);

    this.fareBreakdown = {
      baseFare,
      distanceFare: Math.round(distanceFare),
      trafficMultiplier,
      weatherMultiplier,
      vehicleMultiplier: multipliers[vehicleType],
      total
    };

    return total;
  }

  private updateEstimatedFare(distanceKm: number, vehicleType: VehicleType): void {
    this.estimatedFare = this.calculateFare(distanceKm, vehicleType);
    this.fetchLiveFare(distanceKm, vehicleType);
  }

  private getTrafficMultiplier(condition: TrafficCondition): number {
    if (condition === 'low') {
      return 1;
    }
    if (condition === 'medium') {
      return 1.12;
    }
    return 1.28;
  }

  private getWeatherMultiplier(condition: WeatherCondition): number {
    if (condition === 'clear') {
      return 1;
    }
    if (condition === 'cloudy') {
      return 1.05;
    }
    if (condition === 'rainy') {
      return 1.16;
    }
    return 1.3;
  }

  refreshNearbyHotelsLive(force = false): void {
    if (this.serviceType !== 'food' && !force) {
      return;
    }

    const pickupLat = Number(this.pickupLat);
    const pickupLng = Number(this.pickupLng);
    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) {
      this.nearbyHotels = this.generateNearbyHotelsFallback();
      this.nearbyHotelsLastUpdatedAt = new Date();
      this.showAllHotels = false;
      return;
    }

    const requestId = ++this.nearbyHotelsRequestCounter;

    this.placesService
      .getNearbyHotels({
        lat: pickupLat,
        lng: pickupLng,
        radiusMeters: 3500,
        limit: 12,
        preference: 'all'
      })
      .subscribe({
        next: (response) => {
          if (requestId !== this.nearbyHotelsRequestCounter) {
            return;
          }

          const mapped = this.mapNearbyHotelsFromApi(response.hotels || []);
          this.nearbyHotels = mapped.length > 0 ? mapped : this.generateNearbyHotelsFallback();
          this.nearbyHotelsLastUpdatedAt = response.updatedAt ? new Date(response.updatedAt) : new Date();
          this.showAllHotels = false;
          this.nearbyHotelsApiWarningShown = false;
        },
        error: () => {
          if (requestId !== this.nearbyHotelsRequestCounter) {
            return;
          }

          this.nearbyHotels = this.generateNearbyHotelsFallback();
          this.nearbyHotelsLastUpdatedAt = new Date();
          this.showAllHotels = false;

          if (!this.nearbyHotelsApiWarningShown) {
            this.nearbyHotelsApiWarningShown = true;
            this.notifications.push('Nearby hotels API unavailable. Showing fallback list.', 'warning');
          }
        }
      });
  }

  private ensureNearbyHotelsHeartbeat(): void {
    if (this.serviceType !== 'food') {
      if (this.nearbyHotelsRefreshHandle) {
        clearInterval(this.nearbyHotelsRefreshHandle);
        this.nearbyHotelsRefreshHandle = null;
      }
      return;
    }

    if (this.nearbyHotelsRefreshHandle) {
      return;
    }

    this.nearbyHotelsRefreshHandle = setInterval(() => {
      this.refreshNearbyHotelsLive();
    }, 12000);
  }

  private mapNearbyHotelsFromApi(items: NearbyHotelApiItem[]): NearbyHotel[] {
    return items
      .filter((item) => !!item?.id && !!item?.name)
      .map((item) => {
        const category: 'veg' | 'nonveg' = item.category === 'nonveg' ? 'nonveg' : 'veg';
        return {
          id: String(item.id),
          name: String(item.name),
          category,
          locationLabel: String(item.locationLabel || 'Nearby'),
          distanceKm: this.round(Math.max(0.2, Number(item.distanceKm || 0))),
          etaMinutes: Math.max(5, Math.round(Number(item.etaMinutes || 0))),
          rating: Math.round(Math.max(1, Number(item.rating || 0)) * 10) / 10,
          openNow: Boolean(item.openNow)
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);
  }

  private generateNearbyHotelsFallback(): NearbyHotel[] {
    const pickupLat = Number(this.pickupLat);
    const pickupLng = Number(this.pickupLng);
    const hasPickup = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
    const timeBucket = Math.floor(Date.now() / 12000);
    const etaDrift = (timeBucket % 3) - 1;

    const catalog = [
      { id: 'HT-1', name: 'Green Leaf Tiffins', category: 'veg' as const, lat: 17.4457, lng: 78.3908, locationLabel: 'Madhapur' },
      { id: 'HT-2', name: 'Sri Annapurna Meals', category: 'veg' as const, lat: 17.4511, lng: 78.3792, locationLabel: 'Hitech City' },
      { id: 'HT-3', name: 'Veggie Delight Kitchen', category: 'veg' as const, lat: 17.4388, lng: 78.3684, locationLabel: 'Gachibowli' },
      { id: 'HT-4', name: 'Royal Biryani House', category: 'nonveg' as const, lat: 17.4296, lng: 78.4019, locationLabel: 'Jubilee Hills' },
      { id: 'HT-5', name: 'Spice Route Grill', category: 'nonveg' as const, lat: 17.4544, lng: 78.3982, locationLabel: 'Kondapur' },
      { id: 'HT-6', name: 'Nawab Kebab Point', category: 'nonveg' as const, lat: 17.4421, lng: 78.4136, locationLabel: 'Ameerpet' },
      { id: 'HT-7', name: 'City Dosa Hub', category: 'veg' as const, lat: 17.4349, lng: 78.3851, locationLabel: 'SR Nagar' },
      { id: 'HT-8', name: 'Tandoori Street', category: 'nonveg' as const, lat: 17.4482, lng: 78.3727, locationLabel: 'Raidurg' }
    ];

    const ranked = catalog.map((hotel, index) => {
      const rawDistance = hasPickup
        ? this.calculateRouteDistance(pickupLat, pickupLng, hotel.lat, hotel.lng)
        : this.round(0.8 + index * 0.2);
      const distanceKm = Math.max(0.3, this.round(rawDistance));
      const etaMinutes = Math.max(7, Math.round(distanceKm * 5.8 + etaDrift + (index % 2)));
      const rating = this.round(4.1 + ((index + (timeBucket % 5)) % 7) / 10);

      return {
        id: hotel.id,
        name: hotel.name,
        category: hotel.category,
        locationLabel: hotel.locationLabel,
        distanceKm,
        etaMinutes,
        rating,
        openNow: (timeBucket + index) % 6 !== 0
      };
    });

    return ranked.sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);
  }

  private fetchLiveFare(distanceKm: number, vehicleType: VehicleType): void {
    const requestId = ++this.liveFareRequestCounter;
    const payload: LiveFareRequest = {
      pickup: {
        address: this.pickupAddress,
        lat: Number(this.pickupLat),
        lng: Number(this.pickupLng)
      },
      drop: {
        address: this.dropAddress,
        lat: Number(this.dropLat),
        lng: Number(this.dropLng)
      },
      vehicleType
    };

    this.pricingService.getLiveFare(payload).subscribe({
      next: (response: LiveFareResponse) => {
        if (requestId !== this.liveFareRequestCounter) {
          return;
        }

        this.trafficCondition = response.trafficCondition;
        this.weatherCondition = response.weatherCondition;
        this.fareBreakdown = response.breakdown;
        this.estimatedFare = response.breakdown.total;

        const sourceLabel = response.source.googleTraffic && response.source.openWeather
          ? 'Live Google Traffic + OpenWeather'
          : response.source.googleTraffic
            ? 'Live Google Traffic + local weather fallback'
            : response.source.openWeather
              ? 'Live OpenWeather + local traffic fallback'
              : 'Local fallback estimate';

        const weatherTempPart = response.weatherTempC === null || response.weatherTempC === undefined
          ? ''
          : ` (${response.weatherTempC}°C)`;

        this.fareStatusMessage = `${sourceLabel} • ${response.weatherSummary}${weatherTempPart} • ETA ${response.durationInTrafficMinutes} min`;
      },
      error: () => {
        if (requestId !== this.liveFareRequestCounter) {
          return;
        }

        const fallbackFare = this.calculateFare(distanceKm, vehicleType);
        this.estimatedFare = fallbackFare;
        this.fareStatusMessage = 'Live pricing unavailable. Showing local fallback estimate.';
      }
    });
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private calculateRouteDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(toLat - fromLat);
    const dLng = toRadians(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.round(earthRadiusKm * c);
  }

  private toNearbyCaptain(captain: CaptainDirectoryItem, index: number): NearbyCaptain {
    const hash = this.hashNumber(`${captain.id}:${captain.username}`);
    const distanceKm = this.round(0.8 + ((hash % 60) / 10));
    const etaMinutes = Math.max(3, Math.round(distanceKm * 2.6));
    const vehicleType = captain.vehicleType || 'bike';
    const locationLat = this.round(this.pickupLat + (((hash % 120) - 60) / 5000));
    const locationLng = this.round(this.pickupLng + ((((Math.floor(hash / 120)) % 120) - 60) / 5000));
    const locationLabel = this.dynamicCurrentLocationLabel(locationLat, locationLng);

    return {
      id: captain.id,
      name: captain.displayName || captain.username,
      phone: captain.phone,
      vehicleType,
      vehicleLabel: `${vehicleType.toUpperCase()} • backend`,
      rating: this.round(captain.rating || 4.5),
      etaMinutes,
      distanceKm,
      availability: captain.availability || 'available',
      locationLabel,
      locationLat,
      locationLng
    };
  }

  private hashNumber(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private ensureLiveTrackHeartbeat(): void {
    if (!this.liveTrackMode) {
      if (this.liveTrackHandle) {
        clearInterval(this.liveTrackHandle);
        this.liveTrackHandle = null;
      }
      return;
    }

    if (this.liveTrackHandle) {
      return;
    }

    this.liveTrackHandle = setInterval(() => {
      this.nearbyCaptains = this.nearbyCaptains.map((captain, index) => {
        if (!this.isCaptainAvailable(captain)) {
          return captain;
        }

        const baseLat = Number(captain.locationLat ?? this.pickupLat);
        const baseLng = Number(captain.locationLng ?? this.pickupLng);
        const tick = Date.now() / 1200;
        const driftLat = Math.sin(tick + index) * 0.00006;
        const driftLng = Math.cos(tick + index) * 0.00006;
        const locationLat = this.round(baseLat + driftLat);
        const locationLng = this.round(baseLng + driftLng);

        return {
          ...captain,
          locationLat,
          locationLng,
          locationLabel: this.dynamicCurrentLocationLabel(locationLat, locationLng)
        };
      });
    }, 3000);
  }

  private mapBounds(): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    latRange: number;
    lngRange: number;
  } {
    const lats = [Number(this.pickupLat), Number(this.dropLat), ...this.mapCaptains.map((captain) => Number(captain.locationLat || this.pickupLat))]
      .filter((value) => Number.isFinite(value));
    const lngs = [Number(this.pickupLng), Number(this.dropLng), ...this.mapCaptains.map((captain) => Number(captain.locationLng || this.pickupLng))]
      .filter((value) => Number.isFinite(value));

    if (lats.length === 0 || lngs.length === 0) {
      return {
        minLat: Number(this.pickupLat) - 0.01,
        maxLat: Number(this.pickupLat) + 0.01,
        minLng: Number(this.pickupLng) - 0.01,
        maxLng: Number(this.pickupLng) + 0.01,
        latRange: 0.02,
        lngRange: 0.02
      };
    }

    const minLat = Math.min(...lats) - 0.002;
    const maxLat = Math.max(...lats) + 0.002;
    const minLng = Math.min(...lngs) - 0.002;
    const maxLng = Math.max(...lngs) + 0.002;

    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      latRange: Math.max(0.001, maxLat - minLat),
      lngRange: Math.max(0.001, maxLng - minLng)
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private normalizePhone(phone: string): string {
    return String(phone || '').replace(/\D/g, '');
  }

  private dynamicCurrentLocationLabel(lat: number, lng: number): string {
    const landmarks = ['Maha Laxmi Garden', 'City Center', 'Lake View', 'Tech Park', 'Metro Plaza'];
    const index = Math.abs(Math.round((lat + lng) * 1000)) % landmarks.length;
    const houseNo = Math.abs(Math.round((lat * 10000 + lng * 10000) % 9000)) + 1000;
    return `Near 1-${houseNo} ${landmarks[index]}`;
  }

  private refreshLocationSuggestions(): void {
    this.pickupLocationSuggestions = this.buildLocationSuggestions('pickup');
    this.dropLocationSuggestions = this.buildLocationSuggestions('drop');

    if (!this.pickupSearchTerm) {
      this.pickupSearchTerm = this.pickupAddress === 'Pickup Point' ? '' : this.pickupAddress;
    }
    if (!this.dropSearchTerm) {
      this.dropSearchTerm = this.dropAddress === 'Drop Point' ? '' : this.dropAddress;
    }
  }

  private filterLocationSuggestions(target: 'pickup' | 'drop', query: string): LocationPreset[] {
    const source = target === 'pickup' ? this.pickupLocationSuggestions : this.dropLocationSuggestions;
    const text = (query || '').trim().toLowerCase();
    const pickupReference = { lat: Number(this.pickupLat), lng: Number(this.pickupLng) };

    if (!text) {
      return this.rankByNearestToPickup(source, pickupReference.lat, pickupReference.lng);
    }

    const startsWithMatches = source.filter((item) => item.name.toLowerCase().startsWith(text));
    const containsMatches = source.filter(
      (item) => !item.name.toLowerCase().startsWith(text) && item.name.toLowerCase().includes(text)
    );

    const rankedStartsWith = this.rankByNearestToPickup(startsWithMatches, pickupReference.lat, pickupReference.lng);
    const rankedContains = this.rankByNearestToPickup(containsMatches, pickupReference.lat, pickupReference.lng);

    return [...rankedStartsWith, ...rankedContains];
  }

  private findLocationByName(target: 'pickup' | 'drop', name: string): LocationPreset | null {
    const cleaned = (name || '').trim();
    if (!cleaned) {
      return null;
    }

    const normalized = cleaned.toLowerCase();
    const source = target === 'pickup' ? this.pickupLocationSuggestions : this.dropLocationSuggestions;
    const fromSuggestions = source.find((item) => item.name.trim().toLowerCase() === normalized);
    if (fromSuggestions) {
      return fromSuggestions;
    }

    const fromPresets = this.locationPresets.find((item) => item.name.trim().toLowerCase() === normalized);
    if (fromPresets) {
      return fromPresets;
    }

    return null;
  }

  private buildLocationSuggestions(target: 'pickup' | 'drop'): LocationPreset[] {
    const suggestions = new Map<string, LocationPreset & { score: number }>();
    const reference = { lat: Number(this.pickupLat), lng: Number(this.pickupLng) };

    const addSuggestion = (suggestion: LocationPreset, score: number): void => {
      if (!suggestion.name.trim()) {
        return;
      }

      const key = suggestion.name.trim().toLowerCase();
      const existing = suggestions.get(key);
      if (!existing || score > existing.score) {
        suggestions.set(key, {
          name: suggestion.name.trim(),
          lat: this.round(suggestion.lat),
          lng: this.round(suggestion.lng),
          score
        });
      }
    };

    this.readRecentLocations()
      .filter((item) => item.target === target)
      .forEach((item, index) => {
        addSuggestion(
          { name: item.name, lat: item.lat, lng: item.lng },
          300 - index * 25 + this.distancePreferenceBoost(reference.lat, reference.lng, item.lat, item.lng)
        );
      });

    this.bookingHistory
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .forEach((booking, index) => {
        const point = target === 'pickup' ? booking.pickup : booking.drop;
        addSuggestion(
          { name: point.address, lat: point.lat, lng: point.lng },
          220 - index * 10 + this.distancePreferenceBoost(reference.lat, reference.lng, point.lat, point.lng)
        );
      });

    const currentAddress = target === 'pickup' ? this.pickupAddress : this.dropAddress;
    const currentLat = target === 'pickup' ? Number(this.pickupLat) : Number(this.dropLat);
    const currentLng = target === 'pickup' ? Number(this.pickupLng) : Number(this.dropLng);
    if (currentAddress && currentAddress !== 'Pickup Point' && currentAddress !== 'Drop Point') {
      addSuggestion({ name: currentAddress, lat: currentLat, lng: currentLng }, 260);
    }

    this.locationPresets.forEach((preset, index) => {
      addSuggestion(
        preset,
        80 - index * 4 + this.distancePreferenceBoost(reference.lat, reference.lng, preset.lat, preset.lng)
      );
    });

    return [...suggestions.values()]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map(({ name, lat, lng }) => ({ name, lat, lng }));
  }

  private distancePreferenceBoost(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const deltaLat = fromLat - toLat;
    const deltaLng = fromLng - toLng;
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
    return Math.max(0, 25 - distance * 100);
  }

  private rankByNearestToPickup(items: LocationPreset[], pickupLat: number, pickupLng: number): LocationPreset[] {
    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) {
      return items;
    }

    return [...items].sort((a, b) => {
      const aDistance = this.distanceSquared(pickupLat, pickupLng, a.lat, a.lng);
      const bDistance = this.distanceSquared(pickupLat, pickupLng, b.lat, b.lng);
      return aDistance - bDistance || a.name.localeCompare(b.name);
    });
  }

  private distanceSquared(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const latDelta = fromLat - toLat;
    const lngDelta = fromLng - toLng;
    return latDelta * latDelta + lngDelta * lngDelta;
  }

  private saveRecentLocation(target: 'pickup' | 'drop', location: LocationPreset): void {
    const capturedAt = new Date().toISOString();
    const next = [
      { target, name: location.name.trim(), lat: this.round(location.lat), lng: this.round(location.lng), capturedAt },
      ...this.readRecentLocations().filter(
        (item) => !(item.target === target && item.name.trim().toLowerCase() === location.name.trim().toLowerCase())
      )
    ].slice(0, 12);

    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(next));
    if (target === 'pickup') {
      localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
        lat: this.round(location.lat),
        lng: this.round(location.lng),
        address: location.name.trim(),
        capturedAt
      }));
    }
  }

  private readRecentLocations(): Array<{ target: 'pickup' | 'drop'; name: string; lat: number; lng: number; capturedAt: string }> {
    const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Array<{ target?: 'pickup' | 'drop'; name?: string; lat?: number; lng?: number; capturedAt?: string }>;
      return parsed.filter(
        (item): item is { target: 'pickup' | 'drop'; name: string; lat: number; lng: number; capturedAt: string } =>
          (item.target === 'pickup' || item.target === 'drop') &&
          typeof item.name === 'string' &&
          typeof item.lat === 'number' &&
          typeof item.lng === 'number' &&
          typeof item.capturedAt === 'string'
      );
    } catch {
      localStorage.removeItem(RECENT_LOCATIONS_KEY);
      return [];
    }
  }

  onProfileImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    image.onerror = null;
    image.src = this.buildUserAvatar(this.currentUser);
  }

  onProfileDpFileSelected(event: Event): void {
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
        this.selectedProfileImage = result;
        this.profileImageUrl = result;
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

  saveProfileDp(): void {
    if (!this.selectedProfileImage) {
      return;
    }

    this.savingProfileImage = true;
    this.auth.updateProfileImage(this.selectedProfileImage).subscribe({
      next: (response) => {
        this.savingProfileImage = false;
        this.auth.applyProfileImage(response.profileImageUrl);
        this.profileImageUrl = response.profileImageUrl;
        this.selectedProfileImage = '';
        this.notifications.push(response.message || 'Profile photo updated.', 'success');
      },
      error: (error) => {
        this.savingProfileImage = false;
        this.notifications.push(error?.error?.error || 'Failed to update profile photo.', 'error');
      }
    });
  }

  private loadLiveLocationDefaults(): void {
    const raw = localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { lat?: number; lng?: number; address?: string };
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        this.pickupLat = this.round(parsed.lat);
        this.pickupLng = this.round(parsed.lng);
        this.pickupAddress = parsed.address?.trim() || this.dynamicCurrentLocationLabel(this.pickupLat, this.pickupLng);
      }
    } catch {
      // Ignore malformed cached location.
    }
  }

  private initializeVoiceBooking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const maybeWindow = window as any;
    const SpeechRecognitionCtor = maybeWindow.SpeechRecognition || maybeWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      this.voiceSupported = false;
      return;
    }

    this.voiceSupported = true;
    this.speechRecognition = new SpeechRecognitionCtor();
    this.speechRecognition.lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-IN';
    this.speechRecognition.continuous = false;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.maxAlternatives = 1;

    this.speechRecognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = String(event.results[i][0]?.transcript || '').trim();
        if (!transcript) {
          continue;
        }

        if (event.results[i].isFinal) {
          finalText = `${finalText} ${transcript}`.trim();
        } else {
          interimText = `${interimText} ${transcript}`.trim();
        }
      }

      this.voiceTranscript = finalText || interimText;

      if (finalText) {
        this.handleVoiceCommand(finalText);
      }
    };

    this.speechRecognition.onerror = (event: any) => {
      this.isVoiceListening = false;
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        this.micPermissionDenied = true;
        this.notifications.push('Microphone permission denied. Please allow mic access.', 'error');
        return;
      }

      this.notifications.push('Voice recognition failed. Please try again.', 'error');
    };

    this.speechRecognition.onend = () => {
      this.isVoiceListening = false;
    };
  }

  private handleVoiceCommand(command: string): void {
    const selectedVehicle = this.extractVehicleType(command);

    if (this.pendingVehicleSelection && this.pendingVoiceTrip) {
      if (!selectedVehicle) {
        this.notifications.push('Please say vehicle type only: car, bike, or auto.', 'warning');
        return;
      }

      this.applyVoiceTrip(this.pendingVoiceTrip.from, this.pendingVoiceTrip.to, this.pendingVoiceTrip.note);
      this.applyVehicleFromVoice(selectedVehicle);

      const availableCaptain = this.findAvailableCaptainForVehicle(selectedVehicle);
      if (!availableCaptain) {
        this.applyCaptainNotReadyFee(selectedVehicle);
        this.pendingVehicleSelection = false;
        this.pendingVoiceTrip = undefined;
        return;
      }

      this.selectCaptain(availableCaptain);
      this.clearAvailabilitySurcharge();
      this.pendingVehicleSelection = false;
      this.pendingVoiceTrip = undefined;
      this.notifications.push(`Vehicle selected: ${selectedVehicle.toUpperCase()}. Booking ride now...`, 'success');
      this.bookNow();
      return;
    }

    const parsed = this.parseVoiceTripCommand(command);
    if (!parsed) {
      this.notifications.push('Could not understand command. Say: book trip from A to B', 'warning');
      return;
    }

    this.applyVoiceTrip(parsed.from, parsed.to, parsed.note);

    if (parsed.vehicleType) {
      this.applyVehicleFromVoice(parsed.vehicleType);
      const availableCaptain = this.findAvailableCaptainForVehicle(parsed.vehicleType);
      if (!availableCaptain) {
        this.applyCaptainNotReadyFee(parsed.vehicleType);
        return;
      }
      this.selectCaptain(availableCaptain);
      this.clearAvailabilitySurcharge();
    }

    if (!parsed.vehicleType) {
      this.pendingVoiceTrip = { from: parsed.from, to: parsed.to, note: parsed.note };
      this.pendingVehicleSelection = true;
      this.notifications.push('Trip route captured. Now say vehicle type: car, bike, or auto.', 'info');
      return;
    }

    this.pendingVehicleSelection = false;
    this.pendingVoiceTrip = undefined;

    if (parsed.autoBook) {
      this.bookNow();
    }
  }

  private applyVoiceTrip(from: string, to: string, note?: string): void {
    this.pickupAddress = from;
    this.dropAddress = to;

    const pickupCoords = this.estimateCoordsFromAddress(from, this.pickupLat, this.pickupLng);
    const dropCoords = this.estimateCoordsFromAddress(to, this.dropLat, this.dropLng);

    this.pickupLat = pickupCoords.lat;
    this.pickupLng = pickupCoords.lng;
    this.dropLat = dropCoords.lat;
    this.dropLng = dropCoords.lng;

    if (note) {
      this.rideNotes = note;
    }

    this.saveRecentLocation('pickup', { name: this.pickupAddress, lat: this.pickupLat, lng: this.pickupLng });
    this.saveRecentLocation('drop', { name: this.dropAddress, lat: this.dropLat, lng: this.dropLng });
    this.refreshLocationSuggestions();
    this.refreshNearbyCaptains();
    this.popularPlaces = this.buildPopularPlaces();
    this.refreshNearbyHotelsLive(true);

    if (this.selectedCaptain) {
      this.updateEstimatedFare(this.selectedCaptain.distanceKm, this.selectedCaptain.vehicleType);
    }

    this.notifications.push(`Trip updated by voice: ${from} -> ${to}`, 'success');
  }

  private applyLunchDropAddressFromSchool(schoolAddress: string): void {
    if (!this.lunchBoxDeliveryMode) {
      return;
    }

    const cleaned = String(schoolAddress || '').trim();
    if (!cleaned) {
      return;
    }

    this.dropAddress = cleaned;
    this.dropSearchTerm = cleaned;
    const estimated = this.estimateCoordsFromAddress(cleaned, this.dropLat, this.dropLng);
    this.dropLat = estimated.lat;
    this.dropLng = estimated.lng;

    if (this.selectedCaptain) {
      this.updateEstimatedFare(this.selectedCaptain.distanceKm, this.selectedCaptain.vehicleType);
    }

    this.refreshLocationSuggestions();
  }

  private applyVehicleFromVoice(vehicleType: VehicleType): void {
    this.vehicleType = vehicleType;
    this.onVehicleTypeChange(vehicleType);
  }

  private findAvailableCaptainForVehicle(vehicleType: VehicleType): NearbyCaptain | undefined {
    const list = this.rankNearbyCaptains(this.nearbyCaptains.filter((captain) => captain.vehicleType === vehicleType));
    return this.pickBestAvailableCaptain(list);
  }

  private pickBestAvailableCaptain(captains: NearbyCaptain[]): NearbyCaptain | undefined {
    return captains.find((captain) => this.isCaptainAvailable(captain));
  }

  private rankNearbyCaptains(captains: NearbyCaptain[]): NearbyCaptain[] {
    return [...captains].sort((a, b) => {
      const scoreDifference = this.captainPriorityScore(b) - this.captainPriorityScore(a);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }
      return a.distanceKm - b.distanceKm || a.etaMinutes - b.etaMinutes || a.name.localeCompare(b.name);
    });
  }

  private captainPriorityScore(captain: NearbyCaptain): number {
    const availabilityBonus = captain.availability === 'available'
      ? 120
      : captain.availability === 'arriving'
        ? 60
        : 0;

    if (this.womenSafetyProtectionMode) {
      return availabilityBonus + captain.rating * 40 + Math.max(0, 18 - captain.etaMinutes) + Math.max(0, 8 - captain.distanceKm);
    }

    return availabilityBonus + captain.rating * 20 + Math.max(0, 20 - captain.etaMinutes) + Math.max(0, 10 - captain.distanceKm);
  }

  private isCaptainAvailable(captain: NearbyCaptain): boolean {
    return captain.availability !== 'busy';
  }

  private applyCaptainNotReadyFee(vehicleType: VehicleType): void {
    this.selectedCaptain = null;
    this.availabilitySurcharge = 10;
    this.notifications.push(
      `Captains are not ready for ${vehicleType.toUpperCase()} right now. Add ₹10 extra to continue when captain becomes available.`,
      'warning'
    );
  }

  private clearAvailabilitySurcharge(): void {
    this.availabilitySurcharge = 0;
  }

  private parseVoiceTripCommand(command: string): { from: string; to: string; note?: string; autoBook: boolean; vehicleType?: VehicleType } | null {
    const normalized = command
      .toLowerCase()
      .replace(/[.,!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const autoBook = normalized.includes('book now') || normalized.includes('confirm booking') || normalized.includes('confirm trip');

    const fromToMatch = normalized.match(/(?:book|create|plan)?\s*(?:a\s+)?(?:trip|ride|delivery|order|booking)?\s*from\s+(.+?)\s+to\s+(.+?)(?:\s+(?:by|with|using)\s+(car|bike|auto|scooter|van|truck))?(?:\s+with\s+note\s+(.+))?$/i);
    if (!fromToMatch) {
      return null;
    }

    const from = this.toAddressLabel(fromToMatch[1]);
    const to = this.toAddressLabel(fromToMatch[2]);
    const vehicleType = this.extractVehicleType(fromToMatch[3] || normalized);
    const note = fromToMatch[4] ? this.toAddressLabel(fromToMatch[4]) : undefined;

    if (!from || !to) {
      return null;
    }

    return { from, to, note, autoBook, vehicleType };
  }

  private extractVehicleType(text: string): VehicleType | undefined {
    const normalized = String(text || '').toLowerCase();
    if (/\b(bike|motorbike)\b/.test(normalized)) {
      return 'bike';
    }
    if (/\b(auto|rickshaw)\b/.test(normalized)) {
      return 'auto';
    }
    if (/\b(car|cab)\b/.test(normalized)) {
      return 'car';
    }
    if (/\b(scooter)\b/.test(normalized)) {
      return 'scooter';
    }
    if (/\b(van)\b/.test(normalized)) {
      return 'van';
    }
    if (/\b(truck|lorry)\b/.test(normalized)) {
      return 'truck';
    }
    return undefined;
  }

  private toAddressLabel(text: string): string {
    return text
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  private estimateCoordsFromAddress(address: string, fallbackLat: number, fallbackLng: number): { lat: number; lng: number } {
    const hash = this.hashNumber(address.toLowerCase());
    const latOffset = ((hash % 160) - 80) / 10000;
    const lngOffset = (((hash / 160) % 160) - 80) / 10000;

    return {
      lat: this.round(fallbackLat + latOffset),
      lng: this.round(fallbackLng + lngOffset)
    };
  }

  private async requestMicPermissionAndStart(): Promise<void> {
    this.micPermissionDenied = false;
    this.voiceTranscript = '';

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      this.micPermissionDenied = true;
      this.notifications.push('Microphone permission denied. You can use the typed command box instead.', 'warning');
      return;
    }

    try {
      this.isVoiceListening = true;
      this.speechRecognition.start();
      this.notifications.push('Listening... Say: book order from pickup to drop', 'info');
    } catch {
      this.isVoiceListening = false;
      this.notifications.push('Could not start voice recognition. Try the typed command box.', 'error');
    }
  }

  private generateFallbackNearbyCaptains(): NearbyCaptain[] {
    const baseCaptains: Array<{ name: string; phone: string; vehicleType: VehicleType; rating: number }> = [
      { name: 'Captain Ravi', phone: '9999900003', vehicleType: 'bike', rating: 4.7 },
      { name: 'Captain Priya', phone: '9999900004', vehicleType: 'auto', rating: 4.8 },
      { name: 'Captain Arjun', phone: '9999900005', vehicleType: 'car', rating: 4.9 }
    ];

    const seed = this.hashNumber(`${this.pickupLat}:${this.pickupLng}:${this.dropLat}:${this.dropLng}`);

    return baseCaptains.map((captain, index) => {
      const distanceKm = this.round(0.6 + ((seed + index * 11) % 35) / 10);
      const etaMinutes = Math.max(3, Math.round(distanceKm * 2.8));
      const availability: NearbyCaptain['availability'] = (seed + index) % 4 === 0 ? 'arriving' : 'available';

      return {
        id: `fallback-${captain.vehicleType}-${index + 1}`,
        name: captain.name,
        phone: captain.phone,
        vehicleType: captain.vehicleType,
        vehicleLabel: `${captain.vehicleType.toUpperCase()} • fallback nearby`,
        rating: captain.rating,
        etaMinutes,
        distanceKm,
        availability,
        locationLat: this.round(this.pickupLat + ((index - 1) * 0.0035)),
        locationLng: this.round(this.pickupLng + (((seed % 3) - 1) * 0.003)),
        locationLabel: this.dynamicCurrentLocationLabel(
          this.round(this.pickupLat + ((index - 1) * 0.0035)),
          this.round(this.pickupLng + (((seed % 3) - 1) * 0.003))
        )
      };
    });
  }

  private buildPopularPlaces(): PopularPlace[] {
    const names = ['Airport Road Hub', 'City Mall', 'Metro Junction', 'Lake Side Street', 'Tech Park Gate'];
    return names.slice(0, 3).map((name, index) => {
      const distanceKm = this.round(0.8 + ((this.pickupLat + this.pickupLng + index) % 4));
      const etaMinutes = Math.max(4, Math.round(distanceKm * 3 + 2));
      const captainHint = this.nearbyCaptains[index]?.name || `Captain ${index + 1}`;

      return {
        name,
        distanceKm,
        etaMinutes,
        captainHint
      };
    });
  }

  private buildUserAvatar(user: AppUser | null): string {
    const label = encodeURIComponent(user?.displayName || 'Customer');
    return `https://ui-avatars.com/api/?name=${label}&background=f0f4ff&color=0f172a&size=128`;
  }

  private buildCombinedRideNotes(): string | undefined {
    const baseNotes = this.rideNotes.trim();
    if (!this.lunchBoxDeliveryMode && !this.pickupServiceMode) {
      return baseNotes || undefined;
    }

    const sections: string[] = [];

    if (this.pickupServiceMode) {
      const pickupDetails: string[] = ['Pickup Service Mode'];
      if (this.pickupShopName.trim()) {
        pickupDetails.push(`Shop: ${this.pickupShopName.trim()}`);
      }
      if (this.pickupShopPhone.trim()) {
        pickupDetails.push(`Shop Phone: ${this.pickupShopPhone.trim()}`);
      }
      if (this.pickupItemDetails.trim()) {
        pickupDetails.push(`Item: ${this.pickupItemDetails.trim()}`);
      }
      if (this.pickupShopInstructions.trim()) {
        pickupDetails.push(`Pickup Instructions: ${this.pickupShopInstructions.trim()}`);
      }
      sections.push(pickupDetails.join(' | '));
    }

    if (this.lunchBoxDeliveryMode) {
      const lunchDetails: string[] = ['Lunch Box Delivery Mode'];
      if (this.lunchStudentName.trim()) {
        lunchDetails.push(`Student: ${this.lunchStudentName.trim()}`);
      }
      if (this.lunchStudentClass.trim()) {
        lunchDetails.push(`Class: ${this.lunchStudentClass.trim()}`);
      }
      if (this.lunchSchoolName.trim()) {
        lunchDetails.push(`School: ${this.lunchSchoolName.trim()}`);
      }
      if (this.lunchSchoolAddress.trim()) {
        lunchDetails.push(`School Address: ${this.lunchSchoolAddress.trim()}`);
      }
      if (this.lunchGuardianPhone.trim()) {
        lunchDetails.push(`Guardian Phone: ${this.lunchGuardianPhone.trim()}`);
      }
      if (this.lunchBoxDetails.trim()) {
        lunchDetails.push(`Lunch Details: ${this.lunchBoxDetails.trim()}`);
      }
      if (this.lunchDeliveryInstructions.trim()) {
        lunchDetails.push(`Instructions: ${this.lunchDeliveryInstructions.trim()}`);
      }
      sections.push(lunchDetails.join(' | '));
    }

    const modeNotes = sections.join(' | ');
    if (!baseNotes) {
      return modeNotes || undefined;
    }

    return modeNotes ? `${baseNotes} | ${modeNotes}` : baseNotes;
  }

  private womenSafetyModeStorageKey(): string {
    const userId = this.currentUser?.id || 'guest';
    return `${WOMEN_SAFETY_MODE_KEY_PREFIX}_${userId}`;
  }

  private loadWomenSafetyProtectionMode(): void {
    const raw = localStorage.getItem(this.womenSafetyModeStorageKey());
    this.womenSafetyProtectionMode = raw === '1';
  }

  private persistWomenSafetyProtectionMode(): void {
    localStorage.setItem(this.womenSafetyModeStorageKey(), this.womenSafetyProtectionMode ? '1' : '0');
  }
}
