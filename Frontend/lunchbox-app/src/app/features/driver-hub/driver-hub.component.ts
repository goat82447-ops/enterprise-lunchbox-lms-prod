import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Booking } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';

type DocKey = 'license' | 'aadhaar' | 'pan' | 'rc' | 'insurance' | 'pollution';

type DocStatus = 'missing' | 'uploaded';

interface DriverDocument {
  key: DocKey;
  title: string;
  status: DocStatus;
  fileName?: string;
}

interface DriverAuthState {
  registered: boolean;
  otpSent: boolean;
  otpVerified: boolean;
  docsVerified: boolean;
  kycDone: boolean;
  faceMatch: boolean;
}

interface DriverSafetyState {
  emergencyContact: string;
  rideRecording: boolean;
  liveLocationShare: boolean;
  sosActive: boolean;
}

@Component({
  selector: 'app-driver-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="driver-hub-page">
      <div class="driver-bg"></div>

      <header class="hero">
        <div>
          <p class="kicker">Driver Control Center</p>
          <h1>{{ driverName }}</h1>
          <p class="muted">Manage onboarding, rides, earnings, ratings and safety in one place.</p>
        </div>
        <button class="status-btn" [class.offline]="!online" (click)="toggleOnline()">
          {{ online ? 'Online' : 'Offline' }}
        </button>
      </header>

      <main class="grid">
        <section class="card">
          <h2>Driver Authentication</h2>
          <p class="muted">Registration, OTP, KYC and face verification state.</p>

          <div class="auth-row">
            <input [(ngModel)]="otpPhone" placeholder="Driver mobile number" />
            <button class="btn" (click)="sendOtp()">Send OTP</button>
          </div>
          <div class="auth-row">
            <input [(ngModel)]="enteredOtp" placeholder="Enter OTP" />
            <button class="btn btn-secondary" (click)="verifyOtp()">Verify OTP</button>
          </div>
          <p class="hint" *ngIf="devOtp">Demo OTP: {{ devOtp }}</p>

          <div class="chip-wrap">
            <span class="chip" [class.ok]="authState.registered">Driver Registered</span>
            <span class="chip" [class.ok]="authState.otpSent">OTP Sent</span>
            <span class="chip" [class.ok]="authState.otpVerified">OTP Verified</span>
            <span class="chip" [class.ok]="authState.docsVerified">Docs Verified</span>
            <span class="chip" [class.ok]="authState.kycDone">KYC Complete</span>
            <span class="chip" [class.ok]="authState.faceMatch">Face Match</span>
          </div>

          <div class="auth-actions">
            <button class="btn btn-secondary" (click)="markRegistered()">Mark Registered</button>
            <button class="btn btn-secondary" (click)="markDocsVerified()">Mark Docs Verified</button>
            <button class="btn btn-secondary" (click)="markKycDone()">Mark KYC Done</button>
            <button class="btn btn-secondary" (click)="markFaceMatched()">Mark Face Matched</button>
          </div>
        </section>

        <section class="card">
          <h2>Document Uploads</h2>
          <p class="muted">Upload required driver and vehicle documents.</p>

          <div class="doc-list">
            <div class="doc-item" *ngFor="let d of documents">
              <div>
                <strong>{{ d.title }}</strong>
                <p class="muted small">{{ d.fileName || 'No file uploaded' }}</p>
              </div>
              <div class="doc-actions">
                <span class="badge" [class.badge-ok]="d.status === 'uploaded'">
                  {{ d.status === 'uploaded' ? 'Uploaded' : 'Missing' }}
                </span>
                <input type="file" (change)="onDocSelected(d.key, $event)" />
              </div>
            </div>
          </div>
        </section>

        <section class="card span-2">
          <h2>Ride Requests and Ride Management</h2>
          <p class="muted">Accept or reject rides, then start and end active rides with status tracking.</p>

          <div class="split">
            <div>
              <h3>Incoming Requests</h3>
              <div class="ride-list">
                <article class="ride" *ngFor="let b of pendingBookings">
                  <div>
                    <strong>{{ b.pickup.address }} → {{ b.drop.address }}</strong>
                    <p class="muted small">
                      Fare: {{ b.estimatedFare | currency:'INR' }} | Customer: {{ b.userName || 'Customer' }}
                    </p>
                  </div>
                  <div class="ride-actions">
                    <button class="btn" (click)="acceptRide(b)">Accept</button>
                    <button class="btn btn-danger" (click)="rejectRide(b)">Reject</button>
                  </div>
                </article>
                <p *ngIf="!pendingBookings.length" class="muted">No pending ride requests.</p>
              </div>
            </div>

            <div>
              <h3>Active Rides</h3>
              <div class="ride-list">
                <article class="ride" *ngFor="let b of activeBookings">
                  <div>
                    <strong>{{ b.pickup.address }} → {{ b.drop.address }}</strong>
                    <p class="muted small">
                      Rider: {{ b.userName || 'Customer' }} | OTP: {{ b.otp || 'N/A' }}
                    </p>
                  </div>
                  <div class="ride-actions">
                    <button class="btn btn-secondary" (click)="startRide(b)">Start Ride</button>
                    <button class="btn" (click)="endRide(b)">End Ride</button>
                    <button class="btn btn-secondary" (click)="openNavigation(b)">Navigate</button>
                    <button class="btn btn-secondary" (click)="optimizeRoute(b)">Optimize Route</button>
                  </div>
                </article>
                <p *ngIf="!activeBookings.length" class="muted">No active rides right now.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Earnings Dashboard</h2>
          <p class="muted">Track earnings, bonuses, wallet and withdrawals.</p>

          <div class="stats">
            <div>
              <p class="label">Today</p>
              <strong>{{ earnings.daily | currency:'INR' }}</strong>
            </div>
            <div>
              <p class="label">This Week</p>
              <strong>{{ earnings.weekly | currency:'INR' }}</strong>
            </div>
            <div>
              <p class="label">This Month</p>
              <strong>{{ earnings.monthly | currency:'INR' }}</strong>
            </div>
            <div>
              <p class="label">Incentives + Bonus</p>
              <strong>{{ earnings.incentives + earnings.bonus | currency:'INR' }}</strong>
            </div>
          </div>

          <div class="wallet">
            <p>Wallet Balance: <strong>{{ earnings.wallet | currency:'INR' }}</strong></p>
            <div class="auth-row">
              <input type="number" [(ngModel)]="withdrawAmount" min="1" placeholder="Withdraw amount" />
              <button class="btn" (click)="withdraw()">Withdraw</button>
            </div>
            <button class="btn btn-secondary" (click)="downloadEarningsReport()">Download Report</button>
          </div>
        </section>

        <section class="card">
          <h2>Ratings and Reviews</h2>
          <p class="muted">Customer feedback and performance score from completed rides.</p>

          <div class="stats">
            <div>
              <p class="label">Average Rating</p>
              <strong>{{ ratings.average | number:'1.1-2' }} / 5</strong>
            </div>
            <div>
              <p class="label">Total Reviews</p>
              <strong>{{ ratings.totalReviews }}</strong>
            </div>
            <div>
              <p class="label">Performance Score</p>
              <strong>{{ ratings.performanceScore }}%</strong>
            </div>
          </div>

          <ul class="review-list">
            <li *ngFor="let r of ratings.latestReviews">{{ r }}</li>
          </ul>
        </section>

        <section class="card span-2">
          <h2>Safety Toolkit</h2>
          <p class="muted">SOS, emergency contact, passenger reporting and recording controls.</p>

          <div class="split">
            <div>
              <label>Emergency Contact</label>
              <input [(ngModel)]="safetyState.emergencyContact" placeholder="Emergency phone" />

              <div class="toggle">
                <input id="recording" type="checkbox" [(ngModel)]="safetyState.rideRecording" (change)="persistSafety()" />
                <label for="recording">Enable Ride Recording</label>
              </div>
              <div class="toggle">
                <input id="location" type="checkbox" [(ngModel)]="safetyState.liveLocationShare" (change)="persistSafety()" />
                <label for="location">Share Live Location</label>
              </div>
            </div>

            <div class="safety-actions">
              <button class="btn btn-danger" (click)="triggerSos()">Trigger SOS</button>
              <button class="btn btn-secondary" (click)="callEmergency()">Call Emergency Contact</button>
              <button class="btn btn-secondary" (click)="reportPassenger()">Report Passenger</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #0f172a;
      }

      .driver-hub-page {
        position: relative;
        min-height: 100vh;
        padding: 1.25rem;
        background: linear-gradient(160deg, #eef6ff 0%, #f8fbff 40%, #f3fff7 100%);
      }

      .driver-bg {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 10% 10%, rgba(37, 99, 235, 0.12), transparent 30%),
          radial-gradient(circle at 85% 15%, rgba(22, 163, 74, 0.12), transparent 35%);
        pointer-events: none;
      }

      .hero,
      .grid {
        position: relative;
        z-index: 1;
      }

      .hero {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .kicker {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #1d4ed8;
        font-size: 0.8rem;
      }

      h1,
      h2,
      h3 {
        margin: 0.35rem 0;
      }

      .muted {
        color: #475569;
      }

      .small {
        font-size: 0.85rem;
      }

      .status-btn {
        border: 0;
        border-radius: 999px;
        padding: 0.6rem 1rem;
        background: #16a34a;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .status-btn.offline {
        background: #64748b;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .card {
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 14px;
        padding: 1rem;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
      }

      .span-2 {
        grid-column: span 2;
      }

      .auth-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      input {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0.55rem 0.65rem;
      }

      .btn {
        border: 0;
        border-radius: 8px;
        padding: 0.55rem 0.8rem;
        cursor: pointer;
        background: #0ea5e9;
        color: #fff;
        font-weight: 600;
      }

      .btn-secondary {
        background: #475569;
      }

      .btn-danger {
        background: #dc2626;
      }

      .chip-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 0.4rem;
      }

      .chip {
        border-radius: 999px;
        padding: 0.35rem 0.65rem;
        font-size: 0.75rem;
        border: 1px solid #94a3b8;
        background: #f8fafc;
      }

      .chip.ok {
        background: #dcfce7;
        border-color: #4ade80;
        color: #166534;
      }

      .auth-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 0.6rem;
      }

      .doc-list,
      .ride-list {
        display: grid;
        gap: 0.65rem;
      }

      .doc-item,
      .ride {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.7rem;
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        align-items: center;
      }

      .doc-actions,
      .ride-actions {
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
        align-items: center;
      }

      .badge {
        padding: 0.25rem 0.55rem;
        border-radius: 999px;
        background: #fee2e2;
        color: #991b1b;
        font-size: 0.75rem;
      }

      .badge-ok {
        background: #dcfce7;
        color: #166534;
      }

      .split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.6rem;
        margin: 0.75rem 0;
      }

      .label {
        margin: 0;
        color: #64748b;
        font-size: 0.78rem;
      }

      .wallet {
        display: grid;
        gap: 0.6rem;
      }

      .review-list {
        margin: 0.5rem 0 0;
        padding-left: 1rem;
      }

      .toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0.45rem 0;
      }

      .toggle input {
        width: auto;
      }

      .hint {
        margin: 0;
        font-size: 0.8rem;
        color: #0f766e;
      }

      .safety-actions {
        display: grid;
        gap: 0.5rem;
        align-content: start;
      }

      @media (max-width: 900px) {
        .grid,
        .split,
        .stats {
          grid-template-columns: 1fr;
        }

        .span-2 {
          grid-column: span 1;
        }

        .hero {
          flex-direction: column;
          align-items: flex-start;
        }

        .auth-row {
          flex-direction: column;
        }
      }
    `
  ]
})
export class DriverHubComponent implements OnInit {
  private readonly docsKey = 'driver_hub_documents_v1';
  private readonly authKey = 'driver_hub_auth_v1';
  private readonly safetyKey = 'driver_hub_safety_v1';

  online = true;
  driverName = 'Driver';

  otpPhone = '';
  enteredOtp = '';
  devOtp = '';

  authState: DriverAuthState = {
    registered: false,
    otpSent: false,
    otpVerified: false,
    docsVerified: false,
    kycDone: false,
    faceMatch: false
  };

  documents: DriverDocument[] = [
    { key: 'license', title: 'Driving License', status: 'missing' },
    { key: 'aadhaar', title: 'Aadhaar Card', status: 'missing' },
    { key: 'pan', title: 'PAN Card', status: 'missing' },
    { key: 'rc', title: 'Vehicle RC', status: 'missing' },
    { key: 'insurance', title: 'Insurance Documents', status: 'missing' },
    { key: 'pollution', title: 'Pollution Certificate', status: 'missing' }
  ];

  pendingBookings: Booking[] = [];
  activeBookings: Booking[] = [];

  earnings = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    incentives: 0,
    bonus: 0,
    wallet: 0
  };

  withdrawAmount = 0;

  ratings = {
    average: 4.8,
    totalReviews: 0,
    performanceScore: 94,
    latestReviews: [
      'Great driving and on-time pickup.',
      'Polite and safe ride experience.',
      'Quick route and smooth drop.'
    ] as string[]
  };

  safetyState: DriverSafetyState = {
    emergencyContact: '',
    rideRecording: false,
    liveLocationShare: true,
    sosActive: false
  };

  constructor(
    private readonly authService: AuthService,
    private readonly bookingService: BookingService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.driverName = currentUser?.displayName || 'Driver';

    this.loadAuthState();
    this.loadDocsState();
    this.loadSafetyState();
    this.refreshBookings();
    this.calculateEarningsAndRatings();
  }

  toggleOnline(): void {
    this.online = !this.online;
    this.notificationService.push(
      this.online ? 'You are online and ready for rides.' : 'You are offline now.'
      , 'info'
    );
  }

  sendOtp(): void {
    if (!this.otpPhone.trim()) {
      this.notificationService.push('Enter a mobile number to send OTP.', 'error');
      return;
    }

    this.devOtp = String(Math.floor(100000 + Math.random() * 900000));
    this.authState.otpSent = true;
    this.saveAuthState();
    this.notificationService.push('OTP sent successfully.', 'success');
  }

  verifyOtp(): void {
    if (!this.authState.otpSent) {
      this.notificationService.push('Send OTP first.', 'error');
      return;
    }

    if (this.enteredOtp.trim() !== this.devOtp) {
      this.notificationService.push('Invalid OTP.', 'error');
      return;
    }

    this.authState.otpVerified = true;
    this.saveAuthState();
    this.notificationService.push('OTP verified.', 'success');
  }

  markRegistered(): void {
    this.authState.registered = true;
    this.saveAuthState();
    this.notificationService.push('Driver registration marked complete.', 'success');
  }

  markDocsVerified(): void {
    this.authState.docsVerified = true;
    this.saveAuthState();
    this.notificationService.push('Document verification marked complete.', 'success');
  }

  markKycDone(): void {
    this.authState.kycDone = true;
    this.saveAuthState();
    this.notificationService.push('KYC marked complete.', 'success');
  }

  markFaceMatched(): void {
    this.authState.faceMatch = true;
    this.saveAuthState();
    this.notificationService.push('Face match marked complete.', 'success');
  }

  onDocSelected(key: DocKey, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.documents = this.documents.map((d) =>
      d.key === key ? { ...d, status: 'uploaded', fileName: file.name } : d
    );
    this.saveDocsState();
    this.notificationService.push('Document uploaded locally.', 'success');
  }

  acceptRide(booking: Booking): void {
    this.bookingService.updateRideStatus(booking.id, 'assigned', 'Driver accepted ride request');
    this.refreshBookings();
    this.notificationService.push('Ride accepted.', 'success');
  }

  rejectRide(booking: Booking): void {
    this.bookingService.updateRideStatus(booking.id, 'cancelled', 'Driver rejected ride request');
    this.refreshBookings();
    this.notificationService.push('Ride rejected.', 'info');
  }

  startRide(booking: Booking): void {
    this.bookingService.updateRideStatus(booking.id, 'pickup_in_progress', 'Ride started');
    this.refreshBookings();
    this.notificationService.push('Ride started.', 'success');
  }

  endRide(booking: Booking): void {
    this.bookingService.updateRideStatus(booking.id, 'completed', 'Ride completed');
    this.refreshBookings();
    this.calculateEarningsAndRatings();
    this.notificationService.push('Ride ended successfully.', 'success');
  }

  openNavigation(booking: Booking): void {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.drop.address)}`;
    window.open(url, '_blank', 'noopener');
  }

  optimizeRoute(booking: Booking): void {
    this.notificationService.push(
      `Route optimization enabled for ${booking.pickup.address} to ${booking.drop.address}.`
      , 'info'
    );
  }

  withdraw(): void {
    const amount = Number(this.withdrawAmount);
    if (!amount || amount <= 0) {
      this.notificationService.push('Enter a valid withdrawal amount.', 'error');
      return;
    }

    if (amount > this.earnings.wallet) {
      this.notificationService.push('Insufficient wallet balance.', 'error');
      return;
    }

    this.earnings.wallet -= amount;
    this.withdrawAmount = 0;
    this.notificationService.push('Withdrawal requested successfully.', 'success');
  }

  downloadEarningsReport(): void {
    const payload = {
      generatedAt: new Date().toISOString(),
      driver: this.driverName,
      earnings: this.earnings,
      completedRides: this.completedRides.length
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-earnings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.notificationService.push('Earnings report downloaded.', 'success');
  }

  triggerSos(): void {
    this.safetyState.sosActive = true;
    this.persistSafety();
    this.notificationService.push('SOS triggered. Local emergency flow activated.', 'error');
  }

  callEmergency(): void {
    if (!this.safetyState.emergencyContact.trim()) {
      this.notificationService.push('Add emergency contact first.', 'error');
      return;
    }

    this.persistSafety();
    this.notificationService.push(
      `Calling emergency contact ${this.safetyState.emergencyContact} (simulated).`
      , 'info'
    );
  }

  reportPassenger(): void {
    this.notificationService.push('Passenger report submitted for review.', 'info');
  }

  persistSafety(): void {
    localStorage.setItem(this.safetyKey, JSON.stringify(this.safetyState));
  }

  private refreshBookings(): void {
    const all = this.bookingService.getAllBookingsSnapshot() || [];
    this.pendingBookings = all.filter((b) => b.status === 'created');
    this.activeBookings = all.filter((b) => ['assigned', 'pickup_in_progress', 'in_transit', 'arriving'].includes(b.status));
  }

  private get completedRides(): Booking[] {
    const all = this.bookingService.getAllBookingsSnapshot() || [];
    return all.filter((b) => b.status === 'completed' || b.status === 'delivered');
  }

  private calculateEarningsAndRatings(): void {
    const done = this.completedRides;
    const total = done.reduce((sum, b) => sum + Number(b.estimatedFare || 0), 0);

    this.earnings.daily = Math.round(total * 0.25);
    this.earnings.weekly = Math.round(total * 0.65);
    this.earnings.monthly = Math.round(total);
    this.earnings.incentives = Math.round(done.length * 35);
    this.earnings.bonus = done.length >= 10 ? 500 : done.length >= 5 ? 200 : 0;
    this.earnings.wallet = this.earnings.monthly + this.earnings.incentives + this.earnings.bonus;

    this.ratings.totalReviews = done.length;
    this.ratings.average = done.length ? 4.6 + Math.min(done.length, 10) * 0.03 : 4.8;
    this.ratings.performanceScore = Math.min(100, 88 + done.length);
  }

  private loadAuthState(): void {
    const raw = localStorage.getItem(this.authKey);
    if (!raw) {
      return;
    }

    try {
      this.authState = { ...this.authState, ...JSON.parse(raw) };
    } catch {
      // Keep defaults if state is malformed.
    }
  }

  private saveAuthState(): void {
    localStorage.setItem(this.authKey, JSON.stringify(this.authState));
  }

  private loadDocsState(): void {
    const raw = localStorage.getItem(this.docsKey);
    if (!raw) {
      return;
    }

    try {
      const stored = JSON.parse(raw) as Partial<Record<DocKey, { status: DocStatus; fileName?: string }>>;
      this.documents = this.documents.map((d) => {
        const existing = stored[d.key];
        return existing ? { ...d, ...existing } : d;
      });
    } catch {
      // Keep defaults if state is malformed.
    }
  }

  private saveDocsState(): void {
    const compact: Partial<Record<DocKey, { status: DocStatus; fileName?: string }>> = {};
    this.documents.forEach((d) => {
      compact[d.key] = { status: d.status, fileName: d.fileName };
    });
    localStorage.setItem(this.docsKey, JSON.stringify(compact));
  }

  private loadSafetyState(): void {
    const raw = localStorage.getItem(this.safetyKey);
    if (!raw) {
      return;
    }

    try {
      this.safetyState = { ...this.safetyState, ...JSON.parse(raw) };
    } catch {
      // Keep defaults if state is malformed.
    }
  }
}
