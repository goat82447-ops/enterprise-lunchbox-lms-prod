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
    <div class="container py-4" *ngIf="captain as c">
      <h2 class="mb-3">Captain Profile</h2>

      <!-- ── Action Result Toast ── -->
      <div *ngIf="rideActionResult" class="action-toast"
        [class.toast-accept]="rideActionResult.type === 'accept'"
        [class.toast-decline]="rideActionResult.type === 'decline'">
        <span *ngIf="rideActionResult.type === 'accept'">✅ Ride {{ rideActionResult.rideId }} <strong>Accepted!</strong> Head to pickup now.</span>
        <span *ngIf="rideActionResult.type === 'decline'">❌ Ride {{ rideActionResult.rideId }} <strong>Declined.</strong> Customer will be re-assigned.</span>
      </div>

      <!-- ── Ride Accept/Decline Modal ── -->
      <div class="ride-modal-overlay" *ngIf="activeRideModal" (click)="closeRideModal()">
        <div class="ride-modal-card" (click)="$event.stopPropagation()">
          <div class="ride-modal-header">
            <span class="ride-modal-icon">🚗</span>
            <h4>New Ride Request!</h4>
          </div>
          <div class="ride-modal-body">
            <div class="ride-modal-row"><span class="label">Ride ID</span><span class="value">{{ activeRideModal.id }}</span></div>
            <div class="ride-modal-row"><span class="label">📍 Pickup</span><span class="value">{{ activeRideModal.pickup.address }}</span></div>
            <div class="ride-modal-row"><span class="label">🏁 Drop</span><span class="value">{{ activeRideModal.drop.address }}</span></div>
            <div class="ride-modal-row"><span class="label">👤 Customer</span><span class="value">{{ activeRideModal.userName }}</span></div>
            <div class="ride-modal-row" *ngIf="activeRideModal.estimatedFare"><span class="label">💰 Est. Fare</span><span class="value fw-bold text-success">₹{{ activeRideModal.estimatedFare }}</span></div>
            <div class="ride-modal-row"><span class="label">🔑 OTP</span><span class="value fw-bold">{{ activeRideModal.otp }}</span></div>
          </div>
          <div class="ride-modal-actions">
            <button class="btn btn-danger btn-lg flex-fill" type="button" (click)="declineRide(activeRideModal!)">
              ❌ Decline
            </button>
            <button class="btn btn-success btn-lg flex-fill" type="button" (click)="acceptRide(activeRideModal!)">
              ✅ Accept
            </button>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-4">
          <div class="card p-3 h-100">
            <div class="text-center">
              <img class="dp-image mb-3" [src]="dpPreview || defaultDp" alt="Captain DP" />
              <h5 class="mb-0">{{ c.displayName }}</h5>
              <div class="text-muted small">{{ c.username }} • {{ c.captainVehicle || 'captain' }}</div>
              <div class="mt-2">
                <span class="verified-driver-badge" [ngClass]="kycBadgeClass(kycStatus)">
                  {{ kycStatus === 'verified' ? 'Verified Driver Badge' : 'KYC ' + kycStatusLabel(kycStatus) }}
                </span>
              </div>
            </div>

            <hr />

            <label class="form-label">Update DP (profile photo)</label>
            <input type="file" class="form-control form-control-sm mb-2" accept="image/*" (change)="onDpFileSelected($event)" />
            <button class="btn btn-sm btn-primary" type="button" (click)="saveDp()" [disabled]="!dpPreview || savingDp">Save DP</button>
          </div>

          <div class="card p-3 mt-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Captain KYC Verification</h5>
              <span class="badge" [ngClass]="kycBadgeClass(kycStatus)">{{ kycStatusLabel(kycStatus) }}</span>
            </div>
            <div class="small text-muted mb-2">Keep your KYC updated to show the Verified Driver Badge to riders.</div>
            <div class="small mb-2" *ngIf="kycReferenceId"><strong>Reference:</strong> {{ kycReferenceId }}</div>
            <div class="small mb-3" *ngIf="kycUpdatedAt"><strong>Last Updated:</strong> {{ kycUpdatedAt | date:'medium' }}</div>

            <label class="form-label small mb-1">Document Type</label>
            <select class="form-select form-select-sm mb-2" [(ngModel)]="kycDocumentType">
              <option value="Driving License">Driving License</option>
              <option value="Aadhaar">Aadhaar</option>
              <option value="PAN">PAN</option>
              <option value="Voter ID">Voter ID</option>
            </select>

            <label class="form-label small mb-1">Document Number</label>
            <input class="form-control form-control-sm mb-2" placeholder="Enter document number" [(ngModel)]="kycDocumentNumber" />
            <div class="small text-muted mb-3" *ngIf="kycDocumentNumber">Masked: {{ maskedDocumentNumber }}</div>

            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-primary" type="button" (click)="submitKyc()" [disabled]="!canSubmitKyc">Submit KYC</button>
              <button class="btn btn-sm btn-success" type="button" (click)="markKycVerified()" [disabled]="kycStatus !== 'pending'">Mark Verified</button>
              <button class="btn btn-sm btn-outline-danger" type="button" (click)="markKycRejected()" [disabled]="kycStatus !== 'pending'">Mark Rejected</button>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Captain Live Location</h5>
              <button class="btn btn-sm btn-outline-primary" type="button" (click)="refreshCaptainLocation()">Refresh Location</button>
            </div>
            <div class="small text-muted mb-2">Current: {{ captainLocationLabel }}</div>
            <div class="small text-danger mb-2" *ngIf="locationError">{{ locationError }}</div>
            <iframe
              [src]="captainMapUrl | safeResourceUrl"
              width="100%"
              height="220"
              frameborder="0"
              style="border: 1px solid #dee2e6; border-radius: 10px"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

          <div class="card p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="mb-0">
                🚗 Active Rides
                <span *ngIf="newRideAlert" class="badge text-bg-danger ms-2 blink-badge">🔔 NEW RIDE!</span>
              </h5>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-warning" type="button" (click)="testSound()" title="Test notification sound">🔊 Test Sound</button>
                <button class="btn btn-sm btn-outline-secondary" type="button" (click)="refreshActiveRides()">↻ Refresh</button>
              </div>
            </div>

            <div *ngIf="newRideAlert" class="alert alert-danger py-2 mb-2 d-flex align-items-center gap-2 blink-alert">
              <strong>🔔 New ride request received!</strong> Accept it below.
            </div>

            <div *ngIf="readyForPickupMessage" class="alert alert-success py-2 mb-2">
              {{ readyForPickupMessage }}
            </div>

            <div *ngIf="activeRides.length === 0" class="text-muted small">
              No active rides available now.
            </div>

            <div class="ride-card" [class.new-ride-card]="isNewRide(ride.id)" *ngFor="let ride of activeRides">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div class="fw-semibold">{{ ride.id }}</div>
                  <div class="small text-muted">📍 {{ ride.pickup.address }} → {{ ride.drop.address }}</div>
                  <div class="small text-muted">👤 {{ ride.userName }} &nbsp;|&nbsp; 🔑 OTP: <strong>{{ ride.otp }}</strong></div>
                  <div class="small text-muted" *ngIf="ride.estimatedFare">💰 Est. Fare: ₹{{ ride.estimatedFare }}</div>
                </div>
                <span class="badge" [ngClass]="statusBadge(ride.status)">{{ ride.status }}</span>
              </div>

              <div class="d-flex gap-2 mt-2 flex-wrap">
                <button class="btn btn-sm btn-success" type="button"
                  *ngIf="ride.status === 'created'"
                  (click)="openRideModal(ride)">🔔 Accept / Decline</button>
                <button class="btn btn-sm btn-primary" type="button" (click)="openRideTracking(ride)">📍 Open Tracking</button>
              </div>
            </div>
          </div>

          <div class="card p-3 mb-3" id="deliveries-section">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="mb-0">Jobs and Deliveries</h5>
              <span class="badge text-bg-dark">{{ completedRides.length }}</span>
            </div>

            <div *ngIf="completedRides.length === 0" class="text-muted small">
              No completed or cancelled rides yet.
            </div>

            <div
              class="delivery-card"
              [class.highlight]="highlightedDeliveryBookingId === ride.id"
              *ngFor="let ride of completedRides"
            >
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div class="fw-semibold">{{ ride.id }}</div>
                  <div class="small text-muted">{{ ride.pickup.address }} → {{ ride.drop.address }}</div>
                  <div class="small text-muted">Status: {{ ride.status }}</div>
                </div>
                <div class="text-end">
                  <span class="badge" [ngClass]="ride.paymentDone ? 'text-bg-success' : 'text-bg-secondary'">
                    {{ ride.paymentDone ? 'Paid' : 'Pending Payment' }}
                  </span>
                  <div class="small mt-1" *ngIf="ride.finalAmount">₹{{ ride.finalAmount | number: '1.0-0' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card p-3 mb-3">
            <h5 class="mb-3">Captain Performance</h5>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="label">Average Captain Rating</div>
                <div class="value">{{ avgCaptainRating }}</div>
              </div>
              <div class="stat-card">
                <div class="label">Average Ride Rating</div>
                <div class="value">{{ avgRideRating }}</div>
              </div>
              <div class="stat-card">
                <div class="label">Hearts Received</div>
                <div class="value">{{ totalHearts }}</div>
              </div>
              <div class="stat-card">
                <div class="label">Feedback Count</div>
                <div class="value">{{ feedbackCount }}</div>
              </div>
            </div>
          </div>

          <div class="card p-3">
            <h5 class="mb-3">Recent Customer Comments</h5>
            <div *ngIf="recentComments.length === 0" class="text-muted">No customer comments yet.</div>
            <div *ngFor="let item of recentComments" class="comment-card">
              <div class="fw-semibold">{{ item.userName }} • {{ item.bookingId }}</div>
              <div class="small text-muted mb-1">
                Ride {{ item.rideRating || '-' }}/5 • Captain {{ item.captainRating || '-' }}/5
                <span *ngIf="item.lovedCaptain"> • Captain ❤️</span>
                <span *ngIf="item.lovedRide"> • Ride ❤️</span>
              </div>
              <div>{{ item.feedbackText || 'No written comment.' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dp-image {
        width: 128px;
        height: 128px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid #dee2e6;
        background: #f8f9fa;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
      }

      .stat-card {
        border: 1px solid #dee2e6;
        border-radius: 10px;
        padding: 10px;
      }

      .stat-card .label {
        font-size: 12px;
        color: #6c757d;
      }

      .stat-card .value {
        font-size: 22px;
        font-weight: 700;
      }

      .comment-card {
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 8px;
      }

      .ride-card {
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 8px;
        background: #fff;
      }

      .ride-card.new-ride-card {
        border-color: #dc3545;
        background: #fff5f5;
        box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
      }

      .blink-badge {
        animation: blink 1s step-start infinite;
      }

      .blink-alert {
        animation: pulse-alert 1.5s ease-in-out infinite;
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      @keyframes pulse-alert {
        0%, 100% { background-color: #f8d7da; border-color: #f1aeb5; }
        50% { background-color: #dc3545; border-color: #b02a37; color: #fff; }
      }

      /* Action Result Toast */
      .action-toast {
        position: fixed;
        top: 72px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        padding: 16px 32px;
        border-radius: 14px;
        font-size: 18px;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        animation: slideDown 0.3s ease;
        min-width: 320px;
        text-align: center;
      }
      .toast-accept { background: #d1fae5; color: #065f46; border: 2px solid #34d399; }
      .toast-decline { background: #fee2e2; color: #7f1d1d; border: 2px solid #f87171; }

      @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }

      /* Ride Modal */
      .ride-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

      .ride-modal-card {
        background: #fff;
        border-radius: 20px;
        width: 90%;
        max-width: 440px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.35);
        overflow: hidden;
        animation: popIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
      }

      @keyframes popIn {
        from { transform: scale(0.85); opacity: 0; }
        to   { transform: scale(1);    opacity: 1; }
      }

      .ride-modal-header {
        background: linear-gradient(135deg, #1d3557, #457b9d);
        color: #fff;
        padding: 20px 24px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ride-modal-icon { font-size: 36px; }

      .ride-modal-header h4 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        animation: blink 1s step-start infinite;
      }

      .ride-modal-body {
        padding: 18px 24px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .ride-modal-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 8px;
        font-size: 14px;
      }

      .ride-modal-row .label { color: #6c757d; min-width: 90px; }
      .ride-modal-row .value { text-align: right; font-weight: 500; }

      .ride-modal-actions {
        display: flex;
        gap: 0;
        border-top: 1px solid #e9ecef;
      }

      .ride-modal-actions .btn {
        border-radius: 0;
        padding: 16px;
        font-size: 17px;
        font-weight: 700;
        flex: 1;
      }

      .ride-modal-actions .btn:first-child { border-bottom-left-radius: 20px; }
      .ride-modal-actions .btn:last-child  { border-bottom-right-radius: 20px; }

      .delivery-card {
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 8px;
        background: #fff;
      }

      .delivery-card.highlight {
        border-color: #0d6efd;
        box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.15);
      }

      .verified-driver-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border: 1px solid transparent;
      }

      .verified-driver-badge.kyc-verified {
        background: #dcfce7;
        color: #166534;
        border-color: #86efac;
      }

      .verified-driver-badge.kyc-pending {
        background: #fef3c7;
        color: #92400e;
        border-color: #fcd34d;
      }

      .verified-driver-badge.kyc-rejected,
      .verified-driver-badge.kyc-not-started {
        background: #fee2e2;
        color: #991b1b;
        border-color: #fecaca;
      }
    `
  ]
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
  private notificationPermissionAsked = false;
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
    private route: ActivatedRoute
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
      this.notifyForIncomingRides();
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
    this.playIncomingRideSound();
    this.notifications.push('🔊 Sound test played!', 'info');
  }

  openRideModal(ride: Booking): void {
    this.activeRideModal = ride;
  }

  closeRideModal(): void {
    this.activeRideModal = null;
  }

  acceptRide(ride: Booking): void {
    const result = this.bookingService.approveByCaptain(ride.id);
    this.activeRideModal = null;
    if (result.success) {
      this.newRideIds.delete(ride.id);
      if (this.newRideIds.size === 0) this.newRideAlert = false;
      this.rideActionResult = { type: 'accept', rideId: ride.id };
      this.notifications.push(`✅ Ride ${ride.id} accepted! Head to pickup: ${ride.pickup.address}`, 'success');
      setTimeout(() => { this.rideActionResult = null; }, 5000);
    } else {
      this.notifications.push(result.message, 'warning');
    }
  }

  declineRide(ride: Booking): void {
    const result = this.bookingService.cancelRide(ride.id, 'captain');
    this.activeRideModal = null;
    if (result.success) {
      this.newRideIds.delete(ride.id);
      if (this.newRideIds.size === 0) this.newRideAlert = false;
      this.rideActionResult = { type: 'decline', rideId: ride.id };
      this.notifications.push(`❌ Ride ${ride.id} declined. Customer will be notified.`, 'warning');
      setTimeout(() => { this.rideActionResult = null; }, 5000);
    } else {
      this.notifications.push(result.message, 'warning');
    }
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

  private notifyForIncomingRides(): void {
    for (const ride of this.activeRides) {
      if (this.notifiedRideIds.has(ride.id)) {
        continue;
      }

      this.notifiedRideIds.add(ride.id);
      this.newRideIds.add(ride.id);
      const message = `🔔 New ride ${ride.id}: ${ride.pickup.address} → ${ride.drop.address}`;
      this.notifications.push(message, 'info');
      this.playIncomingRideSound();

      // Auto-open the modal for the first new ride
      if (!this.activeRideModal) {
        this.activeRideModal = ride;
      }

      // Show flashing alert banner
      this.newRideAlert = true;
      if (this.newRideAlertTimer) clearTimeout(this.newRideAlertTimer);
      this.newRideAlertTimer = setTimeout(() => {
        this.newRideAlert = false;
        this.newRideIds.clear();
      }, 30000);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('🚗 New Ride Assigned!', {
          body: message,
          tag: `ride-${ride.id}`
        });
      }
    }

    this.notifyForPaymentUpdates();
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

  private playIncomingRideSound(): void {
    const AudioCtx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) {
      return;
    }

    const context = new AudioCtx();

    // Three-beep alert tune: rising tones at full volume
    const notes = [
      { freq: 880,  startAt: 0.00, dur: 0.18 },
      { freq: 1046, startAt: 0.22, dur: 0.18 },
      { freq: 1318, startAt: 0.44, dur: 0.30 },
    ];

    notes.forEach(({ freq, startAt, dur }) => {
      const osc  = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'square';              // square wave = louder & punchy
      osc.frequency.value = freq;

      // Ramp up fast then fade — peak at 0.9 (near max)
      gain.gain.setValueAtTime(0.0001, context.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.9, context.currentTime + startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + startAt + dur);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(context.currentTime + startAt);
      osc.stop(context.currentTime + startAt + dur + 0.02);
    });

    setTimeout(() => context.close().catch(() => void 0), 1200);
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
