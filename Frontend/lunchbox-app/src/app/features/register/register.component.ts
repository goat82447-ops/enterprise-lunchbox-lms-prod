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
    <div class="container py-5" style="max-width: 720px;">
      <div class="card p-4 p-md-5 auth-shell">
        <div class="brand-strip mb-3">
          <img [src]="registerLogoSrc" (error)="onRegisterLogoError($event)" alt="LunchBox Delivery logo" class="brand-logo" />
          <div>
            <h2 class="mb-1">Create Account</h2>
            <p class="text-muted mb-0">Choose mode and register. Captains must select vehicle.</p>
          </div>
        </div>

        <p class="text-muted">Use your details to complete a secure signup.</p>

        <div class="mb-4">
          <label class="form-label">Register Mode</label>
          <div class="mode-grid">
            <button class="btn" [class.mode-active]="role === 'customer'" (click)="setRole('customer')" type="button">Customer</button>
            <button class="btn" [class.mode-active]="role === 'admin'" (click)="setRole('admin')" type="button">Admin</button>
            <button class="btn" [class.mode-active]="role === 'captain'" (click)="setRole('captain')" type="button">Captain</button>
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

          <div class="col-12" *ngIf="role === 'captain'">
            <label class="form-label">Captain Vehicle</label>
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
          OTP sent to {{ otpChannels.email }} and {{ otpChannels.mobile }}.
          <div *ngIf="devOtpHint" class="mt-2"><strong>Dev OTP Hint:</strong> {{ devOtpHint }}</div>
        </div>

        <div class="row g-3 mt-1" *ngIf="step === 2">
          <div class="col-md-6">
            <label class="form-label">Email OTP</label>
            <input class="form-control" [(ngModel)]="emailOtp" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Mobile OTP</label>
            <input class="form-control" [(ngModel)]="mobileOtp" />
          </div>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-shell {
        border: 1px solid var(--border-color);
      }

      .mode-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .brand-strip {
        display: grid;
        grid-template-columns: 170px 1fr;
        gap: 12px;
        align-items: center;
      }

      .brand-logo {
        width: 100%;
        max-width: 170px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: #fff;
      }

      .mode-grid .btn {
        border: 1px solid #adb5bd;
        background: #f8f9fa;
      }

      .mode-grid .mode-active {
        border-color: #dc3545;
        background: #fde7ea;
        color: #a4133c;
        font-weight: 600;
      }

      @media (max-width: 768px) {
        .brand-strip {
          grid-template-columns: 1fr;
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
  role: Exclude<UserRole, 'user'> = 'customer';
  captainVehicle: VehicleType = 'bike';
  tempToken = '';
  emailOtp = '';
  mobileOtp = '';
  otpChannels = { email: '', mobile: '' };
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
      captainVehicle: this.role === 'captain' ? this.captainVehicle : undefined
    };

    if (!payload.username || !payload.displayName || !payload.email || !payload.mobile || !payload.password) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    if (this.role === 'captain' && !payload.captainVehicle) {
      this.errorMessage = 'Captain vehicle is required.';
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
            ? `Email OTP: ${response.devOtps.emailOtp}, Mobile OTP: ${response.devOtps.mobileOtp}`
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
