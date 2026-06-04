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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, ChatbotComponent],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark sticky-top app-nav">
      <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center gap-2" routerLink="/">
          <span class="brand-logo" aria-hidden="true">LB</span>
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
              <a class="nav-link" routerLink="/login" routerLinkActive="active">{{ t('login') }}</a>
            </li>
            <li class="nav-item" *ngIf="!(isLoggedIn$ | async)">
              <a class="nav-link" routerLink="/register" routerLinkActive="active">{{ t('register') }}</a>
            </li>

            <!-- Customer links -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/booking" routerLinkActive="active">{{ t('bookDelivery') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/tracking" routerLinkActive="active">{{ t('trackBooking') }}</a>
            </li>

            <!-- Captain links -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isCaptain$ | async)">
              <a class="nav-link" routerLink="/captain-profile" routerLinkActive="active">{{ t('jobsDeliveries') }}</a>
            </li>

            <!-- Admin links -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/booking" routerLinkActive="active">{{ t('bookDelivery') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/tracking" routerLinkActive="active">{{ t('trackBooking') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/admin" routerLinkActive="active">{{ t('adminPanel') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/audit" routerLinkActive="active">{{ t('auditLogs') }}</a>
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
              <button class="btn btn-brand-action btn-sm ms-2" routerLink="/booking">Quick Book</button>
            </li>

            <!-- Notification center -->
            <li class="nav-item" *ngIf="isLoggedIn$ | async">
              <button class="btn btn-outline-light btn-sm ms-2" (click)="toggleNotificationCenter()" title="Notifications">
                🔔 <span class="badge bg-danger" *ngIf="(notificationCount$ | async) as count">{{ count }}</span>
              </button>
            </li>

            <!-- Logout -->
            <li class="nav-item" *ngIf="isLoggedIn$ | async">
              <button class="btn btn-outline-light btn-sm ms-2" (click)="logout()">{{ t('logout') }}</button>
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

    <!-- Main content -->
    <router-outlet></router-outlet>

    <!-- Chatbot -->
    <app-chatbot></app-chatbot>

    <style>
      .app-nav {
        background: var(--nav-bg);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .app-nav .navbar-brand {
        font-weight: 700;
        font-size: 1.15rem;
        letter-spacing: 0.3px;
        color: var(--nav-text);
      }

      .brand-logo {
        width: 2rem;
        height: 2rem;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 800;
        border: 1px solid var(--nav-border);
        color: var(--nav-text);
        background: var(--nav-chip-bg);
      }

      .brand-text {
        color: var(--nav-text);
      }

      .app-nav .nav-link {
        transition: all 0.3s ease;
        border-radius: 4px;
        padding: 0.5rem 0.75rem;
        color: var(--nav-text);
      }

      .app-nav .nav-link:hover,
      .app-nav .nav-link.active {
        background-color: var(--nav-hover-bg);
        color: var(--nav-text);
      }

      .app-nav .btn-outline-light {
        color: var(--nav-text);
        border-color: var(--nav-border);
      }

      .app-nav .btn-outline-light:hover {
        color: var(--nav-text);
        background-color: var(--nav-hover-bg);
        border-color: var(--nav-border);
      }

      .btn-brand-action {
        color: var(--nav-text);
        border: 1px solid var(--nav-border);
        background: var(--nav-chip-bg);
      }

      .btn-brand-action:hover {
        color: var(--nav-text);
        background: var(--nav-hover-bg);
      }

      .btn-group .btn.active {
        background-color: var(--nav-active-bg);
        border-color: var(--nav-border);
        color: var(--nav-text);
      }

      .notification-center {
        position: fixed;
        top: 60px;
        right: 20px;
        width: 350px;
        background: var(--surface);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1050;
      }

      .notification-header {
        padding: 16px;
        border-bottom: 1px solid var(--border-color);
      }

      .notification-list {
        max-height: 400px;
        overflow-y: auto;
        padding: 16px;
      }

      .notification-footer {
        padding: 12px 16px;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
      }

      .network-down-banner {
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 1100;
        display: flex;
        align-items: center;
        gap: 12px;
        background: #fff9e8;
        color: #3f2f17;
        border: 1px solid #e3c98f;
        box-shadow: 0 8px 24px rgba(63, 47, 23, 0.18);
        border-radius: 14px;
        padding: 10px 14px;
      }

      .network-down-dog {
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
      }

      .network-down-title {
        font-weight: 700;
        line-height: 1.1;
      }

      .network-down-subtitle {
        font-size: 0.82rem;
        opacity: 0.9;
      }

      @media (max-width: 991.98px) {
        .app-nav .navbar-brand {
          font-size: 1rem;
        }

        .app-nav .navbar-collapse {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--nav-border);
        }

        .app-nav .navbar-nav {
          width: 100%;
          align-items: stretch !important;
        }

        .app-nav .nav-item {
          width: 100%;
        }

        .app-nav .nav-item .btn,
        .app-nav .nav-item .nav-link,
        .app-nav .btn-group {
          width: 100%;
          margin-left: 0 !important;
        }

        .app-nav .btn-group {
          display: flex;
        }

        .app-nav .btn-group .btn {
          flex: 1;
        }
      }

      @media (max-width: 576px) {
        .notification-center {
          left: 12px;
          right: 12px;
          width: auto;
          top: 70px;
        }

        .network-down-banner {
          left: 10px;
          right: 10px;
          bottom: 10px;
        }
      }
    </style>
  `,
  styles: []
})
export class AppComponent {
  private languageService = inject(LanguageService);
  notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  isNavOpen = false;
  showNotificationCenter = false;
  isNetworkDown = typeof navigator !== 'undefined' && !navigator.onLine;

  isLoggedIn$: Observable<boolean> = this.authService.user$.pipe(map(user => !!user));
  isAdmin$: Observable<boolean> = this.authService.user$.pipe(map(user => user?.role === 'admin'));
  isCaptain$: Observable<boolean> = this.authService.user$.pipe(map(user => user?.role === 'captain'));
  currentLanguage$: Observable<LanguageCode> = this.languageService.language$;
  currentTheme$: Observable<ThemeCode> = this.themeService.theme$;
  notifications$: Observable<AppNotification[]> = this.notificationService.notifications$;
  notificationCount$: Observable<number> = this.notifications$.pipe(map(notifs => notifs.length));

  t(key: string): string {
    return this.languageService.t(key);
  }

  toggleNav(): void {
    this.isNavOpen = !this.isNavOpen;
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

  logout(): void {
    this.authService.logout();
    this.notificationService.push('Logged out successfully.', 'info');
    this.router.navigate(['/home']);
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isNetworkDown = true;
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isNetworkDown = false;
  }
}
