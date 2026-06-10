import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { AppNotification, AppUser } from './core/models/delivery.models';
import { LanguageCode, LanguageService } from './core/services/language.service';
import { ThemeCode, ThemeService } from './core/services/theme.service';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';
import { environment } from '../environments/environment';
import { SupportService } from './core/services/support.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, ChatbotComponent],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark sticky-top app-nav">
      <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center gap-2" routerLink="/">
          <img src="assets/lunchbox-logo.svg" alt="RouteX logo" class="brand-logo-img" />
          <span class="brand-text">{{ t('appName') }}</span>
        </a>
        <button
          class="navbar-toggler"
          type="button"
          aria-controls="navbarNav"
          [attr.aria-expanded]="isNavOpen"
          aria-label="Toggle navigation"
          (click)="toggleNav()"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" [class.show]="isNavOpen" id="navbarNav">
          <ul class="navbar-nav ms-auto gap-2 align-items-center">
            <!-- Public links -->
            <li class="nav-item" *ngIf="!(isLoggedIn$ | async)">
              <a class="nav-link" routerLink="/login" routerLinkActive="active" (click)="handleNavLinkClick()">{{ t('login') }}</a>
            </li>
            <li class="nav-item" *ngIf="!(isLoggedIn$ | async)">
              <a class="nav-link" routerLink="/register" routerLinkActive="active" (click)="handleNavLinkClick()">{{ t('register') }}</a>
            </li>

            <!-- Customer links -->
            <li class="nav-item hide-on-mobile-nav" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/home" routerLinkActive="active" (click)="handleNavLinkClick()">Home</a>
            </li>
            <li class="nav-item hide-on-mobile-nav" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/services" routerLinkActive="active" (click)="handleNavLinkClick()">Services</a>
            </li>
            <li class="nav-item hide-on-mobile-nav" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/activity" routerLinkActive="active" (click)="handleNavLinkClick()">Activity</a>
            </li>
            <li class="nav-item hide-on-mobile-nav" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/account" routerLinkActive="active" (click)="handleNavLinkClick()">Account</a>
            </li>

            <!-- Captain links -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isCaptain$ | async)">
              <a class="nav-link" routerLink="/captain-profile" routerLinkActive="active" (click)="handleNavLinkClick()">{{ t('jobsDeliveries') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isCaptain$ | async)">
              <button class="btn btn-outline-light btn-sm ms-1" type="button" (click)="logout(); handleNavLinkClick()">🚪 Logout</button>
            </li>

            <!-- Admin links -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/booking" routerLinkActive="active" (click)="handleNavLinkClick()">{{ t('bookDelivery') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async) && showTrackBookingLink">
              <a class="nav-link" routerLink="/tracking" routerLinkActive="active" (click)="handleNavLinkClick()">{{ t('trackBooking') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/admin" routerLinkActive="active" (click)="handleNavLinkClick()">{{ t('adminPanel') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/audit" routerLinkActive="active" (click)="handleNavLinkClick()">{{ t('auditLogs') }}</a>
            </li>

            <!-- Language selector (inline buttons) -->
            <li class="nav-item">
              <div class="btn-group btn-group-sm ms-2">
                <button
                  type="button"
                  class="btn btn-outline-light"
                  [class.active]="(currentLanguage$ | async) === 'en'"
                  (click)="changeLanguage('en')"
                >
                  EN
                </button>
                <button
                  type="button"
                  class="btn btn-outline-light"
                  [class.active]="(currentLanguage$ | async) === 'hi'"
                  (click)="changeLanguage('hi')"
                >
                  हि
                </button>
                <button
                  type="button"
                  class="btn btn-outline-light"
                  [class.active]="(currentLanguage$ | async) === 'te'"
                  (click)="changeLanguage('te')"
                >
                  తె
                </button>
              </div>
            </li>

            <!-- Theme toggle -->
            <li class="nav-item">
              <button class="btn btn-outline-light btn-sm ms-2" (click)="toggleTheme()" title="Toggle theme">
                {{ (currentTheme$ | async) === 'dark' ? '🌙' : ((currentTheme$ | async) === 'ocean' ? '🌊' : '☀️') }}
              </button>
            </li>

            <!-- Quick action button -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && !(isCaptain$ | async)">
              <button class="btn btn-brand-action btn-sm ms-2" routerLink="/booking" (click)="handleNavLinkClick()">Quick Book</button>
            </li>

            <!-- Notification center -->
            <li class="nav-item" *ngIf="isLoggedIn$ | async">
              <button class="btn btn-outline-light btn-sm ms-2" (click)="toggleNotificationCenter()" title="Notifications">
                🔔 <span class="badge bg-danger" *ngIf="(notificationCount$ | async) as count">{{ count }}</span>
              </button>
            </li>

            <!-- Profile chip (logged-in) -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (currentUser$ | async) as user">
              <div class="profile-chip ms-2" (click)="toggleProfileMenu(); $event.stopPropagation()" [class.open]="showProfileMenu">
                <img
                  class="profile-chip-avatar"
                  [src]="getAvatarUrl(user)"
                  [alt]="user.displayName"
                  (error)="onNavAvatarError($event, user)"
                />
                <div class="profile-chip-text">
                  <span class="profile-chip-name">{{ user.displayName }}</span>
                  <span class="profile-chip-role" [attr.data-role]="user.role">{{ user.role }}</span>
                </div>
                <span class="profile-chip-caret">&#9662;</span>
              </div>

              <!-- Dropdown -->
              <div class="profile-dropdown" *ngIf="showProfileMenu" (click)="$event.stopPropagation()">
                <div class="profile-dropdown-header">
                  <img
                    class="profile-dropdown-avatar"
                    [src]="getAvatarUrl(user)"
                    [alt]="user.displayName"
                    (error)="onNavAvatarError($event, user)"
                  />
                  <div class="profile-dropdown-meta">
                    <div class="profile-dropdown-name">{{ user.displayName }}</div>
                    <span class="profile-dropdown-role-badge" [attr.data-role]="user.role">{{ user.role | titlecase }}</span>
                  </div>
                </div>
                <div class="profile-dropdown-divider"></div>
                <div class="profile-dropdown-row" *ngIf="user.email">
                  <span class="pdr-icon">&#9993;</span>
                  <span class="pdr-val">{{ user.email }}</span>
                </div>
                <div class="profile-dropdown-row" *ngIf="user.mobile">
                  <span class="pdr-icon">&#128222;</span>
                  <span class="pdr-val">{{ user.mobile }}</span>
                </div>
                <div class="profile-dropdown-row" *ngIf="user.captainVehicle">
                  <span class="pdr-icon">&#128663;</span>
                  <span class="pdr-val">{{ user.captainVehicle | titlecase }}</span>
                </div>
                <div class="profile-dropdown-divider"></div>
                <button class="profile-dropdown-logout" (click)="logout()">&#10148; Sign out</button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- Notification Center -->
    <div class="notification-center" *ngIf="showNotificationCenter">
      <div class="notification-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">{{ t('notifications') }}</h5>
        <button class="btn btn-sm btn-close" type="button" (click)="toggleNotificationCenter()"></button>
      </div>
      <div class="notification-list">
        <div *ngIf="(notifications$ | async) as notifs">
          <div *ngIf="notifs.length === 0" class="text-muted small text-center py-3">
            No notifications
          </div>
          <div *ngFor="let notif of notifs" [ngClass]="'alert alert-' + notif.level" role="alert" class="mb-2">
            {{ notif.message }}
          </div>
        </div>
      </div>
      <div class="notification-footer">
        <button class="btn btn-sm btn-warning" type="button" (click)="notificationService.clear()">{{ t('clearAll') }}</button>
      </div>
    </div>

    <div class="network-down-banner" *ngIf="isNetworkDown" role="status" aria-live="polite">
      <img src="assets/dog-logo.svg" alt="Dog logo" class="network-down-dog" />
      <div>
        <div class="network-down-title">Network is down</div>
        <div class="network-down-subtitle">Please check your internet connection and retry.</div>
      </div>
    </div>

    <!-- Floating Toast Notifications -->
    <div class="toast-viewport" *ngIf="(notifications$ | async) as notifs" aria-live="polite" aria-atomic="true">
      <div
        class="toast-card"
        *ngFor="let notif of notifs; trackBy: trackNotification"
        [ngClass]="'toast-' + notif.level"
        role="alert"
      >
        <div class="toast-icon" aria-hidden="true">{{ notificationIcon(notif.level) }}</div>
        <div class="toast-content">
          <div class="toast-title">{{ notificationLabel(notif.level) }}</div>
          <div class="toast-message">{{ notif.message }}</div>
        </div>
        <button class="toast-close" type="button" (click)="notificationService.dismiss(notif.id)" aria-label="Dismiss notification">&times;</button>
      </div>
    </div>

    <!-- Main content -->
    <main class="app-main">
      <router-outlet></router-outlet>
    </main>

    <nav class="bottom-tab-nav" aria-label="Mobile bottom navigation" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
      <a class="tab-item" [class.active]="isBottomTabActive('home')" routerLink="/home" aria-label="Home">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 10.5L12 3l9 7.5"></path>
            <path d="M5 9.5V21h14V9.5"></path>
          </svg>
          <span class="tab-label">Home</span>
        </span>
      </a>

      <a class="tab-item" [class.active]="isBottomTabActive('services')" [routerLink]="servicesTabRoute()" aria-label="Services">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4" width="6" height="6" rx="1"></rect>
            <rect x="14" y="4" width="6" height="6" rx="1"></rect>
            <rect x="4" y="14" width="6" height="6" rx="1"></rect>
            <rect x="14" y="14" width="6" height="6" rx="1"></rect>
          </svg>
          <span class="tab-label">Services</span>
        </span>
      </a>

      <a class="tab-item" [class.active]="isBottomTabActive('activity')" [routerLink]="activityTabRoute()" aria-label="Activity">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="3,13 8,13 10,8 14,18 16,13 21,13"></polyline>
          </svg>
          <span class="tab-label">Activity</span>
        </span>
      </a>

      <a class="tab-item" [class.active]="isBottomTabActive('account')" [routerLink]="accountTabRoute()" aria-label="Account">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5"></circle>
            <path d="M5 20c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5"></path>
          </svg>
          <span class="tab-label">Account</span>
        </span>
      </a>
    </nav>

    <!-- Captain Mobile Bottom Bar -->
    <nav class="captain-bottom-nav" aria-label="Captain navigation" *ngIf="(isLoggedIn$ | async) && (isCaptain$ | async)">
      <a class="captain-tab" routerLink="/captain-profile" routerLinkActive="captain-tab-active">
        <span class="captain-tab-icon">🏍️</span>
        <span class="captain-tab-label">My Rides</span>
      </a>
      <button class="captain-tab captain-logout-tab" type="button" (click)="logout()">
        <span class="captain-tab-icon">🚪</span>
        <span class="captain-tab-label">Logout</span>
      </button>
    </nav>

    <footer class="app-footer" aria-label="RouteX footer">
      <div class="container-fluid footer-inner">
        <div class="footer-top-row">
          <span class="footer-brand">RouteX</span>
          <span class="footer-divider">|</span>
          <a class="footer-mail" href="mailto:goat82447@gmail.com">goat82447@gmail.com</a>
        </div>
        <div class="footer-links-row">
          <a class="footer-link" routerLink="/about-us">{{ t('aboutUsNav') }}</a>
          <span class="footer-dot">•</span>
          <a class="footer-link" routerLink="/contact">{{ t('contactNav') }}</a>
        </div>
        <div class="footer-copy">&copy; {{ currentYear }} RouteX. All rights reserved. | Version {{ appVersion }}</div>
      </div>
    </footer>

    <!-- RouteX Assistant -->
    <app-chatbot></app-chatbot>

    <!-- Professional Rating Sheet -->
    <div class="fb-backdrop" *ngIf="showAppFeedbackWidget" role="dialog" aria-modal="true" aria-label="Rate RouteX" (click)="dismissAppFeedbackWidget()">
      <div class="fb-sheet" (click)="$event.stopPropagation()">
        <!-- Handle bar -->
        <div class="fb-handle"></div>

        <!-- App icon + heading -->
        <div class="fb-brand">
          <div class="fb-app-icon">
            <img src="assets/lunchbox-logo.svg" alt="RouteX" />
          </div>
          <div class="fb-brand-text">
            <div class="fb-heading">Enjoying RouteX?</div>
            <div class="fb-sub">Your feedback helps us improve</div>
          </div>
        </div>

        <!-- Stars -->
        <div class="fb-stars" aria-label="5 star rating">
          <button
            type="button"
            class="fb-star"
            *ngFor="let star of feedbackStars"
            [class.lit]="star <= appRating"
            [class.hover]="star <= hoveredStar"
            (mouseenter)="hoveredStar = star"
            (mouseleave)="hoveredStar = 0"
            (click)="setAppRating(star)"
            [attr.aria-label]="'Rate ' + star + ' stars'"
          >&#9733;</button>
        </div>

        <!-- Dynamic label -->
        <div class="fb-label" [class.visible]="appRating > 0 || hoveredStar > 0">
          {{ ratingLabel(appRating || hoveredStar) }}
        </div>

        <!-- Note textarea (shows after selecting a star) -->
        <div class="fb-note-wrap" *ngIf="appRating > 0">
          <textarea
            class="fb-note"
            rows="2"
            maxlength="200"
            placeholder="Tell us more (optional)"
            [(ngModel)]="appFeedbackNote"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="fb-actions">
          <button type="button" class="fb-btn-later" (click)="dismissAppFeedbackWidget()">Not now</button>
          <button
            type="button"
            class="fb-btn-submit"
            [disabled]="appRating < 1 || isSubmittingAppFeedback"
            (click)="submitAppFeedback()"
          >
            <span *ngIf="!isSubmittingAppFeedback">Submit Rating</span>
            <span *ngIf="isSubmittingAppFeedback" class="fb-spinner"></span>
          </button>
        </div>
      </div>
    </div>


  `,
  styles: [
    `
      /* ── Feedback sheet ── */
      .fb-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1065;
        background: rgba(2, 6, 23, 0.45);
        display: grid;
        place-items: center;
        padding: 16px;
      }

      .app-feedback-modal {
        width: min(360px, calc(100vw - 24px));
        border: 1px solid #dbeafe;
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.26);
        padding: 14px;
      }

      .feedback-type-switch {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        margin-bottom: 24px;
      }

      .fb-app-icon {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: linear-gradient(135deg, #ef233c 0%, #c81d2e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(239, 35, 60, 0.3);
      }

      .fb-app-icon img {
        width: 34px;
        height: 34px;
        filter: brightness(0) invert(1);
      }

      .fb-heading {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.3;
      }

      .fb-sub {
        font-size: 0.82rem;
        color: #64748b;
        margin-top: 2px;
      }

      .fb-stars {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }

      .fb-star {
        border: none;
        background: transparent;
        font-size: 2.4rem;
        line-height: 1;
        color: #e2e8f0;
        cursor: pointer;
        padding: 0;
        transition: color 0.14s ease, transform 0.14s ease;
      }

      .fb-star.lit,
      .fb-star.hover {
        color: #f59e0b;
        transform: scale(1.15);
      }

      .fb-label {
        height: 22px;
        font-size: 0.9rem;
        font-weight: 600;
        color: #ef233c;
        opacity: 0;
        transition: opacity 0.18s ease;
        margin-bottom: 14px;
      }

      .fb-label.visible {
        opacity: 1;
      }

      .fb-note-wrap {
        width: 100%;
        margin-bottom: 20px;
        animation: fb-fade-in 0.2s ease;
      }

      .fb-note {
        width: 100%;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 0.88rem;
        resize: none;
        outline: none;
        color: #1e293b;
        background: #f8fafc;
        transition: border-color 0.18s;
      }

      .fb-note:focus {
        border-color: #ef233c;
        background: #fff;
      }

      .fb-actions {
        display: flex;
        gap: 10px;
        width: 100%;
        margin-top: 4px;
      }

      .fb-btn-later {
        flex: 1;
        height: 46px;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        background: transparent;
        color: #64748b;
        font-size: 0.92rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.16s;
      }

      .fb-btn-later:hover {
        background: #f1f5f9;
      }

      .fb-btn-submit {
        flex: 2;
        height: 46px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #ef233c 0%, #c81d2e 100%);
        color: #fff;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: opacity 0.16s, transform 0.14s;
        box-shadow: 0 4px 14px rgba(239, 35, 60, 0.35);
      }

      .fb-btn-submit:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        box-shadow: none;
      }

      .fb-btn-submit:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(239, 35, 60, 0.4);
      }

      .fb-spinner {
        width: 18px;
        height: 18px;
        border: 2.5px solid rgba(255,255,255,0.4);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        display: inline-block;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* ── Captain Mobile Bottom Bar ── */
      .captain-bottom-nav {
        display: none;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 1040;
        background: #1a1a2e;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding: 6px 0 env(safe-area-inset-bottom, 6px);
        justify-content: space-around;
        align-items: center;
      }
      @media (max-width: 991px) {
        .captain-bottom-nav { display: flex; }
        .app-main { padding-bottom: 72px; }
      }
      .captain-tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 8px 32px;
        color: rgba(255,255,255,0.6);
        text-decoration: none;
        font-size: 11px;
        font-weight: 600;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 12px;
        transition: all 0.15s;
        flex: 1;
      }
      .captain-tab:hover, .captain-tab.captain-tab-active {
        color: #fff;
        background: rgba(255,255,255,0.1);
      }
      .captain-tab-icon { font-size: 22px; line-height: 1; }
      .captain-tab-label { font-size: 11px; font-weight: 700; }
      .captain-logout-tab { color: #fca5a5; }
      .captain-logout-tab:hover { color: #fff; background: rgba(239,68,68,0.25); }
    `
  ]
})
export class AppComponent {
  private readonly appFeedbackSubmittedKey = 'routex_app_feedback_submitted_v1';
  private languageService = inject(LanguageService);
  notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private supportService = inject(SupportService);

  isNavOpen = false;
  showNotificationCenter = false;
  showProfileMenu = false;
  isNetworkDown = typeof navigator !== 'undefined' && !navigator.onLine;

  isLoggedIn$: Observable<boolean> = this.authService.user$.pipe(map(() => this.authService.isLoggedIn()));
  isAdmin$: Observable<boolean> = this.authService.user$.pipe(map(() => this.authService.isAdmin()));
  isCaptain$: Observable<boolean> = this.authService.user$.pipe(map(user => user?.role === 'captain'));
  currentUser$: Observable<AppUser | null> = this.authService.user$;
  showTrackBookingLink = false;
  currentLanguage$: Observable<LanguageCode> = this.languageService.language$;
  currentTheme$: Observable<ThemeCode> = this.themeService.theme$;
  notifications$: Observable<AppNotification[]> = this.notificationService.notifications$;
  notificationCount$: Observable<number> = this.notifications$.pipe(map(notifs => notifs.length));
  currentYear = new Date().getFullYear();
  appVersion = environment.appVersion;
  showAppFeedbackWidget = this.shouldShowAppFeedbackWidget();
  selectedFeedbackType: 'open' | 'close' = 'open';
  appRating = 0;
  hoveredStar = 0;
  appFeedbackNote = '';
  isSubmittingAppFeedback = false;
  readonly feedbackStars = [1, 2, 3, 4, 5];

  t(key: string): string {
    return this.languageService.t(key);
  }

  toggleNav(): void {
    this.isNavOpen = !this.isNavOpen;
  }

  handleNavLinkClick(): void {
    this.isNavOpen = false;
    this.showProfileMenu = false;
  }

  changeLanguage(lang: LanguageCode): void {
    this.languageService.setLanguage(lang);
  }

  toggleTheme(): void {
    const current = this.themeService.getCurrentTheme();
    const themes: ThemeCode[] = ['light', 'dark', 'ocean'];
    const currentIndex = themes.indexOf(current);
    const next = themes[(currentIndex + 1) % themes.length];
    this.themeService.setTheme(next);
  }

  toggleNotificationCenter(): void {
    this.showNotificationCenter = !this.showNotificationCenter;
  }

  notificationLabel(level: AppNotification['level']): string {
    if (level === 'success') return 'Success';
    if (level === 'warning') return 'Warning';
    if (level === 'error') return 'Error';
    return 'Info';
  }

  notificationIcon(level: AppNotification['level']): string {
    if (level === 'success') return 'OK';
    if (level === 'warning') return '!';
    if (level === 'error') return 'X';
    return 'i';
  }

  trackNotification(_index: number, notification: AppNotification): string {
    return notification.id;
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
  }

  servicesTabRoute(): string {
    if (!this.authService.isLoggedIn()) {
      return '/login';
    }

    if (this.authService.isCaptain()) {
      return '/captain-profile';
    }

    return '/services';
  }

  activityTabRoute(): string {
    if (!this.authService.isLoggedIn()) {
      return '/login';
    }

    if (this.authService.isAdmin()) {
      return '/audit';
    }

    if (this.authService.isCaptain()) {
      return '/captain-profile';
    }

    return '/activity';
  }

  accountTabRoute(): string {
    if (!this.authService.isLoggedIn()) {
      return '/login';
    }

    if (this.authService.isAdmin()) {
      return '/admin';
    }

    if (this.authService.isCaptain()) {
      return '/captain-profile';
    }

    return '/account';
  }

  isBottomTabActive(tab: 'home' | 'services' | 'activity' | 'account'): boolean {
    const currentPath = this.router.url.split('?')[0] || '/';

    if (tab === 'home') {
      return currentPath === '/' || currentPath === '/home';
    }

    if (tab === 'services') {
      return currentPath.startsWith('/services') || currentPath.startsWith('/school-booking') || currentPath.startsWith('/lunchbox-delivery');
    }

    if (tab === 'activity') {
      return currentPath.startsWith('/activity') || currentPath.startsWith('/tracking');
    }

    return currentPath.startsWith('/account') || currentPath.startsWith('/admin') || currentPath.startsWith('/captain-profile');
  }

  getAvatarUrl(user: AppUser): string {
    if (user.profileImageUrl) return user.profileImageUrl;
    const roleColors: Record<string, string> = {
      admin:    'f59e0b',
      captain:  '22c55e',
      customer: '38bdf8',
    };
    const bg = roleColors[user.role] ?? '6366f1';
    const name = encodeURIComponent(user.displayName || user.username);
    return `https://ui-avatars.com/api/?name=${name}&background=${bg}&color=fff&size=128&bold=true`;
  }

  onNavAvatarError(event: Event, user: AppUser): void {
    const img = event.target as HTMLImageElement;
    const name = encodeURIComponent(user.displayName || user.username || 'U');
    img.src = `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&size=128&bold=true`;
  }

  logout(): void {
    this.showProfileMenu = false;
    this.authService.logout();
    this.notificationService.push('Logged out successfully.', 'info');
    this.router.navigate(['/home']);
  }

  dismissAppFeedbackWidget(): void {
    this.showAppFeedbackWidget = false;
    this.markAppFeedbackSubmitted();
  }

  setAppRating(value: number): void {
    this.appRating = value;
  }

  ratingLabel(star: number): string {
    const labels: Record<number, string> = {
      1: 'Terrible 😞',
      2: 'Not great 😕',
      3: 'It\'s okay 😐',
      4: 'Pretty good 😊',
      5: 'Love it! 🎉'
    };
    return labels[star] ?? '';
  }

  submitAppFeedback(): void {
    if (this.appRating < 1 || this.isSubmittingAppFeedback) {
      return;
    }

    const type = 'open' as const;
    const eventLabel = 'App Feedback';
    const payload = {
      feedbackType: type,
      feedbackLabel: eventLabel,
      appVersion: this.appVersion,
      route: this.router.url,
      submittedAt: new Date().toISOString(),
      rating: this.appRating,
      note: (this.appFeedbackNote || '').trim() || undefined
    };

    this.isSubmittingAppFeedback = true;
    this.supportService.submitAppFeedback(payload).subscribe({
      next: () => {
        this.notificationService.push(`${eventLabel} submitted. Thank you.`, 'success');
        this.isSubmittingAppFeedback = false;
        this.markAppFeedbackSubmitted();
        this.showAppFeedbackWidget = false;
      },
      error: (error) => {
        this.notificationService.push(error?.error?.error || `Failed to submit ${eventLabel}.`, 'error');
        this.isSubmittingAppFeedback = false;
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isNetworkDown = true;
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isNetworkDown = false;
  }

  private shouldShowAppFeedbackWidget(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }

    return window.localStorage.getItem(this.appFeedbackSubmittedKey) !== '1';
  }

  private markAppFeedbackSubmitted(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.setItem(this.appFeedbackSubmittedKey, '1');
  }
}
