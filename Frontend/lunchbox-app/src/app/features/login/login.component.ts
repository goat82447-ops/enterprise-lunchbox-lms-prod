import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { BiometricService } from '../../core/services/biometric.service';
import { LoginStartResponse, UserRole } from '../../core/models/delivery.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-5" style="max-width: 1040px;">
      <div class="row g-3 align-items-stretch">
        <div class="col-12 col-lg-7">
          <div class="card p-4 p-md-5 auth-shell h-100">
            <div class="brand-strip mb-3">
              <img [src]="loginLogoSrc" (error)="onLoginLogoError($event)" alt="LunchBox Delivery logo" class="brand-logo" />
              <div>
                <h2 class="mb-1">Lucnh box Delivary</h2>
                <p class="text-muted mb-0">Login directly with your account mode, username, and password.</p>
              </div>
            </div>
            <p class="mb-4">No account? <a routerLink="/register">Create one now</a>.</p>

            <div class="mb-4">
              <label class="form-label">Login Mode</label>
              <div class="mode-grid">
                <button class="btn" [class.mode-active]="role === 'customer'" (click)="setRole('customer')" type="button">Customer</button>
                <button class="btn" [class.mode-active]="role === 'admin'" (click)="setRole('admin')" type="button">Admin</button>
                <button class="btn" [class.mode-active]="role === 'captain'" (click)="setRole('captain')" type="button">Captain</button>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Username</label>
              <input class="form-control" [(ngModel)]="username" />
            </div>

            <div class="mb-3">
              <label class="form-label">Password</label>
              <input type="password" class="form-control" [(ngModel)]="password" />
            </div>

            <button class="btn btn-danger w-100" [disabled]="loading" (click)="startLogin()">Start Login</button>
            <button class="btn btn-outline-secondary w-100 mt-2" [disabled]="loading" (click)="tryBiometricLogin()" *ngIf="biometricAvailable">
              🔐 Login with Thumbprint
            </button>
            <div *ngIf="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
          </div>
        </div>

        <div class="col-12 col-lg-5">
          <div class="card p-4 offers-shell h-100">
            <h4 class="mb-2">App Offers</h4>
            <p class="text-muted small mb-3">Grab live discounts while logging in.</p>
            <img [src]="loginBannerSrc" (error)="onLoginBannerError($event)" alt="LunchBox login banner" class="login-banner mb-3" />

            <div class="offer-highlight mb-3">
              <div class="small fw-semibold text-danger">Hot Offer</div>
              <div class="display-6 fw-bold mb-1">50% OFF</div>
              <div class="fw-semibold">First Trip</div>
              <div class="small mt-1">Use code <span class="code-chip">FIRST50</span></div>
            </div>

            <div class="offer-list">
              <div class="offer-item" *ngFor="let offer of promoOffers">
                <div class="fw-semibold">{{ offer.title }}</div>
                <div class="small text-muted mb-1">{{ offer.detail }}</div>
                <div class="small">Code: <span class="code-chip">{{ offer.code }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-shell {
        border: 1px solid var(--border-color);
      }

      .offers-shell {
        border: 1px solid rgba(220, 53, 69, 0.25);
        background: linear-gradient(180deg, #fff7f8 0%, #ffffff 100%);
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

      .login-banner {
        width: 100%;
        height: 96px;
        object-fit: cover;
        border-radius: 12px;
        border: 1px solid rgba(220, 53, 69, 0.25);
        background: #fff;
      }

      .mode-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
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

      .offer-highlight {
        border: 1px solid rgba(220, 53, 69, 0.28);
        border-radius: 12px;
        padding: 12px;
        background: #fff;
      }

      .offer-list {
        display: grid;
        gap: 10px;
      }

      .offer-item {
        border: 1px solid #f1f3f5;
        border-radius: 10px;
        padding: 10px;
        background: #fff;
      }

      .code-chip {
        display: inline-block;
        background: #2d3142;
        color: #fff;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 12px;
      }

      @media (max-width: 768px) {
        .brand-strip {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class LoginComponent implements OnInit {
  loginLogoSrc = '/assets/lunchbox-logo.svg';
  loginBannerSrc = '/assets/login-banner.svg';
  username = '';
  password = '';
  role: Exclude<UserRole, 'user'> = 'customer';
  biometricAvailable = false;

  loading = false;
  errorMessage = '';
  readonly promoOffers = [
    { title: 'First Trip 50% OFF', code: 'FIRST50', detail: 'Valid for new users on first completed ride only.' },
    { title: 'Night Delivery 30% OFF', code: 'NIGHT30', detail: 'Available from 10 PM to 6 AM for food and medicine.' },
    { title: 'Parcel Combo 25% OFF', code: 'PARCEL25', detail: 'Apply on 2 or more parcel drops in the same booking window.' },
    { title: 'Captain Choice Deal 20% OFF', code: 'CAPTAIN20', detail: 'Discount unlocks for top-rated captain assignments.' }
  ];

  constructor(
    private auth: AuthService,
    private notifications: NotificationService,
    private biometric: BiometricService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.biometric.checkAvailability().subscribe((result) => {
      this.biometricAvailable = result.available;
    });
  }

  setRole(role: Exclude<UserRole, 'user'>): void {
    this.role = role;
  }

  onLoginLogoError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    if (this.loginLogoSrc !== '/assets/rider-dummy.svg') {
      this.loginLogoSrc = '/assets/rider-dummy.svg';
      return;
    }

    image.style.display = 'none';
  }

  onLoginBannerError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    if (this.loginBannerSrc !== '/assets/rider-dummy.svg') {
      this.loginBannerSrc = '/assets/rider-dummy.svg';
      return;
    }

    image.style.display = 'none';
  }

  startLogin(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auth.startLogin(this.username, this.password, this.role).subscribe({
      next: (response: LoginStartResponse) => {
        if (!response.sessionToken || !response.user) {
          this.loading = false;
          this.errorMessage = 'Login response is incomplete.';
          return;
        }

        this.auth.completeLogin({
          sessionToken: response.sessionToken,
          user: response.user,
          message: response.message
        });
        this.notifications.push(response.message, 'success');
        this.auth.recordUserAction('login_complete', { username: this.username }).subscribe({ error: () => void 0 });
        this.showWelcomeAndEnrollBiometric(response.user);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.error || 'Login failed.';
      }
    });
  }

  tryBiometricLogin(): void {
    this.loading = true;
    this.errorMessage = '';

    if (!this.username) {
      this.errorMessage = 'Please enter your username first.';
      this.loading = false;
      return;
    }

    this.biometric.authenticateWithBiometric(this.username).subscribe((result) => {
      if (!result.success) {
        this.errorMessage = result.message;
        this.loading = false;
        return;
      }

      this.notifications.push('Biometric authentication successful!', 'success');
      const currentUser = this.auth.getCurrentUser();
      if (currentUser) {
        this.showWelcomeAndNavigate(currentUser);
      } else {
        this.loading = false;
        this.errorMessage = 'Unable to retrieve user data after biometric auth.';
      }
    });
  }

  private showWelcomeAndEnrollBiometric(user: any): void {
    this.showWelcomeDialog(user);

    setTimeout(() => {
      const enrollBiometric = confirm(
        `Welcome, ${user.displayName}!\n\nWould you like to enroll your fingerprint/thumbprint for faster login next time?`
      );

      if (enrollBiometric) {
        this.biometric.registerBiometric(user.id, user.username).subscribe((result) => {
          if (result.success) {
            this.notifications.push(result.message, 'success');
          } else {
            this.notifications.push(result.message, 'warning');
          }
          this.requestLocationThenNavigate();
        });
      } else {
        this.requestLocationThenNavigate();
      }
    }, 800);
  }

  private showWelcomeAndNavigate(user: any): void {
    this.showWelcomeDialog(user);
    setTimeout(() => this.requestLocationThenNavigate(), 800);
  }

  private showWelcomeDialog(user: any): void {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div class="welcome-overlay" style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center; z-index: 9999;
      ">
        <div class="welcome-dialog" style="
          background: white; border-radius: 20px; padding: 32px 24px; max-width: 420px;
          width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center;
        ">
          <div style="font-size: 64px; margin-bottom: 16px;">👋</div>
          <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 12px; color: #1d3557;">
            Welcome, ${user.displayName}!
          </h2>
          <p style="font-size: 14px; color: #666; margin-bottom: 16px;">
            You're now securely logged in.
          </p>
          <div style="
            background: #f0f5ff; border-radius: 12px; padding: 12px; margin-bottom: 20px; color: #13416a;
          ">
            <small>Role: <strong>${this.getRoleLabel(user.role)}</strong></small>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="btn btn-danger" style="
            width: 100%; padding: 10px;
          ">
            Get Started
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  private getRoleLabel(role: string): string {
    const roleMap: Record<string, string> = {
      customer: 'Customer - Book & Track',
      admin: 'Admin - Full Access',
      captain: 'Captain - Jobs & Deliveries'
    };
    return roleMap[role] || role;
  }

  private requestLocationThenNavigate(): void {
    const navigateNext = () => {
      this.loading = false;
      if (this.auth.isAdmin()) {
        this.router.navigate(['/admin']);
      } else if (this.auth.isCaptain()) {
        this.router.navigate(['/captain-profile']);
      } else {
        this.router.navigate(['/booking']);
      }
    };

    if (!navigator.geolocation) {
      this.notifications.push('Location is not supported on this device. Continuing without location.', 'warning');
      navigateNext();
      return;
    }

    this.notifications.push('Please allow location access for better pickup suggestions.', 'info');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Math.round(position.coords.latitude * 100000) / 100000;
        const lng = Math.round(position.coords.longitude * 100000) / 100000;
        localStorage.setItem('delivery_last_location', JSON.stringify({ lat, lng, capturedAt: new Date().toISOString() }));
        this.notifications.push(`Location enabled: ${lat}, ${lng}`, 'success');
        navigateNext();
      },
      () => {
        this.notifications.push('Location permission denied. You can still continue and set locations manually.', 'warning');
        navigateNext();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
}
