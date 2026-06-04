import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, interval, startWith, switchMap, map, of } from 'rxjs';
import { Booking } from '../../core/models/delivery.models';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SafeResourceUrlPipe } from '../../shared/pipes/safe-resource-url.pipe';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SafeResourceUrlPipe],
  template: `
    <div class="container py-4">
      <h2 class="mb-3">Live Tracking</h2>

      <div *ngIf="!booking" class="alert alert-info">
        No booking selected. Go to <a routerLink="/booking">Booking</a>.
      </div>

      <div *ngIf="booking" class="row g-4">
        <div class="col-lg-5">
          <div class="card p-3 h-100">
            <h5>{{ booking.id }}<span class="badge bg-success ms-2" *ngIf="isLiveTracking">🔴 LIVE</span></h5>
            <p class="mb-1"><strong>Status:</strong> {{ statusLabel(booking.status) }}</p>
            <p class="mb-1"><strong>Service:</strong> {{ booking.serviceType }}</p>
            <p class="mb-1"><strong>Vehicle:</strong> {{ booking.vehicleType }}</p>
            <p class="mb-1"><strong>Payment:</strong> {{ booking.paymentMethod }}</p>
            <p class="mb-1"><strong>Pickup:</strong> {{ booking.pickup.address }}</p>
            <p class="mb-1"><strong>Drop:</strong> {{ booking.drop.address }}</p>
            <p class="mb-1"><strong>Current Location:</strong> {{ currentLocationAddress }}</p>
            <p class="mb-1"><strong>Coordinates:</strong> {{ currentLat | number: '1.5-5' }}, {{ currentLng | number: '1.5-5' }}</p>
            <p class="mb-1"><strong>Distance to Drop:</strong> {{ distanceToDrop | number: '1.2-2' }} km</p>
            <p class="mb-1"><strong>Payable Amount:</strong> ₹{{ payableAmount | number: '1.0-0' }}</p>
            <p class="mb-1"><strong>Ride Will End In:</strong> {{ estimatedTime }} min</p>
            <p class="mb-1"><strong>Driver:</strong> {{ booking.driverName }} ({{ booking.driverPhone }})</p>
            <p class="mb-2 text-warning" *ngIf="booking.status === 'created' && !booking.otpVerified">
              <strong>Ride Start OTP:</strong> {{ booking.otp }} (share this OTP with captain to start the ride)
            </p>
            <p class="mb-2 text-success" *ngIf="booking.otpVerified">
              <strong>Ride OTP:</strong> Verified successfully.
            </p>
            <div class="alert alert-info mb-2" *ngIf="isLiveTracking">
              <small>📍 Live location updates every 2 seconds</small>
            </div>

            <div class="card p-2 mb-2" *ngIf="booking.status === 'created' && !booking.otpVerified && isCustomer()">
              <label class="form-label mb-1"><strong>Start Ride OTP</strong></label>
              <div class="d-flex gap-2 flex-wrap">
                <input class="form-control form-control-sm otp-input" placeholder="Enter 6-digit OTP" [(ngModel)]="customerOtpInput" />
                <button class="btn btn-sm btn-danger" type="button" (click)="startRideWithOtp(booking)">Verify & Start</button>
              </div>
            </div>
            <div class="card p-2 mb-2" *ngIf="booking.status === 'created' && isCaptain()">
              <label class="form-label mb-1"><strong>Captain OTP Start</strong></label>
              <div class="d-flex gap-2 flex-wrap">
                <input class="form-control form-control-sm otp-input" placeholder="Enter customer OTP" [(ngModel)]="captainOtpInput" />
                <button class="btn btn-sm btn-primary" type="button" (click)="startRideByCaptainOtp(booking)">Verify OTP & Start</button>
              </div>
            </div>
            <div class="d-flex gap-2 mb-2">
              <a class="btn btn-sm btn-outline-primary" [href]="callLink(booking.driverPhone)">Call Captain</a>
              <a class="btn btn-sm btn-outline-success" [href]="whatsAppLink(booking.driverPhone)" target="_blank" rel="noopener">WhatsApp Captain</a>
              <a class="btn btn-sm btn-outline-dark" [href]="shareTripWhatsAppLink(booking)" target="_blank" rel="noopener">Share Live Trip</a>
              <button class="btn btn-sm btn-outline-danger" type="button" *ngIf="canTriggerSos()" (click)="triggerSos(booking)">SOS</button>
              <button class="btn btn-sm btn-danger" type="button" *ngIf="canCancelRide(booking)" (click)="cancelRide(booking)">Cancel Ride</button>
            </div>
            <div class="alert alert-secondary mb-0">{{ booking.notification }}</div>

            <div class="card p-3 mt-3" *ngIf="booking.status === 'completed' && isCustomer() && !booking.paymentDone">
              <h6 class="mb-2">Complete Payment</h6>
              <div class="small text-muted mb-2">Amount is calculated dynamically at ₹{{ getRatePerKm() }}/km.</div>
              <div class="fw-semibold mb-2">Amount to pay: ₹{{ payableAmount | number: '1.0-0' }}</div>
              <button type="button" class="btn btn-sm btn-success" (click)="completePayment(booking)">Pay Now</button>
            </div>

            <div class="card p-3 mt-3 feedback-card" *ngIf="booking.status === 'completed' && isCustomer() && booking.paymentDone && !booking.trackingClosed">
              <h6 class="mb-2">Rate this completed ride</h6>

              <div class="alert alert-warning py-2" *ngIf="isAutoClosePending">
                Tracking will close automatically in {{ formatAutoCloseCountdown() }} and redirect to booking history.
              </div>

              <div *ngIf="booking.feedbackSubmitted" class="text-success small">
                Thanks for your valuable feedback. Ride {{ booking.rideRating }}/5, Captain {{ booking.captainRating }}/5
                <span *ngIf="booking.lovedRide"> • Ride ❤️</span>
                <span *ngIf="booking.lovedCaptain"> • Captain ❤️</span>
              </div>

              <div *ngIf="!booking.feedbackSubmitted">
                <label class="form-label small mb-1">Ride Rating</label>
                <div class="d-flex gap-1 mb-2">
                  <button
                    type="button"
                    class="btn btn-sm"
                    *ngFor="let star of stars"
                    [ngClass]="star <= rideRating ? 'btn-warning' : 'btn-outline-secondary'"
                    (click)="rideRating = star"
                  >
                    ★
                  </button>
                </div>

                <label class="form-label small mb-1">Captain Rating</label>
                <div class="d-flex gap-1 mb-2">
                  <button
                    type="button"
                    class="btn btn-sm"
                    *ngFor="let star of stars"
                    [ngClass]="star <= captainRating ? 'btn-warning' : 'btn-outline-secondary'"
                    (click)="captainRating = star"
                  >
                    ★
                  </button>
                </div>

                <div class="d-flex gap-2 mb-2">
                  <button type="button" class="btn btn-sm" [ngClass]="lovedRide ? 'btn-danger' : 'btn-outline-danger'" (click)="lovedRide = !lovedRide">
                    {{ lovedRide ? '❤️ Loved Ride' : '♡ Love Ride' }}
                  </button>
                  <button type="button" class="btn btn-sm" [ngClass]="lovedCaptain ? 'btn-danger' : 'btn-outline-danger'" (click)="lovedCaptain = !lovedCaptain">
                    {{ lovedCaptain ? '❤️ Loved Captain' : '♡ Love Captain' }}
                  </button>
                </div>

                <textarea class="form-control form-control-sm mb-2" rows="2" placeholder="Write feedback for captain and ride" [(ngModel)]="feedbackText"></textarea>
                <button type="button" class="btn btn-sm btn-primary" (click)="submitFeedback(booking)">Submit Feedback</button>
              </div>
            </div>

            <div class="alert alert-success mt-3" *ngIf="booking.trackingClosed && isCustomer()">
              Tracking closed successfully. Thanks for your valuable feedback. This trip is saved in your booking history.
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="card p-0 h-100">
            <iframe [src]="googleMapUrl | safeResourceUrl" width="100%" height="500" frameborder="0" style="border: 0" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TrackingComponent implements OnInit, OnDestroy {
  private static readonly AUTO_CLOSE_DELAY_MS = 5 * 60 * 1000;
  private static readonly RATE_PER_KM_RS = 10;
  private static readonly MIN_RIDE_END_MINUTES = 2;

  booking?: Booking;
  googleMapUrl = '';
  currentRole: string | undefined;
  stars = [1, 2, 3, 4, 5];
  rideRating = 5;
  captainRating = 5;
  lovedRide = false;
  lovedCaptain = false;
  feedbackText = '';
  customerOtpInput = '';
  captainOtpInput = '';
  isLiveTracking = false;
  currentLat = 0;
  currentLng = 0;
  currentLocationAddress = '';
  distanceToDrop = 0;
  estimatedTime = 0;
  payableAmount = 0;
  autoCloseRemainingSeconds = 0;
  isAutoClosePending = false;
  private readonly destroy$ = new Subject<void>();
  private autoCloseTimeoutId?: ReturnType<typeof setTimeout>;
  private autoCloseIntervalId?: ReturnType<typeof setInterval>;
  private autoCloseDueAt = 0;
  private captainPaymentRedirectHandled = false;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private authService: AuthService,
    private notifications: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentRole = this.authService.getCurrentUser()?.role;

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const bookingId = params.get('id');
      if (!bookingId) {
        return;
      }

      this.bookingService
        .getBookingById$(bookingId)
        .subscribe((booking) => {
          this.booking = booking;
          if (booking) {
            this.authService
              .recordUserAction('tracking_viewed', { bookingId: booking.id, status: booking.status })
              .subscribe({ error: () => void 0 });
            this.googleMapUrl = this.buildMapUrl(booking.currentLocation.lat, booking.currentLocation.lng, booking.drop.lat, booking.drop.lng);
            // Setup live location tracking
            this.setupLiveTracking(booking);
            this.payableAmount = this.calculatePayableAmount(booking);
            this.syncAutoCloseTracking(booking);
            this.handleCaptainPostPaymentRedirect(booking);
            if (!booking.feedbackSubmitted) {
              this.rideRating = 5;
              this.captainRating = 5;
              this.lovedRide = false;
              this.lovedCaptain = false;
              this.feedbackText = '';
            }
          }
        });
    });
  }

  ngOnDestroy(): void {
    this.clearAutoCloseTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup live location tracking - updates every 2 seconds
   */
  private setupLiveTracking(booking: Booking): void {
    if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'delivered') {
      this.isLiveTracking = false;
      return;
    }

    this.isLiveTracking = true;
    this.currentLat = booking.currentLocation.lat;
    this.currentLng = booking.currentLocation.lng;
    this.currentLocationAddress = booking.currentLocation.address;
    this.updateDistanceAndTime(booking);

    // Update live location every 2 seconds
    interval(2000)
      .pipe(
        startWith(0),
        switchMap(() => {
          if (!this.booking) return of(null);
          return this.bookingService.getBookingById$(this.booking.id);
        }),
        map((updatedBooking) => {
          if (updatedBooking && updatedBooking.currentLocation) {
            this.currentLat = updatedBooking.currentLocation.lat;
            this.currentLng = updatedBooking.currentLocation.lng;
            this.currentLocationAddress = updatedBooking.currentLocation.address;
            this.updateDistanceAndTime(updatedBooking);
            this.payableAmount = this.calculatePayableAmount(updatedBooking);
            this.booking = updatedBooking;
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  /**
   * Calculate distance to drop and estimated time
   */
  private updateDistanceAndTime(booking: Booking): void {
    if (booking.status === 'completed' || booking.status === 'delivered' || booking.status === 'cancelled') {
      this.distanceToDrop = 0;
      this.estimatedTime = 0;
      return;
    }

    const distance = this.haversineDistance(
      booking.currentLocation.lat,
      booking.currentLocation.lng,
      booking.drop.lat,
      booking.drop.lng
    );
    this.distanceToDrop = distance;
    // Keep ETA dynamic with live distance while never dropping below 2 minutes in active rides.
    const dynamicEtaMinutes = Math.ceil((distance / 35) * 60);
    this.estimatedTime = Math.max(TrackingComponent.MIN_RIDE_END_MINUTES, dynamicEtaMinutes);
  }

  /**
   * Haversine formula - calculate distance between two coordinates in km
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private buildMapUrl(currentLat: number, currentLng: number, dropLat: number, dropLng: number): string {
    const markerQuery = `${currentLat},${currentLng}`;
    const destination = `${dropLat},${dropLng}`;
    return `https://www.google.com/maps?q=${markerQuery}&z=14&output=embed&destination=${destination}`;
  }

  callLink(phone: string): string {
    return `tel:${this.normalizePhone(phone)}`;
  }

  whatsAppLink(phone: string): string {
    return `https://wa.me/${this.normalizePhone(phone)}`;
  }

  shareTripWhatsAppLink(booking: Booking): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lunchbox-app.vercel.app';
    const shareLink = `${origin}/tracking/${booking.id}`;
    const message = `Live trip link for booking ${booking.id}: ${shareLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  canTriggerSos(): boolean {
    return this.currentRole === 'customer' || this.currentRole === 'captain';
  }

  isCustomer(): boolean {
    return this.currentRole === 'customer';
  }

  isCaptain(): boolean {
    return this.currentRole === 'captain';
  }

  canCancelRide(booking: Booking): boolean {
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return false;
    }

    return this.currentRole === 'customer' || this.currentRole === 'captain';
  }

  triggerSos(booking: Booking): void {
    const role = this.currentRole === 'captain' ? 'captain' : 'customer';
    const result = this.bookingService.triggerSos(booking.id, role);
    this.notifications.push(result.message, result.success ? 'warning' : 'error');

    this.authService
      .recordUserAction('sos_triggered', {
        bookingId: booking.id,
        role
      })
      .subscribe({ error: () => void 0 });
  }

  startRideWithOtp(booking: Booking): void {
    const result = this.bookingService.verifyOtp(booking.id, this.customerOtpInput);
    this.notifications.push(result.message, result.success ? 'success' : 'error');

    if (!result.success) {
      return;
    }

    this.authService
      .recordUserAction('customer_otp_verified', {
        bookingId: booking.id,
        otpLength: this.customerOtpInput.length
      })
      .subscribe({ error: () => void 0 });

    this.customerOtpInput = '';
  }

  approveRideAsCaptain(booking: Booking): void {
    const result = this.bookingService.approveByCaptain(booking.id);
    this.notifications.push(result.message, result.success ? 'success' : 'error');

    if (!result.success) {
      return;
    }

    this.authService
      .recordUserAction('captain_ride_approved', {
        bookingId: booking.id,
        captainId: booking.captainId
      })
      .subscribe({ error: () => void 0 });
  }

  startRideByCaptainOtp(booking: Booking): void {
    const result = this.bookingService.verifyOtp(booking.id, this.captainOtpInput);
    this.notifications.push(result.message, result.success ? 'success' : 'error');

    if (!result.success) {
      return;
    }

    this.authService
      .recordUserAction('captain_otp_verified', {
        bookingId: booking.id,
        otpLength: this.captainOtpInput.length,
        captainId: booking.captainId
      })
      .subscribe({ error: () => void 0 });

    this.captainOtpInput = '';
  }

  cancelRide(booking: Booking): void {
    const role = this.currentRole === 'captain' ? 'captain' : 'customer';
    const result = this.bookingService.cancelRide(booking.id, role);
    this.notifications.push(result.message, result.success ? 'warning' : 'error');

    if (!result.success) {
      return;
    }

    this.authService
      .recordUserAction('ride_cancelled', {
        bookingId: booking.id,
        role
      })
      .subscribe({ error: () => void 0 });
  }

  submitFeedback(booking: Booking): void {
    const payload = {
      rideRating: this.rideRating,
      captainRating: this.captainRating,
      feedbackText: this.feedbackText,
      lovedRide: this.lovedRide,
      lovedCaptain: this.lovedCaptain
    };

    const result = this.bookingService.submitRideFeedback(booking.id, payload);
    this.notifications.push(result.message, result.success ? 'success' : 'error');

    if (!result.success) {
      return;
    }

    this.authService.submitCaptainFeedback({
      bookingId: booking.id,
      captainId: booking.captainId,
      captainName: booking.driverName,
      rideRating: payload.rideRating,
      captainRating: payload.captainRating,
      feedbackText: payload.feedbackText,
      lovedRide: payload.lovedRide,
      lovedCaptain: payload.lovedCaptain
    }).subscribe({
      error: (error) => {
        this.notifications.push(
          error?.error?.error || 'Feedback saved locally, but cloud sync failed.',
          'warning'
        );
      }
    });

    this.authService
      .recordUserAction('ride_feedback_submitted', {
        bookingId: booking.id,
        rideRating: this.rideRating,
        captainRating: this.captainRating,
        lovedRide: this.lovedRide,
        lovedCaptain: this.lovedCaptain
      })
      .subscribe({ error: () => void 0 });

    this.startAutoCloseTimer(booking.id, TrackingComponent.AUTO_CLOSE_DELAY_MS);
    this.notifications.push(
      'Feedback submitted. Tracking will close automatically in 5 minutes and redirect to booking history.',
      'info'
    );
  }

  completePayment(booking: Booking): void {
    const amount = this.calculatePayableAmount(booking);
    const result = this.bookingService.markPaymentDone(booking.id, amount);
    this.notifications.push(result.message, result.success ? 'success' : 'error');

    if (!result.success) {
      return;
    }

    this.authService
      .recordUserAction('ride_payment_completed', {
        bookingId: booking.id,
        amount
      })
      .subscribe({ error: () => void 0 });

    if (this.isCustomer()) {
      this.notifications.push('Customer payment successful. Captain will receive this payment update instantly.', 'info');
    }
  }

  statusLabel(status: Booking['status']): string {
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

    return labels[status] || status;
  }

  private calculatePayableAmount(booking: Booking): number {
    if (booking.finalAmount && booking.finalAmount > 0) {
      return Math.round(booking.finalAmount);
    }

    const distance = this.haversineDistance(
      booking.pickup.lat,
      booking.pickup.lng,
      booking.drop.lat,
      booking.drop.lng
    );
    return Math.max(10, Math.round(distance * TrackingComponent.RATE_PER_KM_RS));
  }
  
  getRatePerKm(): number {
    return TrackingComponent.RATE_PER_KM_RS;
  }

  formatAutoCloseCountdown(): string {
    const total = Math.max(0, this.autoCloseRemainingSeconds);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  private syncAutoCloseTracking(booking: Booking): void {
    if (!this.isCustomer() || booking.status !== 'completed' || !booking.paymentDone || booking.trackingClosed || !booking.feedbackSubmitted) {
      this.clearAutoCloseTimer();
      return;
    }

    const submittedAt = booking.feedbackSubmittedAt ? new Date(booking.feedbackSubmittedAt).getTime() : Date.now();
    const remainingMs = Math.max(0, submittedAt + TrackingComponent.AUTO_CLOSE_DELAY_MS - Date.now());
    this.startAutoCloseTimer(booking.id, remainingMs);
  }

  private startAutoCloseTimer(bookingId: string, delayMs: number): void {
    this.clearAutoCloseTimer();

    this.isAutoClosePending = true;
    this.autoCloseDueAt = Date.now() + Math.max(0, delayMs);
    this.autoCloseRemainingSeconds = Math.ceil(Math.max(0, delayMs) / 1000);

    this.autoCloseIntervalId = setInterval(() => {
      const remainingMs = Math.max(0, this.autoCloseDueAt - Date.now());
      this.autoCloseRemainingSeconds = Math.ceil(remainingMs / 1000);
      if (remainingMs <= 0) {
        this.clearAutoCloseTimer(false);
      }
    }, 1000);

    this.autoCloseTimeoutId = setTimeout(() => {
      this.executeAutoCloseTracking(bookingId);
    }, Math.max(0, delayMs));
  }

  private executeAutoCloseTracking(bookingId: string): void {
    const closeResult = this.bookingService.closeTracking(bookingId);
    this.notifications.push(closeResult.message, closeResult.success ? 'success' : 'warning');

    if (!closeResult.success) {
      this.clearAutoCloseTimer();
      return;
    }

    this.authService
      .recordUserAction('ride_tracking_closed_auto', {
        bookingId,
        delayMinutes: 5
      })
      .subscribe({ error: () => void 0 });

    this.clearAutoCloseTimer();
    this.router.navigate(['/booking'], {
      queryParams: {
        history: 'completed',
        bookingId
      }
    });
  }

  private clearAutoCloseTimer(resetPending: boolean = true): void {
    if (this.autoCloseTimeoutId) {
      clearTimeout(this.autoCloseTimeoutId);
      this.autoCloseTimeoutId = undefined;
    }

    if (this.autoCloseIntervalId) {
      clearInterval(this.autoCloseIntervalId);
      this.autoCloseIntervalId = undefined;
    }

    this.autoCloseRemainingSeconds = 0;
    if (resetPending) {
      this.isAutoClosePending = false;
    }
  }

  private normalizePhone(phone: string): string {
    return String(phone || '').replace(/[^0-9+]/g, '');
  }

  private handleCaptainPostPaymentRedirect(booking: Booking): void {
    if (!this.isCaptain()) {
      this.captainPaymentRedirectHandled = false;
      return;
    }

    if (booking.status !== 'completed' || !booking.paymentDone) {
      this.captainPaymentRedirectHandled = false;
      return;
    }

    if (this.captainPaymentRedirectHandled) {
      return;
    }

    this.captainPaymentRedirectHandled = true;
    this.notifications.push('Customer payment received. Redirecting to your Jobs and Deliveries page...', 'success');

    setTimeout(() => {
      this.router.navigate(['/captain-profile'], {
        queryParams: {
          focus: 'deliveries',
          bookingId: booking.id,
          payment: 'done'
        }
      });
    }, 800);
  }
}
