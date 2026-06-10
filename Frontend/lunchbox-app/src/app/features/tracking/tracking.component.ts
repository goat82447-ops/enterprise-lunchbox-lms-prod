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
      <h2 class="mb-2">Activity Center</h2>
      <p class="text-muted mb-3">Live tracking and past ride details in one place.</p>

      <div class="activity-stats mb-4" *ngIf="activityBookings.length">
        <div class="activity-stat-card">
          <div class="stat-label">Total Rides</div>
          <div class="stat-value">{{ activityBookings.length }}</div>
        </div>
        <div class="activity-stat-card">
          <div class="stat-label">Live Rides</div>
          <div class="stat-value text-danger">{{ liveBookings.length }}</div>
        </div>
        <div class="activity-stat-card">
          <div class="stat-label">Past Rides</div>
          <div class="stat-value text-success">{{ pastBookings.length }}</div>
        </div>
      </div>

      <div class="row g-3 mb-4" *ngIf="activityBookings.length">
        <div class="col-lg-6">
          <div class="card p-3 activity-list-card h-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Live Tracking</h5>
              <span class="badge text-bg-danger" *ngIf="liveBookings.length">Live</span>
            </div>
            <div class="text-muted small mb-2" *ngIf="!liveBookings.length">No active rides right now.</div>
            <div class="activity-list" *ngIf="liveBookings.length">
              <button
                type="button"
                class="activity-item"
                [class.active]="booking?.id === item.id"
                *ngFor="let item of liveBookings"
                (click)="openBookingFromActivity(item)"
              >
                <div class="activity-item-top">
                  <strong>{{ item.id }}</strong>
                  <span class="status-chip" [ngClass]="statusChipClass(item.status)">{{ statusLabel(item.status) }}</span>
                </div>
                <div class="activity-item-meta">{{ item.pickup.address }} -> {{ item.drop.address }}</div>
                <div class="activity-item-meta">{{ item.serviceType | titlecase }} • {{ item.vehicleType | titlecase }} • {{ item.updatedAt | date: 'short' }}</div>
              </button>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card p-3 activity-list-card h-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Past Ride Details</h5>
              <span class="badge text-bg-secondary" *ngIf="pastBookings.length">History</span>
            </div>

            <div class="d-flex gap-2 mb-2 flex-wrap">
              <select class="form-select form-select-sm history-filter" [(ngModel)]="historyFilter">
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                class="form-control form-control-sm history-search"
                placeholder="Search booking id / service / vehicle"
                [(ngModel)]="historySearch"
              />
            </div>

            <div class="text-muted small mb-2" *ngIf="!filteredPastBookings.length">No past rides found for your filter.</div>
            <div class="activity-list" *ngIf="filteredPastBookings.length">
              <button
                type="button"
                class="activity-item"
                [class.active]="booking?.id === item.id"
                *ngFor="let item of filteredPastBookings"
                (click)="openBookingFromActivity(item)"
              >
                <div class="activity-item-top">
                  <strong>{{ item.id }}</strong>
                  <span class="status-chip" [ngClass]="statusChipClass(item.status)">{{ statusLabel(item.status) }}</span>
                </div>
                <div class="activity-item-meta">{{ item.pickup.address }} -> {{ item.drop.address }}</div>
                <div class="activity-item-meta">{{ item.serviceType | titlecase }} • {{ item.vehicleType | titlecase }} • {{ item.updatedAt | date: 'short' }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!booking && !activityBookings.length" class="alert alert-info">
        No booking selected. Go to <a routerLink="/booking">Booking</a>.
      </div>

      <div *ngIf="booking" class="row g-4">
        <div class="col-lg-5">
          <div class="card p-3 h-100">
            <h5>{{ booking.id }}<span class="badge bg-success ms-2" *ngIf="isLiveTracking">🔴 LIVE</span></h5>
            <div class="food-progress-card mb-3" *ngIf="booking.serviceType === 'food'">
              <div class="food-progress-title">Food Order Flow</div>
              <div class="food-progress-subtitle">{{ foodFlowStatusText(booking.status) }}</div>
              <div class="food-confirmation-countdown" *ngIf="showFoodConfirmationCountdown()">
                Confirming your order in {{ formatFoodConfirmationCountdown() }}
              </div>
              <div class="food-progress-list">
                <div
                  class="food-progress-item"
                  *ngFor="let step of foodFlowSteps; let index = index"
                  [class.completed]="isFoodStepCompleted(index)"
                  [class.active]="isFoodStepActive(index)"
                >
                  <div class="food-step-bullet">{{ index + 1 }}</div>
                  <div class="food-step-label">{{ step }}</div>
                </div>
              </div>
            </div>

            <div class="progress-timeline mb-3" *ngIf="booking.serviceType !== 'food' && (booking.status === 'assigned' || booking.status === 'pickup_in_progress' || booking.status === 'in_transit')">
              <div class="progress-step" [class.completed]="isStageCompleted(0)" [class.active]="isStageActive(0)">
                <div class="step-icon">✓</div>
                <div class="step-label">Accepted</div>
              </div>
              <div class="progress-line" [class.completed]="isStageCompleted(0)"></div>
              <div class="progress-step" [class.completed]="isStageCompleted(1)" [class.active]="isStageActive(1)">
                <div class="step-icon">→</div>
                <div class="step-label">Reaching</div>
              </div>
              <div class="progress-line" [class.completed]="isStageCompleted(1)"></div>
              <div class="progress-step" [class.completed]="isStageCompleted(2)" [class.active]="isStageActive(2)">
                <div class="step-icon">📍</div>
                <div class="step-label">Arrived</div>
              </div>
            </div>

            <p class="mb-1"><strong>Status:</strong> {{ statusLabel(booking.status) }}</p>
            <p class="mb-1"><strong>Service:</strong> {{ booking.serviceType }}</p>
            <p class="mb-1"><strong>Vehicle:</strong> {{ booking.vehicleType }}</p>
            <p class="mb-1"><strong>Payment:</strong> {{ booking.paymentMethod }}</p>
            <p class="mb-1"><strong>Pickup:</strong> {{ booking.pickup.address }}</p>
            <p class="mb-1"><strong>Drop:</strong> {{ booking.drop.address }}</p>
            <p class="mb-1"><strong>Current Location:</strong> {{ currentLocationAddress }}</p>
            <p class="mb-1"><strong>Coordinates:</strong> {{ currentLat | number: '1.5-5' }}, {{ currentLng | number: '1.5-5' }}</p>
            <p class="mb-1"><strong>Distance to Drop:</strong> {{ distanceToDrop | number: '1.2-2' }} km</p>
            <p class="mb-1" *ngIf="showPickupApproachInfo(booking)"><strong>Distance to Pickup:</strong> {{ distanceToPickup | number: '1.2-2' }} km</p>
            <p class="mb-1" *ngIf="showPickupApproachInfo(booking)"><strong>ETA to Pickup:</strong> {{ pickupEtaMinutes }} min</p>
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

            <div class="card p-2 mb-2 border-warning" *ngIf="showPickupApproachInfo(booking) && isCustomer()">
              <div class="small fw-semibold text-warning-emphasis">Captain is approaching pickup</div>
              <div class="small">Captain is about {{ distanceToPickup | number: '1.1-1' }} km away and should arrive in around {{ pickupEtaMinutes }} min.</div>
              <div class="small text-muted">Captain live location: {{ currentLocationAddress }}</div>
            </div>

            <div class="card p-2 mb-2 border-primary" *ngIf="showPickupApproachInfo(booking) && isCaptain()">
              <div class="small fw-semibold text-primary">Pickup guidance for captain</div>
              <div class="small">You are {{ distanceToPickup | number: '1.1-1' }} km away from pickup. Estimated arrival: {{ pickupEtaMinutes }} min.</div>
              <div class="small text-muted">Customer: {{ customerDisplayName(booking) }}</div>
              <div class="small text-muted">Pickup point: {{ booking.pickup.address }}</div>
              <div class="small text-muted" *ngIf="booking.recipientPhone">Customer phone: {{ booking.recipientPhone }}</div>
            </div>

            <div class="card p-2 mb-2" *ngIf="booking.status === 'assigned' && !booking.otpVerified && isCustomer()">
              <label class="form-label mb-1"><strong>Start Ride OTP</strong></label>
              <div class="d-flex gap-2 flex-wrap">
                <input class="form-control form-control-sm otp-input" placeholder="Enter 6-digit OTP" [(ngModel)]="customerOtpInput" />
                <button class="btn btn-sm btn-danger" type="button" (click)="startRideWithOtp(booking)">Verify & Start</button>
              </div>
            </div>
            <div class="card p-2 mb-2" *ngIf="booking.status === 'created' && isCaptain()">
              <label class="form-label mb-1"><strong>Captain Ride Acceptance</strong></label>
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-primary" type="button" (click)="approveRideAsCaptain(booking)">Accept Ride</button>
              </div>
            </div>
            <div class="card p-2 mb-2" *ngIf="booking.status === 'assigned' && isCaptain()">
              <label class="form-label mb-1"><strong>Captain OTP Start</strong></label>
              <div class="d-flex gap-2 flex-wrap">
                <input class="form-control form-control-sm otp-input" placeholder="Enter customer OTP" [(ngModel)]="captainOtpInput" />
                <button class="btn btn-sm btn-primary" type="button" (click)="startRideByCaptainOtp(booking)">Verify OTP & Start</button>
              </div>
            </div>
            <div class="d-flex gap-2 mb-2 flex-wrap">
              <a class="btn btn-sm btn-outline-primary" [href]="callLink(booking.driverPhone)">📞 Call Captain</a>
              <a class="btn btn-sm btn-outline-success" [href]="whatsAppLink(booking.driverPhone)" target="_blank" rel="noopener">💬 WhatsApp</a>
              <a class="btn btn-sm btn-outline-dark" [href]="shareTripWhatsAppLink(booking)" target="_blank" rel="noopener">🔗 Share Trip</a>
              <button class="btn btn-sm btn-outline-danger" type="button" *ngIf="canTriggerSos()" (click)="triggerSos(booking)">🆘 SOS</button>
            </div>

            <!-- Cancel Ride — prominent card -->
            <div class="cancel-ride-card mb-3" *ngIf="canCancelRide(booking)">
              <div class="cancel-ride-inner">
                <div>
                  <div class="cancel-ride-title">Need to cancel?</div>
                  <div class="cancel-ride-sub">You can cancel before the ride starts.</div>
                </div>
                <button class="btn btn-sm btn-danger" type="button" (click)="showCancelDialog = true">✕ Cancel Ride</button>
              </div>
            </div>

            <div class="alert alert-secondary mb-3">{{ booking.notification }}</div>

            <!-- Live Chat Board — available from booking creation -->
            <div class="chat-board mb-3" *ngIf="booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'delivered'">
              <div class="chat-header">
                <div class="chat-header-left">
                  <span class="chat-header-title">💬 Chat with Captain</span>
                  <span class="chat-status-dot" [class.active]="booking.status !== 'created'"></span>
                  <span class="chat-status-label">{{ booking.status === 'created' ? 'Waiting for captain...' : 'Captain connected' }}</span>
                </div>
                <span class="badge bg-primary" *ngIf="unreadMessageCount > 0">{{ unreadMessageCount }} new</span>
              </div>
              <div class="chat-messages">
                <div class="chat-empty" *ngIf="chatMessages.length === 0">
                  {{ booking.status === 'created' ? '🕐 Your message will be delivered once a captain accepts the ride.' : 'No messages yet. Say hello! 👋' }}
                </div>
                <div class="message" *ngFor="let msg of chatMessages" [class.from-captain]="msg.role === 'captain'" [class.from-customer]="msg.role === 'customer'">
                  <div class="message-role">{{ msg.role === 'captain' ? '🏍️ Captain' : '👤 You' }}</div>
                  <div class="message-text">{{ msg.text }}</div>
                  <div class="message-time">{{ msg.time | date: 'HH:mm' }}</div>
                </div>
              </div>
              <div class="quick-messages mb-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" *ngFor="let qm of quickMessages" (click)="sendQuickMessage(qm, booking)">{{ qm }}</button>
              </div>
              <div class="chat-input-row">
                <input class="form-control form-control-sm" placeholder="Type message..." [(ngModel)]="chatInput" (keydown.enter)="sendChatMessage(booking)" />
                <button class="btn btn-sm btn-primary" type="button" (click)="sendChatMessage(booking)">Send ➤</button>
              </div>
            </div>

            <!-- Cancel Ride Dialog -->
            <div class="modal-overlay" *ngIf="showCancelDialog" (click)="showCancelDialog = false">
              <div class="modal-content" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h5 class="modal-title">Why are you cancelling?</h5>
                  <button type="button" class="btn-close" (click)="showCancelDialog = false">×</button>
                </div>
                <div class="modal-body">
                  <p class="text-muted mb-3">Select a reason to help us improve</p>
                  <div class="reason-list">
                    <button type="button" class="reason-btn" *ngFor="let reason of cancelReasons" (click)="confirmCancelRide(booking, reason)">
                      <div class="reason-icon">{{ reason.icon }}</div>
                      <div class="reason-text">
                        <div class="reason-title">{{ reason.label }}</div>
                        <div class="reason-desc">{{ reason.desc }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

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
  `,
  styles: [`
    .activity-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .activity-stat-card {
      border: 1px solid #dee2e6;
      border-radius: 12px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      padding: 12px;
    }

    .stat-label {
      font-size: 12px;
      color: #6c757d;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }

    .activity-list-card {
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .activity-item {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      padding: 10px;
      text-align: left;
      width: 100%;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .activity-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
      border-color: #93c5fd;
    }

    .activity-item.active {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.16);
      background: #f8fbff;
    }

    .activity-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .activity-item-meta {
      font-size: 12px;
      color: #64748b;
      line-height: 1.35;
    }

    .status-chip {
      font-size: 11px;
      font-weight: 600;
      border-radius: 999px;
      padding: 2px 8px;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .status-live {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fecaca;
    }

    .status-completed {
      background: #dcfce7;
      color: #166534;
      border-color: #bbf7d0;
    }

    .status-cancelled {
      background: #e5e7eb;
      color: #334155;
      border-color: #cbd5e1;
    }

    .status-other {
      background: #ede9fe;
      color: #5b21b6;
      border-color: #ddd6fe;
    }

    .history-filter {
      width: 140px;
      min-width: 140px;
    }

    .history-search {
      min-width: 180px;
      flex: 1;
    }

    .progress-timeline {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 10px;
      border: 1px solid #dee2e6;
      margin-bottom: 12px;
    }

    .food-progress-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 10px;
      padding: 12px;
    }

    .food-progress-title {
      font-weight: 700;
      color: #1f2937;
      font-size: 14px;
    }

    .food-progress-subtitle {
      margin-top: 2px;
      margin-bottom: 8px;
      font-size: 12px;
      color: #475569;
      font-weight: 600;
    }

    .food-confirmation-countdown {
      margin-bottom: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
    }

    .food-progress-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .food-progress-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #ffffff;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .food-step-bullet {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      background: #e5e7eb;
      color: #4b5563;
      flex-shrink: 0;
    }

    .food-step-label {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      line-height: 1.25;
    }

    .food-progress-item.active {
      border-color: #0d6efd;
      background: #eff6ff;
    }

    .food-progress-item.active .food-step-bullet {
      background: #0d6efd;
      color: #ffffff;
    }

    .food-progress-item.active .food-step-label {
      color: #0d6efd;
    }

    .food-progress-item.completed {
      border-color: #22c55e;
      background: #f0fdf4;
    }

    .food-progress-item.completed .food-step-bullet {
      background: #22c55e;
      color: #ffffff;
    }

    .food-progress-item.completed .food-step-label {
      color: #15803d;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      z-index: 2;
    }

    .step-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 16px;
      font-weight: 700;
      background: #e9ecef;
      color: #6c757d;
      transition: all 0.3s ease;
    }

    .progress-step.active .step-icon {
      background: #0d6efd;
      color: #fff;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
    }

    .progress-step.completed .step-icon {
      background: #28a745;
      color: #fff;
    }

    .step-label {
      font-size: 11px;
      font-weight: 600;
      color: #6c757d;
      text-align: center;
      white-space: nowrap;
    }

    .progress-step.active .step-label {
      color: #0d6efd;
    }

    .progress-step.completed .step-label {
      color: #28a745;
    }

    .progress-line {
      flex: 1;
      height: 3px;
      background: #dee2e6;
      margin: 0 -2px;
      position: relative;
      z-index: 1;
      transition: background 0.3s ease;
    }

    .progress-line.completed {
      background: #28a745;
    }

    /* ── Cancel Ride Card ── */
    .cancel-ride-card {
      border: 1.5px solid #fecaca;
      background: #fff5f5;
      border-radius: 12px;
      padding: 12px 16px;
    }
    .cancel-ride-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .cancel-ride-title { font-size: 14px; font-weight: 700; color: #991b1b; }
    .cancel-ride-sub   { font-size: 12px; color: #b91c1c; margin-top: 2px; }

    /* ── Chat enhancements ── */
    .chat-header-left { display: flex; align-items: center; gap: 8px; }
    .chat-header-title { font-size: 13px; font-weight: 700; }
    .chat-status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #9ca3af; flex-shrink: 0;
    }
    .chat-status-dot.active { background: #22c55e; }
    .chat-status-label { font-size: 11px; color: #6b7280; }
    .chat-empty {
      text-align: center; color: #9ca3af;
      font-size: 13px; padding: 24px 12px; font-style: italic;
    }
    .chat-input-row {
      display: flex; gap: 8px; padding: 8px 12px;
      border-top: 1px solid #dee2e6; background: #fff;
    }

    .chat-board {
      border: 1px solid #dee2e6;
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 420px;
    }

    .chat-header {
      background: #f8f9fa;
      padding: 10px 12px;
      border-bottom: 1px solid #dee2e6;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #fafbfc;
    }

    .message {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 85%;
      padding: 8px 10px;
      border-radius: 8px;
      background: #e9ecef;
      font-size: 13px;
    }

    .message.from-customer {
      align-self: flex-end;
      background: #0d6efd;
      color: #fff;
    }

    .message.from-captain {
      align-self: flex-start;
      background: #e9ecef;
      color: #000;
    }

    .message-role {
      font-weight: 600;
      font-size: 12px;
      opacity: 0.7;
    }

    .message-text {
      word-break: break-word;
    }

    .message-time {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 2px;
    }

    .quick-messages {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
    }

    .quick-messages .btn {
      font-size: 11px;
      padding: 4px 8px;
      white-space: nowrap;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 420px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      padding: 16px;
      border-bottom: 1px solid #dee2e6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #6c757d;
      padding: 0;
    }

    .btn-close:hover {
      color: #000;
    }

    .modal-body {
      padding: 16px;
    }

    .reason-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reason-btn {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }

    .reason-btn:hover {
      border-color: #dc3545;
      background: #fff5f6;
    }

    .reason-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .reason-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .reason-title {
      font-weight: 600;
      font-size: 13px;
      color: #000;
    }

    .reason-desc {
      font-size: 12px;
      color: #6c757d;
    }

    @media (max-width: 576px) {
      .activity-stats {
        grid-template-columns: 1fr;
      }

      .progress-timeline {
        gap: 2px;
      }

      .step-icon {
        width: 28px;
        height: 28px;
        font-size: 14px;
      }

      .step-label {
        font-size: 10px;
      }

      .chat-board {
        max-height: 300px;
      }

      .message {
        max-width: 90%;
        font-size: 12px;
      }

      .quick-messages .btn {
        font-size: 10px;
        padding: 3px 6px;
      }
    }
  `]
})
export class TrackingComponent implements OnInit, OnDestroy {
  private static readonly AUTO_CLOSE_DELAY_MS = 5 * 60 * 1000;
  private static readonly RATE_PER_KM_RS = 10;
  private static readonly MIN_RIDE_END_MINUTES = 2;
  private static readonly FOOD_CONFIRMATION_DELAY_SECONDS = 2 * 60;

  booking?: Booking;
  activityBookings: Booking[] = [];
  liveBookings: Booking[] = [];
  pastBookings: Booking[] = [];
  historyFilter: 'all' | 'completed' | 'cancelled' = 'all';
  historySearch = '';
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
  distanceToPickup = 0;
  pickupEtaMinutes = 0;
  readonly foodFlowSteps = [
    'Searching for captains',
    'Captain accepted your order',
    'Captain going to hotel/restaurant',
    'Captain picked up your order',
    'Captain arriving'
  ];
  estimatedTime = 0;
  payableAmount = 0;
  readonly PICKUP_ARRIVAL_THRESHOLD = 0.2; // 200 meters
  autoCloseRemainingSeconds = 0;
  isAutoClosePending = false;
  showCancelDialog = false;
  chatMessages: Array<{ role: 'captain' | 'customer'; text: string; time: Date }> = [];
  chatInput = '';
  unreadMessageCount = 0;
  quickMessages = [
    'On the way',
    'Arrived at location',
    'Traffic is heavy',
    'Thanks for waiting',
    'Your OTP is ready',
    'I\'m 5 mins away',
    'Need directions?'
  ];
  cancelReasons = [
    { icon: '📍', label: 'Wrong Location', desc: 'Captain heading to wrong place' },
    { icon: '⏱️', label: 'Taking Too Long', desc: 'Captain is taking too long to arrive' },
    { icon: '🚗', label: 'Driver Not Coming', desc: 'Captain is not moving or not coming' },
    { icon: '💬', label: 'Communication Issue', desc: 'Cannot reach captain' },
    { icon: '❌', label: 'Changed My Mind', desc: 'No longer need the ride' },
    { icon: '⚠️', label: 'Safety Concern', desc: 'Safety or security issue' },
    { icon: '🔧', label: 'Technical Issue', desc: 'App or booking issue' },
    { icon: '📝', label: 'Other', desc: 'Different reason' }
  ];
  private readonly destroy$ = new Subject<void>();
  private readonly liveTrackingStop$ = new Subject<void>();
  private autoCloseTimeoutId?: ReturnType<typeof setTimeout>;
  private autoCloseIntervalId?: ReturnType<typeof setInterval>;
  private foodCountdownIntervalId?: ReturnType<typeof setInterval>;
  private autoCloseDueAt = 0;
  private nowTickMs = Date.now();
  private captainPaymentRedirectHandled = false;
  private statusRedirectHandled = false;
  /** True only when the booking was in a live/active state when first opened this session */
  private bookingOpenedAsLive = false;
  /** Tracks booking IDs for which recordUserAction('tracking_viewed') has already been sent */
  private readonly trackingViewedIds = new Set<string>();
  /** Tracks the booking ID for which setupLiveTracking was last called to avoid restarting on every poll */
  private lastSetupTrackingBookingId = '';

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private authService: AuthService,
    private notifications: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.foodCountdownIntervalId = setInterval(() => {
      this.nowTickMs = Date.now();
    }, 1000);

    this.currentRole = this.authService.getCurrentUser()?.role;
    this.watchActivityBookings();

    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const bookingId = params.get('id');
        if (!bookingId) {
          this.tryAutoSelectBooking();
          return of(null);
        }
        return this.bookingService.getBookingById$(bookingId);
      })
    ).subscribe((booking) => {
      this.booking = booking ?? undefined;
      if (!booking) {
        return;
      }

      // One-time per booking: record whether it was live when opened, and log the view action
      if (!this.trackingViewedIds.has(booking.id)) {
        this.bookingOpenedAsLive = this.isLiveStatus(booking.status);
        this.trackingViewedIds.add(booking.id);
        this.authService
          .recordUserAction('tracking_viewed', { bookingId: booking.id, status: booking.status })
          .subscribe({ error: () => void 0 });
      }

      this.googleMapUrl = this.buildMapUrl(booking.currentLocation.lat, booking.currentLocation.lng, booking.drop.lat, booking.drop.lng);

      // Only (re)start live tracking when the booking ID changes or status transitions
      if (this.lastSetupTrackingBookingId !== booking.id) {
        this.lastSetupTrackingBookingId = booking.id;
        this.setupLiveTracking(booking);
      }

      this.payableAmount = this.calculatePayableAmount(booking);
      this.syncAutoCloseTracking(booking);
      this.handleCaptainPostPaymentRedirect(booking);
      this.handleMainPageRedirectForTerminalStatus(booking);
      if (!booking.feedbackSubmitted) {
        this.rideRating = 5;
        this.captainRating = 5;
        this.lovedRide = false;
        this.lovedCaptain = false;
        this.feedbackText = '';
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAutoCloseTimer();
    if (this.foodCountdownIntervalId) {
      clearInterval(this.foodCountdownIntervalId);
      this.foodCountdownIntervalId = undefined;
    }
    this.liveTrackingStop$.next();
    this.liveTrackingStop$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredPastBookings(): Booking[] {
    const term = this.historySearch.trim().toLowerCase();

    return this.pastBookings.filter((item) => {
      const byFilter = this.historyFilter === 'all' || item.status === this.historyFilter;
      if (!byFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchable = `${item.id} ${item.serviceType} ${item.vehicleType} ${item.pickup.address} ${item.drop.address}`.toLowerCase();
      return searchable.includes(term);
    });
  }

  openBookingFromActivity(item: Booking): void {
    if (this.booking?.id === item.id) {
      return;
    }

    this.router.navigate(['/tracking', item.id]);
  }

  statusChipClass(status: Booking['status']): string {
    if (this.isLiveStatus(status)) {
      return 'status-live';
    }

    if (status === 'completed' || status === 'delivered') {
      return 'status-completed';
    }

    if (status === 'cancelled') {
      return 'status-cancelled';
    }

    return 'status-other';
  }

  private watchActivityBookings(): void {
    this.bookingService.bookings$.pipe(takeUntil(this.destroy$)).subscribe((bookings) => {
      const currentUser = this.authService.getCurrentUser();
      const role = currentUser?.role;

      let relevant = bookings;

      if (role === 'customer') {
        relevant = bookings.filter((item) => item.userId === currentUser?.id);
      } else if (role === 'captain') {
        relevant = bookings.filter((item) => item.captainId === currentUser?.id);
      }

      this.activityBookings = [...relevant].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      this.liveBookings = this.activityBookings.filter((item) => this.isLiveStatus(item.status));
      this.pastBookings = this.activityBookings.filter((item) => !this.isLiveStatus(item.status));

      if (!this.route.snapshot.paramMap.get('id')) {
        this.tryAutoSelectBooking();
      }
    });
  }

  private tryAutoSelectBooking(): void {
    if (this.booking) {
      return;
    }

    // Only auto-navigate to a live ride. Past/completed rides should stay in the list
    // so the user can browse them without being immediately redirected.
    const candidate = this.liveBookings[0];
    if (!candidate) {
      return;
    }

    this.router.navigate(['/tracking', candidate.id]);
  }

  private isLiveStatus(status: Booking['status']): boolean {
    return status === 'created' || status === 'assigned' || status === 'pickup_in_progress' || status === 'in_transit' || status === 'arriving';
  }

  /**
   * Setup live location tracking - updates every 2 seconds
   */
  private setupLiveTracking(booking: Booking): void {
    this.liveTrackingStop$.next();

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
        takeUntil(this.liveTrackingStop$),
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
      this.distanceToPickup = 0;
      this.pickupEtaMinutes = 0;
      this.estimatedTime = 0;
      return;
    }

    const distanceToDrop = this.haversineDistance(
      booking.currentLocation.lat,
      booking.currentLocation.lng,
      booking.drop.lat,
      booking.drop.lng
    );
    this.distanceToDrop = distanceToDrop;

    const distanceToPickup = this.haversineDistance(
      booking.currentLocation.lat,
      booking.currentLocation.lng,
      booking.pickup.lat,
      booking.pickup.lng
    );
    this.distanceToPickup = distanceToPickup;

    // Keep ETA dynamic with live distance while never dropping below 2 minutes in active rides.
    const dynamicEtaMinutes = Math.ceil((distanceToDrop / 35) * 60);
    this.estimatedTime = Math.max(TrackingComponent.MIN_RIDE_END_MINUTES, dynamicEtaMinutes);

    // Pickup ETA is tuned for city roads during captain approach.
    const pickupEta = Math.ceil((distanceToPickup / 28) * 60);
    this.pickupEtaMinutes = Math.max(1, pickupEta);
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

  confirmCancelRide(booking: Booking, reason: { icon: string; label: string; desc: string }): void {
    this.showCancelDialog = false;
    const role = this.currentRole === 'captain' ? 'captain' : 'customer';
    const result = this.bookingService.cancelRide(booking.id, role);
    this.notifications.push(`${reason.label}: ${result.message}`, result.success ? 'warning' : 'error');

    if (!result.success) {
      return;
    }

    this.authService
      .recordUserAction('ride_cancelled_with_reason', {
        bookingId: booking.id,
        role,
        cancelReason: reason.label
      })
      .subscribe({ error: () => void 0 });
  }

  sendChatMessage(booking: Booking): void {
    if (!this.chatInput.trim()) return;

    const role: 'captain' | 'customer' = this.currentRole === 'captain' ? 'captain' : 'customer';
    const message = {
      role,
      text: this.chatInput,
      time: new Date()
    };

    this.chatMessages.push(message);
    this.chatInput = '';

    // Simulate captain/customer response after 1-2 seconds
    setTimeout(() => {
      const responses = [
        'Thanks for the update',
        'Understood, on the way',
        'Will be there soon',
        'Just arrived',
        'No problem, thanks'
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const responseRole: 'captain' | 'customer' = role === 'captain' ? 'customer' : 'captain';
      this.chatMessages.push({
        role: responseRole,
        text: randomResponse,
        time: new Date()
      });
    }, 1000 + Math.random() * 1000);

    // Scroll to bottom
    setTimeout(() => {
      const messagesDiv = document.querySelector('.chat-messages');
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }, 0);
  }

  sendQuickMessage(text: string, booking: Booking): void {
    this.chatInput = text;
    this.sendChatMessage(booking);
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

  foodFlowStatusText(status: Booking['status']): string {
    if (status === 'cancelled') {
      return 'Order cancelled';
    }
    if (status === 'completed' || status === 'delivered') {
      return 'Order delivered successfully';
    }
    return this.foodFlowSteps[Math.max(0, this.getFoodFlowStage(status))];
  }

  showFoodConfirmationCountdown(): boolean {
    return !!this.booking && this.booking.serviceType === 'food' && this.booking.status === 'created';
  }

  formatFoodConfirmationCountdown(): string {
    if (!this.booking || this.booking.serviceType !== 'food') {
      return '0:00';
    }

    const createdAt = new Date(this.booking.createdAt).getTime();
    if (Number.isNaN(createdAt)) {
      return '0:00';
    }

    const elapsedSeconds = Math.floor((this.nowTickMs - createdAt) / 1000);
    const remaining = Math.max(0, TrackingComponent.FOOD_CONFIRMATION_DELAY_SECONDS - elapsedSeconds);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  isFoodStepActive(step: number): boolean {
    if (!this.booking || this.booking.serviceType !== 'food') {
      return false;
    }

    if (this.booking.status === 'completed' || this.booking.status === 'delivered' || this.booking.status === 'cancelled') {
      return false;
    }

    return this.getFoodFlowStage(this.booking.status) === step;
  }

  isFoodStepCompleted(step: number): boolean {
    if (!this.booking || this.booking.serviceType !== 'food') {
      return false;
    }

    if (this.booking.status === 'completed' || this.booking.status === 'delivered') {
      return true;
    }

    return this.getFoodFlowStage(this.booking.status) > step;
  }

  private getFoodFlowStage(status: Booking['status']): number {
    if (status === 'completed' || status === 'delivered' || status === 'arriving') {
      return 4;
    }
    if (status === 'in_transit') {
      return 3;
    }
    if (status === 'pickup_in_progress') {
      return 2;
    }
    if (status === 'assigned') {
      return 1;
    }
    return 0;
  }

  showPickupApproachInfo(booking: Booking): boolean {
    return booking.status === 'assigned' || booking.status === 'pickup_in_progress';
  }

  customerDisplayName(booking: Booking): string {
    if (booking.bookingFor === 'others' && booking.recipientName?.trim()) {
      return booking.recipientName.trim();
    }

    return booking.userName;
  }

  isStageActive(stage: number): boolean {
    if (!this.booking) return false;
    return this.getCurrentStage() === stage;
  }

  isStageCompleted(stage: number): boolean {
    if (!this.booking) return false;
    return this.getCurrentStage() > stage;
  }

  private getCurrentStage(): number {
    if (!this.booking || (this.booking.status !== 'assigned' && this.booking.status !== 'pickup_in_progress' && this.booking.status !== 'in_transit')) {
      return -1;
    }

    // Stage 2: Arrived at pickup (within 200 meters)
    if (this.distanceToPickup <= this.PICKUP_ARRIVAL_THRESHOLD) {
      return 2;
    }

    // Stage 1: Captain reaching pickup (distance > 0)
    if (this.distanceToPickup > 0) {
      return 1;
    }

    // Stage 0: Captain accepted
    return 0;
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

    // If the timer is already running (isAutoClosePending), do not tear it down and restart —
    // that would reset the countdown on every booking poll update.
    if (this.isAutoClosePending) {
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
    if (this.statusRedirectHandled) {
      return;
    }

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

  private handleMainPageRedirectForTerminalStatus(booking: Booking): void {
    if (this.statusRedirectHandled) {
      return;
    }

    if (booking.status !== 'completed' && booking.status !== 'cancelled') {
      return;
    }

    // Only redirect home if the booking was LIVE when the user opened this view.
    // If the user opened a past/completed ride for review, do NOT redirect them away.
    if (!this.bookingOpenedAsLive) {
      return;
    }

    this.statusRedirectHandled = true;
    this.notifications.push(
      booking.status === 'completed'
        ? 'Ride completed. Redirecting to home page...'
        : 'Ride cancelled. Redirecting to home page...',
      booking.status === 'completed' ? 'success' : 'warning'
    );

    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1200);
  }
}
