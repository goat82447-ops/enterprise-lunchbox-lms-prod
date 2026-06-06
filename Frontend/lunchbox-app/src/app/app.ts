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
          <span class="brand-logo" aria-hidden="true">EK</span>
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
              <a class="nav-link" routerLink="/home" routerLinkActive="active">Home</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/services" routerLinkActive="active">Services</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/activity" routerLinkActive="active">Activity</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && !(isAdmin$ | async) && !(isCaptain$ | async)">
              <a class="nav-link" routerLink="/account" routerLinkActive="active">Account</a>
            </li>

            <!-- Captain links -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isCaptain$ | async)">
              <a class="nav-link" routerLink="/captain-profile" routerLinkActive="active">{{ t('jobsDeliveries') }}</a>
            </li>

            <!-- Admin links -->
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async)">
              <a class="nav-link" routerLink="/booking" routerLinkActive="active">{{ t('bookDelivery') }}</a>
            </li>
            <li class="nav-item" *ngIf="(isLoggedIn$ | async) && (isAdmin$ | async) && showTrackBookingLink">
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
      <a class="tab-item" routerLink="/home" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" aria-label="Home">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 10.5 12 4l8.5 6.5v8A1.5 1.5 0 0 1 19 20h-3.5v-5h-7v5H5a1.5 1.5 0 0 1-1.5-1.5v-8Z" />
          </svg>
          <span class="tab-label">Home</span>
        </span>
      </a>
      <a class="tab-item" [routerLink]="servicesTabRoute()" routerLinkActive="active" aria-label="Services">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
          </svg>
          <span class="tab-label">Services</span>
        </span>
      </a>
      <a class="tab-item" [routerLink]="activityTabRoute()" routerLinkActive="active" aria-label="Activity">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
          </svg>
          <span class="tab-label">Activity</span>
        </span>
      </a>
      <a class="tab-item" [routerLink]="accountTabRoute()" routerLinkActive="active" aria-label="Account">
        <span class="tab-pill">
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM4 20a8 8 0 0 1 16 0" />
          </svg>
          <span class="tab-label">Account</span>
        </span>
      </a>
    </nav>

    <!-- Chatbot -->
    <app-chatbot></app-chatbot>

    <style>
      .app-nav {
        background: var(--nav-bg);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .app-main {
        min-height: calc(100vh - 64px);
      }

      .bottom-tab-nav {
        position: fixed;
        left: 14px;
        right: 14px;
        bottom: 12px;
        z-index: 1250;
        display: none;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        align-items: stretch;
        gap: 4px;
        border-radius: 28px;
        border: 1px solid var(--border-color);
        background: color-mix(in srgb, var(--surface) 95%, #000 5%);
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.34);
        backdrop-filter: blur(10px);
        padding: 6px;
      }

      .tab-item {
        border-radius: 24px;
        color: var(--text-secondary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        text-decoration: none;
        transition: all 0.26s ease;
      }

      .tab-pill {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        border-radius: 22px;
        padding: 8px 4px;
        transition: background 0.26s ease, transform 0.26s ease;
      }

      .tab-icon {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .tab-label {
        font-size: 0.76rem;
        font-weight: 650;
        letter-spacing: 0.02em;
      }

      .tab-item.active {
        color: #ffffff !important;
      }

      .tab-item.active .tab-pill {
        background: linear-gradient(180deg, #2b2f37 0%, #1f232a 100%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 8px 20px rgba(0, 0, 0, 0.26);
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

      .toast-viewport {
        position: fixed;
        top: 76px;
        right: 16px;
        z-index: 1200;
        width: min(360px, calc(100vw - 20px));
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }

      .toast-card {
        pointer-events: auto;
        display: grid;
        grid-template-columns: 30px 1fr auto;
        gap: 10px;
        align-items: start;
        background: var(--surface);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-left-width: 4px;
        border-radius: 12px;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14);
        padding: 10px 12px;
        animation: toastSlideIn 220ms ease-out;
      }

      .toast-info {
        border-left-color: #0d6efd;
      }

      .toast-success {
        border-left-color: #198754;
      }

      .toast-warning {
        border-left-color: #fd7e14;
      }

      .toast-error {
        border-left-color: #dc3545;
      }

      .toast-icon {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--nav-chip-bg);
        font-size: 0.9rem;
      }

      .toast-content {
        min-width: 0;
      }

      .toast-title {
        font-size: 0.86rem;
        font-weight: 700;
        line-height: 1.1;
        margin-bottom: 4px;
      }

      .toast-message {
        font-size: 0.82rem;
        line-height: 1.35;
        word-break: break-word;
        opacity: 0.95;
      }

      .toast-close {
        border: 0;
        background: transparent;
        color: inherit;
        opacity: 0.7;
        font-size: 1.05rem;
        line-height: 1;
        padding: 2px 4px;
        cursor: pointer;
      }

      .toast-close:hover {
        opacity: 1;
      }

      /* ── Profile chip ───────────────────────────────────────── */
      .profile-chip {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 4px 4px;
        border-radius: 999px;
        border: 1px solid var(--nav-border);
        background: var(--nav-chip-bg);
        cursor: pointer;
        user-select: none;
        transition: background 0.2s;
      }

      .profile-chip:hover, .profile-chip.open {
        background: var(--nav-hover-bg);
      }

      .profile-chip-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        border: 2px solid var(--nav-border);
      }

      .profile-chip-text {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }

      .profile-chip-name {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--nav-text);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .profile-chip-role {
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .profile-chip-role[data-role='admin']   { color: #f59e0b; }
      .profile-chip-role[data-role='captain'] { color: #22c55e; }
      .profile-chip-role[data-role='customer']{ color: #38bdf8; }

      .profile-chip-caret {
        font-size: 0.7rem;
        color: var(--nav-text);
        opacity: 0.7;
      }

      /* ── Profile dropdown ─────────────────────────────────────── */
      .profile-dropdown {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        min-width: 240px;
        background: var(--surface);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.18);
        z-index: 1100;
        overflow: hidden;
        animation: profileDropIn 160ms ease-out;
      }

      @keyframes profileDropIn {
        from { opacity:0; transform:translateY(-6px); }
        to   { opacity:1; transform:translateY(0); }
      }

      .profile-dropdown-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
      }

      .profile-dropdown-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--border-color);
        flex-shrink: 0;
      }

      .profile-dropdown-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .profile-dropdown-name {
        font-weight: 700;
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .profile-dropdown-role-badge {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .profile-dropdown-role-badge[data-role='admin']    { background:#fef3c7; color:#92400e; }
      .profile-dropdown-role-badge[data-role='captain']  { background:#dcfce7; color:#166534; }
      .profile-dropdown-role-badge[data-role='customer'] { background:#e0f2fe; color:#075985; }

      .profile-dropdown-divider {
        height: 1px;
        background: var(--border-color);
        margin: 0 16px;
      }

      .profile-dropdown-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        font-size: 0.84rem;
      }

      .pdr-icon { font-size: 1rem; flex-shrink: 0; }
      .pdr-val  { opacity: 0.85; word-break: break-all; }

      .profile-dropdown-logout {
        width: 100%;
        background: transparent;
        border: 0;
        color: #ef4444;
        font-size: 0.84rem;
        font-weight: 600;
        padding: 12px 16px;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s;
      }

      .profile-dropdown-logout:hover {
        background: rgba(239,68,68,0.08);
      }

      @keyframes toastSlideIn {
        from {
          transform: translateY(-8px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @media (max-width: 991.98px) {
        .app-nav .navbar-brand {
          font-size: 1rem;
        }

        .app-nav .navbar-collapse {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--nav-border);
          max-height: calc(100vh - 90px);
          overflow-y: auto;
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

        .profile-chip {
          width: 100%;
          justify-content: flex-start;
          margin-left: 0 !important;
        }
      }

      @media (max-width: 576px) {
        .notification-center {
          left: 12px;
          right: 12px;
          width: auto;
          top: 62px;
        }

        .toast-viewport {
          left: 10px;
          right: 10px;
          width: auto;
          top: 64px;
        }

        .network-down-banner {
          left: 10px;
          right: 10px;
          bottom: 84px;
        }
      }

      @media (max-width: 991.98px) {
        .bottom-tab-nav {
          display: grid;
        }

        .app-main {
          padding-bottom: 88px;
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
