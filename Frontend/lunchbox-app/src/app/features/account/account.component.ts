import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AppNotification, AppUser } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ══════════════ LOGGED IN ══════════════ -->
    <div class="profile-page" *ngIf="user$ | async as user; else noUser">

      <!-- Page title -->
      <div class="profile-page-header">
        <h2 class="profile-page-title">Profile</h2>
      </div>

      <!-- ── Top Info Card ── -->
      <div class="profile-info-card">
        <!-- User row -->
        <button class="profile-info-row" type="button">
          <div class="profile-avatar-wrap">
            <img class="profile-avatar" [src]="avatarUrl(user)" [alt]="user.displayName" />
          </div>
          <div class="profile-info-text">
            <div class="profile-info-name">{{ user.displayName }}</div>
            <div class="profile-info-sub">{{ user.mobile || user.email || user.username }}</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="profile-row-divider"></div>

        <!-- Rating row -->
        <a class="profile-info-row" routerLink="/activity">
          <div class="profile-star-icon">
            <svg viewBox="0 0 24 24" fill="#f59e0b" width="28" height="28"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z"/></svg>
          </div>
          <div class="profile-info-text">
            <div class="profile-info-name">{{ avgRating | number:'1.2-2' }} My Rating</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>

      <!-- ── Menu List ── -->
      <div class="profile-menu-card">

        <a class="profile-menu-row" routerLink="/activity">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Payment</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </a>

        <div class="profile-row-divider"></div>

        <a class="profile-menu-row" routerLink="/activity">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">My Rides</div>
            <div class="profile-menu-sub" *ngIf="totalRides > 0">{{ totalRides }} rides total</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </a>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button" disabled>
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Safety</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Refer and Earn</div>
            <div class="profile-menu-sub">Get ₹50</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">My Rewards</div>
            <div class="profile-menu-sub" *ngIf="rewardPoints > 0">{{ rewardPoints }} points earned</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M6 12h.01M18 12h.01"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Power Pass</div>
            <div class="profile-menu-sub" *ngIf="totalRides >= 20">{{ tierLabel }} Member</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">RouteX Coins</div>
            <div class="profile-menu-sub">{{ rewardPoints }} coins</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button" (click)="openNotifications()">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Notifications</div>
            <div class="profile-menu-sub" *ngIf="unreadCount > 0">{{ unreadCount }} unread</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="profile-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
            <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button" disabled>
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Claims</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="profile-row-divider"></div>

        <button class="profile-menu-row" type="button" disabled>
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Settings</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

      </div>

      <!-- ── Role-specific extras ── -->
      <div class="profile-menu-card" *ngIf="user.role === 'captain' || user.role === 'admin'">

        <a class="profile-menu-row" routerLink="/captain-profile" *ngIf="user.role === 'captain'">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Captain Dashboard</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </a>

        <div class="profile-row-divider" *ngIf="user.role === 'admin'"></div>

        <a class="profile-menu-row" routerLink="/admin" *ngIf="user.role === 'admin'">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Admin Panel</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </a>

      </div>

      <!-- ── Logout ── -->
      <div class="profile-menu-card">
        <button class="profile-menu-row profile-menu-logout" type="button" (click)="logout()">
          <span class="profile-menu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <div class="profile-menu-content">
            <div class="profile-menu-label">Logout</div>
          </div>
        </button>
      </div>

      <!-- ── Notifications Panel (slide-in) ── -->
      <div class="notif-panel-overlay" *ngIf="showNotifPanel" (click)="showNotifPanel = false"></div>
      <div class="notif-panel" [class.notif-panel-open]="showNotifPanel">
        <div class="notif-panel-header">
          <span class="notif-panel-title">Notifications</span>
          <button type="button" class="notif-panel-close" (click)="showNotifPanel = false">✕</button>
        </div>
        <div class="notif-panel-body">
          <div *ngIf="(notifications$ | async)?.length; else noNotifs">
            <div class="notif-panel-item" *ngFor="let n of notifications$ | async">
              <span class="notif-level-dot" [ngClass]="'lvl-' + n.level"></span>
              <div class="notif-item-body">
                <div class="notif-item-msg">{{ n.message }}</div>
                <div class="notif-item-time">{{ n.createdAt | date:'d MMM, h:mm a' }}</div>
              </div>
            </div>
          </div>
          <ng-template #noNotifs>
            <div class="notif-empty">No notifications</div>
          </ng-template>
        </div>
        <div class="notif-panel-footer">
          <button type="button" class="notif-clear-btn" (click)="clearNotifications()">Clear All</button>
        </div>
      </div>

    </div>

    <!-- ══════════════ NOT LOGGED IN ══════════════ -->
    <ng-template #noUser>
      <div class="profile-page">
        <div class="profile-page-header">
          <h2 class="profile-page-title">Profile</h2>
        </div>
        <div class="profile-nologin">
          <div class="profile-nologin-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" width="64" height="64"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          </div>
          <div class="profile-nologin-title">You're not logged in</div>
          <div class="profile-nologin-sub">Login to view your profile, rides, rewards and more.</div>
          <a class="profile-login-btn" routerLink="/login">Login to Account</a>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    /* ────────────── Page Shell ────────────── */
    .profile-page {
      min-height: 100vh;
      background: #f5f5f5;
      padding-bottom: 40px;
    }

    .profile-page-header {
      background: #fff;
      padding: 18px 20px 14px;
      border-bottom: 1px solid #ebebeb;
    }

    .profile-page-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #111;
      margin: 0;
    }

    /* ────────────── Info Card ────────────── */
    .profile-info-card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      margin: 16px 16px 10px;
      overflow: hidden;
    }

    .profile-info-row {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 16px 18px;
      background: none;
      border: none;
      text-align: left;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: background 0.12s ease;
    }
    .profile-info-row:hover { background: #fafafa; }

    .profile-avatar-wrap { flex-shrink: 0; }

    .profile-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      background: #e2e8f0;
    }

    .profile-star-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .profile-info-text { flex: 1; min-width: 0; }

    .profile-info-name {
      font-size: 0.97rem;
      font-weight: 700;
      color: #111;
      line-height: 1.3;
    }

    .profile-info-sub {
      font-size: 0.82rem;
      color: #888;
      margin-top: 2px;
    }

    .profile-chevron {
      width: 18px;
      height: 18px;
      color: #b0b0b0;
      flex-shrink: 0;
    }

    .profile-row-divider {
      height: 1px;
      background: #f0f0f0;
      margin: 0 18px;
    }

    /* ────────────── Menu Card ────────────── */
    .profile-menu-card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      margin: 0 16px 10px;
      overflow: hidden;
    }

    .profile-menu-row {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      padding: 15px 18px;
      background: none;
      border: none;
      text-align: left;
      cursor: pointer;
      text-decoration: none;
      color: #111;
      transition: background 0.12s ease;
    }
    .profile-menu-row:hover { background: #fafafa; }
    .profile-menu-row:disabled { cursor: default; opacity: 1; }
    .profile-menu-row:disabled:hover { background: none; }

    .profile-menu-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1.5px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #fff;
    }

    .profile-menu-icon svg {
      width: 18px;
      height: 18px;
      color: #444;
    }

    .profile-menu-content { flex: 1; min-width: 0; }

    .profile-menu-label {
      font-size: 0.93rem;
      font-weight: 600;
      color: #111;
    }

    .profile-menu-sub {
      font-size: 0.77rem;
      color: #888;
      margin-top: 1px;
    }

    .profile-menu-logout .profile-menu-label { color: #ef233c; }
    .profile-menu-logout .profile-menu-icon  { border-color: #fecdd3; }
    .profile-menu-logout .profile-menu-icon svg { color: #ef233c; }

    /* Notification badge */
    .profile-badge {
      background: #ef233c;
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      border-radius: 999px;
      padding: 1px 7px;
      min-width: 20px;
      text-align: center;
    }

    /* ────────────── Notification Panel ────────────── */
    .notif-panel-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.35);
      z-index: 400;
    }

    .notif-panel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-radius: 20px 20px 0 0;
      z-index: 401;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
    }
    .notif-panel-open { transform: translateY(0); }

    .notif-panel-header {
      display: flex;
      align-items: center;
      padding: 18px 20px 14px;
      border-bottom: 1px solid #f0f0f0;
    }

    .notif-panel-title {
      flex: 1;
      font-size: 1rem;
      font-weight: 700;
      color: #111;
    }

    .notif-panel-close {
      background: none;
      border: none;
      font-size: 16px;
      color: #888;
      cursor: pointer;
      padding: 4px;
    }

    .notif-panel-body {
      overflow-y: auto;
      flex: 1;
    }

    .notif-panel-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 13px 20px;
      border-bottom: 1px solid #f8f8f8;
    }
    .notif-panel-item:last-child { border-bottom: none; }

    .notif-level-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }
    .lvl-success { background: #22c55e; }
    .lvl-info    { background: #3b82f6; }
    .lvl-warning { background: #f59e0b; }
    .lvl-error   { background: #ef4444; }

    .notif-item-body { flex: 1; }

    .notif-item-msg {
      font-size: 0.84rem;
      color: #111;
      font-weight: 500;
      line-height: 1.4;
    }

    .notif-item-time {
      font-size: 0.72rem;
      color: #aaa;
      margin-top: 2px;
    }

    .notif-empty {
      padding: 28px 20px;
      text-align: center;
      font-size: 0.85rem;
      color: #aaa;
    }

    .notif-panel-footer {
      padding: 14px 20px;
      border-top: 1px solid #f0f0f0;
    }

    .notif-clear-btn {
      width: 100%;
      padding: 11px;
      background: #f5f5f5;
      border: none;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 700;
      color: #ef233c;
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .notif-clear-btn:hover { background: #fee2e2; }

    /* ────────────── Not Logged In ────────────── */
    .profile-nologin {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 60px 32px 40px;
    }

    .profile-nologin-icon { margin-bottom: 20px; }

    .profile-nologin-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #111;
      margin-bottom: 8px;
    }

    .profile-nologin-sub {
      font-size: 0.88rem;
      color: #888;
      margin-bottom: 28px;
      max-width: 260px;
    }

    .profile-login-btn {
      display: inline-block;
      background: #ef233c;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 14px;
      padding: 13px 36px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .profile-login-btn:hover { background: #c81d33; color: #fff; }

    /* ────────────── Mobile ────────────── */
    @media (max-width: 480px) {
      .profile-info-card,
      .profile-menu-card { margin-left: 12px; margin-right: 12px; }
      .profile-menu-label { font-size: 0.88rem; }
    }
  `]
})
export class AccountComponent implements OnInit, OnDestroy {
  readonly user$: Observable<AppUser | null>;
  readonly notifications$: Observable<AppNotification[]>;

  totalRides = 0;
  avgRating = 5;
  totalSpent = 0;
  rewardPoints = 0;
  cashRides = 0;
  cashSpent = 0;
  upiRides = 0;
  upiSpent = 0;
  paidRides = 0;
  pendingPayRides = 0;
  unreadCount = 0;
  showNotifPanel = false;

  get tierLabel(): string {
    if (this.totalRides >= 50) return 'Platinum';
    if (this.totalRides >= 20) return 'Gold';
    if (this.totalRides >= 5)  return 'Regular';
    return 'New';
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private bookingService: BookingService,
    private notificationService: NotificationService
  ) {
    this.user$ = this.auth.user$;
    this.notifications$ = this.notificationService.notificationCenter$;
  }

  ngOnInit(): void {
    this.bookingService.bookings$.pipe(takeUntil(this.destroy$)).subscribe((bookings) => {
      const user = this.auth.getCurrentUser();
      if (!user) return;

      const mine = bookings.filter((b) =>
        user.role === 'captain' ? b.captainId === user.id : b.userId === user.id
      );
      const completed = mine.filter((b) => b.status === 'completed');

      this.totalRides  = mine.length;
      this.totalSpent  = completed.reduce((sum, b) => sum + (b.finalAmount || 0), 0);
      this.paidRides   = completed.filter((b) => b.paymentDone).length;
      this.pendingPayRides = completed.filter((b) => !b.paymentDone).length;

      this.cashRides = mine.filter((b) => b.paymentMethod === 'cash').length;
      this.cashSpent = mine
        .filter((b) => b.paymentMethod === 'cash' && b.paymentDone)
        .reduce((sum, b) => sum + (b.finalAmount || 0), 0);

      this.upiRides = mine.filter((b) => b.paymentMethod === 'upi' || b.paymentMethod === 'card').length;
      this.upiSpent = mine
        .filter((b) => (b.paymentMethod === 'upi' || b.paymentMethod === 'card') && b.paymentDone)
        .reduce((sum, b) => sum + (b.finalAmount || 0), 0);

      const rated = completed.filter((b) => b.rideRating && b.rideRating > 0);
      this.avgRating = rated.length
        ? rated.reduce((sum, b) => sum + (b.rideRating ?? 0), 0) / rated.length
        : 5;

      this.rewardPoints = this.totalRides * 10 + Math.floor(this.totalSpent / 50);
    });

    this.notificationService.notificationCenter$.pipe(takeUntil(this.destroy$)).subscribe((notifs) => {
      this.unreadCount = notifs.filter((n) => !n.read).length;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openNotifications(): void {
    this.showNotifPanel = true;
  }

  clearNotifications(): void {
    this.notificationService.clearNotificationCenter();
    this.showNotifPanel = false;
  }

  avatarUrl(user: AppUser): string {
    if (user.profileImageUrl) return user.profileImageUrl;
    const name = encodeURIComponent(user.displayName || user.username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=2563eb&color=ffffff&size=160&bold=true`;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
