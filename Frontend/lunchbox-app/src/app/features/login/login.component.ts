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
    <section class="login-page">
      <div class="login-noise"></div>
      <div class="container py-5" style="max-width: 1100px; position: relative; z-index: 1;">
      <div class="row g-3 align-items-stretch">
        <div class="col-12 col-lg-7">
          <div class="card p-4 p-md-5 auth-shell h-100">
            <div class="brand-strip mb-3">
              <img [src]="loginLogoSrc" (error)="onLoginLogoError($event)" alt="RouteX logo" class="brand-logo" />
              <div>
                <h2 class="mb-1">RouteX</h2>
                <p class="brand-caption mb-0">Fast. Dark. Precise. Sign in with your role and continue.</p>
              </div>
            </div>
            <p class="mb-4 secondary-copy">No account? <a routerLink="/register">Create one now</a>.</p>

            <div class="mb-4">
              <label class="form-label section-label">Login Mode</label>
              <div class="mode-grid">
                <button class="btn" [class.mode-active]="role === 'customer'" (click)="setRole('customer')" type="button">Customer</button>
                <button class="btn" [class.mode-active]="role === 'admin'" (click)="setRole('admin')" type="button">Admin</button>
                <button class="btn" [class.mode-active]="role === 'captain'" (click)="setRole('captain')" type="button">Captain</button>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label section-label">Username</label>
              <input class="form-control dark-input" [(ngModel)]="username" placeholder="Enter username" />
            </div>

            <div class="mb-3">
              <label class="form-label section-label">Password</label>
              <input type="password" class="form-control dark-input" [(ngModel)]="password" placeholder="Enter password" />
            </div>

            <button class="btn w-100 guest-fill-btn mb-3" [disabled]="loading" (click)="fillGuestCredentials()" type="button">
              Continue as Guest (Auto Fill)
            </button>

            <button class="btn btn-danger w-100 auth-primary" [disabled]="loading" (click)="startLogin()">Start Login</button>
            <button class="btn btn-outline-secondary w-100 mt-2 auth-secondary" [disabled]="loading" (click)="tryBiometricLogin()" *ngIf="biometricAvailable">
              🔐 Login with Thumbprint
            </button>
            <div *ngIf="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
          </div>
        </div>

        <div class="col-12 col-lg-5">
          <div class="card p-4 offers-shell h-100">
            <h4 class="mb-2">Urban Offers</h4>
            <p class="small mb-3 secondary-copy">Grab live discounts while logging in.</p>
            <img [src]="loginBannerSrc" (error)="onLoginBannerError($event)" alt="RouteX login banner" class="login-banner mb-3" />

            <div class="offer-highlight mb-3">
              <div class="small fw-semibold text-danger-emphasis">Hot Offer</div>
              <div class="display-6 fw-bold mb-1">50% OFF</div>
              <div class="fw-semibold">First Trip</div>
              <div class="small mt-1">Use code <span class="code-chip">FIRST50</span></div>
            </div>

            <div class="offer-list">
              <div class="offer-item" *ngFor="let offer of promoOffers">
                <div class="fw-semibold">{{ offer.title }}</div>
                <div class="small secondary-copy mb-1">{{ offer.detail }}</div>
                <div class="small">Code: <span class="code-chip">{{ offer.code }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </section>
  `,
  styles: [
    `
      .login-page {
        position: relative;
        min-height: calc(100vh - 56px);
        padding: 8px 0 24px;
        background:
          radial-gradient(circle at 10% 20%, rgba(232, 23, 54, 0.18), transparent 40%),
          radial-gradient(circle at 90% 10%, rgba(255, 132, 0, 0.12), transparent 42%),
          linear-gradient(145deg, #050507 0%, #0f1014 48%, #191a20 100%);
      }

      .login-noise {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: radial-gradient(rgba(255, 255, 255, 0.06) 0.6px, transparent 0.6px);
        background-size: 3px 3px;
        opacity: 0.08;
      }

      .auth-shell {
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: linear-gradient(160deg, rgba(14, 14, 18, 0.96) 0%, rgba(21, 21, 26, 0.9) 100%);
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
        color: #f2f3f5;
        font-family: 'Bahnschrift', 'Trebuchet MS', 'Segoe UI', Tahoma, sans-serif;
      }

      .offers-shell {
        border: 1px solid rgba(255, 77, 109, 0.25);
        background: linear-gradient(170deg, rgba(27, 27, 33, 0.96) 0%, rgba(15, 16, 20, 0.94) 100%);
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
        color: #f8f8f9;
        font-family: 'Franklin Gothic Medium', 'Bahnschrift', 'Trebuchet MS', sans-serif;
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
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: #111318;
      }

      h2,
      h4 {
        color: #f7f7fa;
      }

      .brand-caption,
      .secondary-copy {
        color: #a6a9b3;
      }

      .section-label {
        color: #d7d9de;
        font-weight: 600;
      }

      .login-banner {
        width: 100%;
        height: 96px;
        object-fit: cover;
        border-radius: 12px;
        border: 1px solid rgba(255, 77, 109, 0.35);
        background: #14151a;
      }

      .mode-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .mode-grid .btn {
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(255, 255, 255, 0.04);
        color: #d6d9e0;
        font-weight: 500;
      }

      .mode-grid .mode-active {
        border-color: #ff304f;
        background: linear-gradient(130deg, #ff2247 0%, #c91934 100%);
        color: #ffffff;
        font-weight: 600;
        box-shadow: 0 10px 22px rgba(224, 30, 60, 0.34);
      }

      .dark-input {
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(9, 10, 14, 0.8);
        color: #f3f4f6;
      }

      .dark-input::placeholder {
        color: #8f94a1;
      }

      .dark-input:focus {
        border-color: #ff3959;
        box-shadow: 0 0 0 0.2rem rgba(255, 58, 89, 0.2);
        background: #0c0d12;
        color: #ffffff;
      }

      .auth-primary {
        background: linear-gradient(130deg, #ff304f 0%, #c9143a 100%);
        border: none;
        font-weight: 600;
      }

      .guest-fill-btn {
        border: 1px dashed rgba(255, 255, 255, 0.35);
        color: #f0f3f8;
        background: rgba(255, 255, 255, 0.06);
        font-weight: 600;
      }

      .guest-fill-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }

      .auth-primary:hover:not(:disabled) {
        filter: brightness(1.05);
      }

      .auth-secondary {
        border-color: rgba(255, 255, 255, 0.3);
        color: #f4f5f7;
      }

      .auth-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
      }

      .offer-highlight {
        border: 1px solid rgba(255, 77, 109, 0.45);
        border-radius: 12px;
        padding: 12px;
        background: linear-gradient(160deg, rgba(255, 57, 90, 0.17), rgba(255, 98, 0, 0.09));
      }

      .offer-list {
        display: grid;
        gap: 10px;
      }

      .offer-item {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 10px;
        background: rgba(12, 13, 17, 0.72);
      }

      .code-chip {
        display: inline-block;
        background: #ff2b4d;
        color: #ffffff;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 12px;
        letter-spacing: 0.35px;
      }

      .alert-danger {
        background: rgba(177, 40, 64, 0.3);
        color: #ffccd4;
        border: 1px solid rgba(255, 121, 142, 0.4);
      }

      @media (max-width: 768px) {
        .login-page {
          padding-top: 0;
        }

        .brand-strip {
          grid-template-columns: 1fr;
        }

        .auth-shell,
        .offers-shell {
          padding: 1.15rem !important;
        }
      }
    `
  ]
})
export class LoginComponent implements OnInit {
  private readonly guestUsername = 'user';
  private readonly guestPassword = 'user123';

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

  fillGuestCredentials(): void {
    this.role = 'customer';
    this.username = this.guestUsername;
    this.password = this.guestPassword;
    this.errorMessage = '';
    this.notifications.push('Guest credentials auto-filled. Tap Start Login.', 'info');
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
        }, {
          username: this.username,
          password: this.password
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
        this.router.navigate(['/home']);
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
