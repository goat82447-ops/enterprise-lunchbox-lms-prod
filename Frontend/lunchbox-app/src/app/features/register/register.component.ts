import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { RegisterResponse, UserRole, VehicleType } from '../../core/models/delivery.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="register-page">
      <div class="register-noise"></div>
      <div class="container py-4 py-md-5" style="max-width: 780px; position: relative; z-index: 1;">
      <div class="card p-4 p-md-5 auth-shell">
        <div class="brand-strip mb-3">
          <img [src]="registerLogoSrc" (error)="onRegisterLogoError($event)" alt="RouteX logo" class="brand-logo" />
          <div>
            <div class="register-kicker">RouteX Onboarding</div>
            <h2 class="mb-1">Create Account</h2>
            <p class="text-muted mb-0">Choose mode and register. Drivers must select vehicle type.</p>
          </div>
        </div>

        <p class="text-muted">Use your details to complete a secure signup.</p>

        <div class="mb-4">
          <label class="form-label">Register Mode</label>
          <div class="mode-grid">
            <button class="btn" [class.mode-active]="role === 'rider'" (click)="setRole('rider')" type="button">Customer/Rider</button>
            <button class="btn" [class.mode-active]="role === 'driver'" (click)="setRole('driver')" type="button">Driver</button>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Display Name</label>
            <input class="form-control" [(ngModel)]="displayName" />
          </div>

          <div class="col-md-6">
            <label class="form-label">Username</label>
            <input class="form-control" [(ngModel)]="username" />
          </div>

          <div class="col-md-6">
            <label class="form-label">Email</label>
            <input class="form-control" [(ngModel)]="email" />
          </div>

          <div class="col-md-6">
            <label class="form-label">Mobile</label>
            <input class="form-control" [(ngModel)]="mobile" placeholder="+919999000010" />
          </div>

          <div class="col-12">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" [(ngModel)]="password" />
          </div>

          <div class="col-12" *ngIf="role === 'driver' || role === 'captain'">
            <label class="form-label">Driver Vehicle</label>
            <select class="form-select" [(ngModel)]="captainVehicle">
              <option value="bike">Bike</option>
              <option value="auto">Auto</option>
              <option value="scooter">Scooter</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
            </select>
          </div>
        </div>

        <div class="d-flex gap-2 mt-4">
          <button class="btn btn-danger" [disabled]="loading" (click)="register()" *ngIf="step === 1">Register</button>
          <button class="btn btn-danger" [disabled]="loading" (click)="verifyRegistrationOtp()" *ngIf="step === 2">Verify Registration OTP</button>
          <a routerLink="/login" class="btn btn-outline-secondary">Back to Login</a>
        </div>

        <div class="alert alert-info mt-3" *ngIf="step === 2">
          OTP sent to {{ otpChannels.email }}<span *ngIf="otpChannels.mobile"> and {{ otpChannels.mobile }}</span>.
          <div *ngIf="devOtpHint" class="mt-2"><strong>Dev OTP Hint:</strong> {{ devOtpHint }}</div>
        </div>

        <div class="row g-3 mt-1" *ngIf="step === 2">
          <div class="col-md-6">
            <label class="form-label">Email OTP</label>
            <input class="form-control" [(ngModel)]="emailOtp" />
          </div>
          <div class="col-md-6" *ngIf="otpChannels.mobile">
            <label class="form-label">Mobile OTP</label>
            <input class="form-control" [(ngModel)]="mobileOtp" />
          </div>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
      </div>
    </div>
    </section>
  `,
  styles: [
    `
      .register-page {
        position: relative;
        min-height: calc(100vh - 56px);
        padding: 8px 0 24px;
        background:
          radial-gradient(circle at 14% 12%, rgba(234, 56, 76, 0.2), transparent 36%),
          radial-gradient(circle at 86% 14%, rgba(56, 189, 248, 0.14), transparent 34%),
          linear-gradient(140deg, #0a0f19 0%, #121a2a 52%, #0a1410 100%);
      }

      .register-noise {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: radial-gradient(rgba(255, 255, 255, 0.06) 0.6px, transparent 0.6px);
        background-size: 3px 3px;
        opacity: 0.06;
      }

      .auth-shell {
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: linear-gradient(165deg, rgba(8, 12, 22, 0.95) 0%, rgba(16, 23, 36, 0.9) 100%);
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.42);
        color: #eef3fb;
      }

      .register-kicker {
        display: inline-block;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 999px;
        padding: 3px 10px;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #dbeafe;
      }

      .mode-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .brand-strip {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 16px;
        align-items: center;
      }

      .brand-logo {
        width: 100%;
        max-width: 120px;
        height: 120px;
        object-fit: contain;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.06);
        padding: 8px;
      }

      .mode-grid .btn {
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.07);
        color: #dbe5f5;
        font-weight: 600;
      }

      .mode-grid .mode-active {
        border-color: rgba(234, 56, 76, 0.74);
        background: linear-gradient(130deg, #ea384c 0%, #f9734f 100%);
        color: #ffffff;
        font-weight: 600;
        box-shadow: 0 10px 20px rgba(234, 56, 76, 0.3);
      }

      .form-control,
      .form-select {
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(8, 13, 24, 0.82);
        color: #f6f9ff;
      }

      .form-control:focus,
      .form-select:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 0 0.2rem rgba(56, 189, 248, 0.2);
        background: #0b1321;
        color: #ffffff;
      }

      .btn.btn-danger {
        background: linear-gradient(130deg, #ea384c 0%, #f9734f 100%);
        border: none;
      }

      .btn.btn-outline-secondary {
        border-color: rgba(255, 255, 255, 0.36);
        color: #e5edf9;
      }

      @media (max-width: 768px) {
        .brand-strip {
          grid-template-columns: 1fr;
        }

        .brand-logo {
          max-width: 92px;
          height: 92px;
        }
      }
    `
  ]
})
export class RegisterComponent {
  registerLogoSrc = '/assets/lunchbox-logo.svg';
  loading = false;
  errorMessage = '';
  step = 1;

  displayName = '';
  username = '';
  email = '';
  mobile = '';
  password = '';
  role: Exclude<UserRole, 'user'> = 'rider';
  captainVehicle: VehicleType = 'bike';
  tempToken = '';
  emailOtp = '';
  mobileOtp = '';
  otpChannels: { email: string; mobile?: string } = { email: '' };
  devOtpHint = '';

  constructor(
    private auth: AuthService,
    private notifications: NotificationService,
    private router: Router
  ) {}

  setRole(role: Exclude<UserRole, 'user'>): void {
    this.role = role;
  }

  onRegisterLogoError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    if (this.registerLogoSrc !== '/assets/rider-dummy.svg') {
      this.registerLogoSrc = '/assets/rider-dummy.svg';
      return;
    }

    image.style.display = 'none';
  }

  register(): void {
    this.errorMessage = '';

    const payload = {
      username: this.username.trim().toLowerCase(),
      displayName: this.displayName.trim(),
      email: this.email.trim().toLowerCase(),
      mobile: this.mobile.trim(),
      password: this.password,
      role: this.role,
      captainVehicle: this.role === 'driver' || this.role === 'captain' ? this.captainVehicle : undefined
    };

    if (!payload.username || !payload.displayName || !payload.email || !payload.mobile || !payload.password) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    if ((this.role === 'driver' || this.role === 'captain') && !payload.captainVehicle) {
      this.errorMessage = 'Driver vehicle is required.';
      return;
    }

    this.loading = true;
    this.auth.register(payload).subscribe({
      next: (response: RegisterResponse) => {
        this.loading = false;
        this.notifications.push(response.message, 'success');

        if (response.requiresOtp && response.tempToken && response.channels) {
          this.step = 2;
          this.tempToken = response.tempToken;
          this.otpChannels = response.channels;
          this.devOtpHint = response.devOtps
            ? `Email OTP: ${response.devOtps.emailOtp}${response.devOtps.mobileOtp ? `, Mobile OTP: ${response.devOtps.mobileOtp}` : ''}`
            : '';
          return;
        }

        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.error || 'Registration failed.';
      }
    });
  }

  verifyRegistrationOtp(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auth.verifyOtp(this.tempToken, this.emailOtp, this.mobileOtp).subscribe({
      next: (response) => {
        this.auth.completeLogin(response);
        this.notifications.push('Registration completed and account activated.', 'success');
        this.loading = false;
        this.router.navigate(['/booking']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.error || 'Registration OTP verification failed.';
      }
    });
  }
}
