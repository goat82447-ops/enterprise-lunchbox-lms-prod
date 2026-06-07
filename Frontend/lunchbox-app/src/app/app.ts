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

    <nav class="bottom-tab-nav" aria-label="Primary">
      <a class="tab-item" routerLink="/home" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" [class.active]="isBottomTabActive('home')" aria-label="Home">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 10.5 12 4l8.5 6.5v8A1.5 1.5 0 0 1 19 20h-3.5v-5h-7v5H5a1.5 1.5 0 0 1-1.5-1.5v-8Z" />
          </svg>
          <span class="tab-label">Home</span>
        </span>
      </a>
      <a class="tab-item" [routerLink]="servicesTabRoute()" routerLinkActive="active" [class.active]="isBottomTabActive('services')" aria-label="Services">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
          </svg>
          <span class="tab-label">Services</span>
        </span>
      </a>
      <a class="tab-item" [routerLink]="activityTabRoute()" routerLinkActive="active" [class.active]="isBottomTabActive('activity')" aria-label="Activity">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
          </svg>
          <span class="tab-label">Activity</span>
        </span>
      </a>
      <a class="tab-item" [routerLink]="accountTabRoute()" routerLinkActive="active" [class.active]="isBottomTabActive('account')" aria-label="Account">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM4 20a8 8 0 0 1 16 0" />
          </svg>
          <span class="tab-label">Account</span>
        </span>
      </a>
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
        <div class="footer-copy">&copy; {{ currentYear }} RouteX. All rights reserved.</div>
      </div>
    </footer>

    <!-- RouteX Assistant -->
    <app-chatbot></app-chatbot>


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

  t(key: string): string {
    return this.languageService.t(key);
  }

  toggleNav(): void {
    this.isNavOpen = !this.isNavOpen;
  }

  handleNavLinkClick(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      this.isNavOpen = false;
    }
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
      return currentPath.startsWith('/services') || currentPath.startsWith('/school-booking');
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
}
