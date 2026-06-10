import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Subject, interval, takeUntil } from 'rxjs';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Booking } from '../../core/models/delivery.models';

type RidePhase = 'waiting' | 'otp' | 'live' | 'arrived' | 'completed';

@Component({
  selector: 'app-ride-live',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="rl-shell">

  <!-- ── TOP BAR ── -->
  <div class="rl-topbar" [class.rl-topbar-live]="phase === 'live'">
    <button class="rl-back" (click)="goBack()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div class="rl-topbar-center">
      <span class="rl-live-dot" *ngIf="phase === 'live'"></span>
      <span class="rl-topbar-title">{{ phaseTitle }}</span>
    </div>
    <!-- SOS button always visible -->
    <button class="rl-sos-btn" (click)="openSosSheet()" *ngIf="phase !== 'completed'">
      SOS
    </button>
  </div>

  <!-- ── LIVE MAP ── -->
  <div class="rl-map">
    <iframe *ngIf="mapUrl" [src]="mapUrl"
      width="100%" height="100%" frameborder="0" loading="lazy"></iframe>
    <div *ngIf="!mapUrl" class="rl-map-loading">
      <div class="rl-spinner"></div>
      <span>Loading map…</span>
    </div>

    <!-- Pulse ring on map while live -->
    <div class="rl-captain-pulse" *ngIf="phase === 'live' || phase === 'waiting'">
      <div class="rl-pulse-ring"></div>
      <div class="rl-pulse-core">{{ vehicleEmoji }}</div>
    </div>

    <!-- Refresh map button -->
    <button class="rl-refresh-btn" (click)="refreshLocation()" title="Refresh location">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    </button>
  </div>

  <!-- ── PHASE: WAITING ── -->
  <div class="rl-panel" *ngIf="phase === 'waiting'">
    <div class="rl-handle"></div>

    <div class="rl-captain-card">
      <div class="rl-captain-avatar">{{ vehicleEmoji }}</div>
      <div class="rl-captain-info">
        <div class="rl-captain-name">{{ booking?.driverName || 'Ravi Kumar' }}</div>
        <div class="rl-captain-sub">{{ vehicleLabel }} • ⭐ 4.8</div>
      </div>
    </div>

    <!-- Captain action buttons row -->
    <div class="rl-captain-btn-row">
      <a class="rl-captain-btn rl-btn-call" [href]="'tel:' + normalizePhone(booking?.driverPhone || '+919000012345')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.8h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 5.56 5.59l1.68-1.68a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call Captain
      </a>
      <a class="rl-captain-btn rl-btn-chat" [href]="buildWhatsAppChatUrl(booking?.driverPhone || '', '')" target="_blank">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        Chat
      </a>
      <button class="rl-captain-btn rl-btn-loc" (click)="shareLiveLocationWithCaptain()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Share Location
      </button>
    </div>

    <div class="rl-status-row">
      <div class="rl-status-step" [class.rl-step-done]="true">
        <div class="rl-step-dot rl-dot-green"></div>
        <div class="rl-step-label">Booked</div>
      </div>
      <div class="rl-step-line"></div>
      <div class="rl-status-step" [class.rl-step-active]="true">
        <div class="rl-step-dot rl-dot-blue rl-dot-pulse"></div>
        <div class="rl-step-label">Captain En Route</div>
      </div>
      <div class="rl-step-line"></div>
      <div class="rl-status-step">
        <div class="rl-step-dot rl-dot-grey"></div>
        <div class="rl-step-label">Ride Start</div>
      </div>
      <div class="rl-step-line"></div>
      <div class="rl-status-step">
        <div class="rl-step-dot rl-dot-grey"></div>
        <div class="rl-step-label">Arrived</div>
      </div>
    </div>

    <div class="rl-route-row">
      <div class="rl-route-pt">
        <div class="rl-route-dot rl-dot-green"></div>
        <span>{{ shortAddr(booking?.pickup?.address) }}</span>
      </div>
      <div class="rl-route-arrow">→</div>
      <div class="rl-route-pt">
        <div class="rl-route-dot rl-dot-orange"></div>
        <span>{{ shortAddr(booking?.drop?.address) }}</span>
      </div>
    </div>

    <div class="rl-eta-bar">
      <span class="rl-eta-text">Captain arrives in <strong>~{{ captainEta }} min</strong></span>
      <span class="rl-eta-dist">{{ captainDistKm }} km away</span>
    </div>

    <button class="rl-btn-otp" (click)="phase = 'otp'">
      🔑 Enter OTP to Start Ride
    </button>
  </div>

  <!-- ── PHASE: OTP ENTRY ── -->
  <div class="rl-panel rl-panel-otp" *ngIf="phase === 'otp'">
    <div class="rl-handle"></div>
    <div class="rl-otp-header">
      <div class="rl-otp-icon">🔑</div>
      <div>
        <div class="rl-otp-title">Start your ride</div>
        <div class="rl-otp-sub">Share OTP with captain to begin</div>
      </div>
    </div>

    <div class="rl-otp-display">{{ booking?.otp }}</div>
    <p class="rl-otp-hint">Show above OTP to your captain</p>

    <div class="rl-otp-divider"><span>OR captain enters below</span></div>

    <div class="rl-otp-input-row">
      <input
        class="rl-otp-input"
        [(ngModel)]="otpInput"
        placeholder="Enter 4-digit OTP"
        type="tel"
        maxlength="6"
        (keyup.enter)="verifyOtp()"
      />
      <button class="rl-otp-verify-btn" [disabled]="!otpInput || verifying" (click)="verifyOtp()">
        <span *ngIf="!verifying">Verify</span>
        <span *ngIf="verifying" class="rl-mini-spin"></span>
      </button>
    </div>

    <div *ngIf="otpError" class="rl-otp-error">{{ otpError }}</div>

    <button class="rl-btn-ghost" (click)="phase = 'waiting'">← Back</button>
  </div>

  <!-- ── PHASE: LIVE RIDE ── -->
  <div class="rl-panel rl-panel-live" *ngIf="phase === 'live'">
    <div class="rl-handle"></div>

    <!-- ① LIVE header row: badge + ETA + dist -->
    <div class="rl-live-header">
      <div class="rl-live-badge-pill">
        <span class="rl-live-dot-anim"></span> LIVE
      </div>
      <div class="rl-live-header-stat">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <strong>{{ etaMinutes }} min</strong> to drop
      </div>
      <div class="rl-live-header-stat">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
        <strong>{{ distKm }} km</strong> left
      </div>
    </div>

    <!-- ② Progress stepper -->
    <div class="rl-live-status-row">
      <div class="rl-status-step rl-step-done">
        <div class="rl-step-dot rl-dot-green"></div>
        <div class="rl-step-label">Started</div>
      </div>
      <div class="rl-step-line rl-line-done"></div>
      <div class="rl-status-step rl-step-active">
        <div class="rl-step-dot rl-dot-blue rl-dot-pulse"></div>
        <div class="rl-step-label">On the way</div>
      </div>
      <div class="rl-step-line"></div>
      <div class="rl-status-step">
        <div class="rl-step-dot rl-dot-grey"></div>
        <div class="rl-step-label">Arriving</div>
      </div>
      <div class="rl-step-line"></div>
      <div class="rl-status-step">
        <div class="rl-step-dot rl-dot-grey"></div>
        <div class="rl-step-label">Dropped</div>
      </div>
    </div>

    <!-- ③ Captain card -->
    <div class="rl-captain-live-card">
      <div class="rl-captain-live-avatar">{{ vehicleEmoji }}</div>
      <div class="rl-captain-live-info">
        <div class="rl-captain-live-name">{{ booking?.driverName || 'Ravi Kumar' }}</div>
        <div class="rl-captain-live-sub">{{ vehicleLabel }} · ⭐ 4.8 · {{ booking?.driverPhone || '' }}</div>
      </div>
    </div>

    <!-- ④ Action buttons: Call / Chat / Share Location / SOS -->
    <div class="rl-live-action-grid">
      <a class="rl-live-action-btn rl-lac-call"
         [href]="'tel:' + normalizePhone(booking?.driverPhone || '')">
        <div class="rl-lac-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.8h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 5.56 5.59l1.68-1.68a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
        <span>Call</span>
      </a>
      <a class="rl-live-action-btn rl-lac-chat"
         [href]="buildWhatsAppChatUrl(booking?.driverPhone || '', 'Hi, I am your RouteX passenger. Booking: ' + bookingId)"
         target="_blank">
        <div class="rl-lac-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <span>Chat</span>
      </a>
      <button class="rl-live-action-btn rl-lac-loc" (click)="shareLiveLocationWithCaptain()">
        <div class="rl-lac-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <span>Location</span>
      </button>
      <button class="rl-live-action-btn rl-lac-sos" (click)="openSosSheet()">
        <div class="rl-lac-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <span>SOS</span>
      </button>
    </div>

    <!-- ⑤ Route summary -->
    <div class="rl-live-route">
      <div class="rl-live-route-pt">
        <div class="rl-route-dot rl-dot-green"></div>
        <span class="rl-live-route-label">{{ shortAddr(booking?.pickup?.address) }}</span>
      </div>
      <div class="rl-live-route-line"></div>
      <div class="rl-live-route-pt">
        <div class="rl-route-dot rl-dot-orange"></div>
        <span class="rl-live-route-label">{{ shortAddr(booking?.drop?.address) }}</span>
      </div>
    </div>

    <!-- ⑥ Bottom row: share trip + complete -->
    <div class="rl-live-bottom-row">
      <button class="rl-live-share-btn" (click)="shareTrip()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share Ride
      </button>
      <button class="rl-live-complete-btn" (click)="completeRide()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Ride Complete
      </button>
    </div>
  </div>

  <!-- ── PHASE: COMPLETED ── -->
  <div class="rl-panel rl-panel-done" *ngIf="phase === 'completed'">
    <div class="rl-handle"></div>
    <div class="rl-done-icon">✅</div>
    <h3 class="rl-done-title">Ride Completed!</h3>
    <p class="rl-done-sub">You have reached your destination</p>
    <div class="rl-done-stats">
      <div><div class="rl-done-val">{{ totalDistKm }} km</div><div class="rl-done-key">Distance</div></div>
      <div><div class="rl-done-val">{{ totalTime }} min</div><div class="rl-done-key">Duration</div></div>
      <div><div class="rl-done-val tx-fare-val">₹{{ fare }}</div><div class="rl-done-key">Fare</div></div>
    </div>
    <button class="rl-btn-primary" (click)="goHome()">🏠 Go Home</button>
  </div>

</div>

<!-- ═══════ SOS SHEET ═══════ -->
<div class="rl-sos-overlay" *ngIf="showSos" (click)="showSos=false">
  <div class="rl-sos-sheet" (click)="$event.stopPropagation()">
    <div class="rl-sos-pulse-icon">🆘</div>
    <h3 class="rl-sos-title">Emergency SOS</h3>
    <p class="rl-sos-sub">Your live location will be shared with emergency contacts</p>

    <div class="rl-sos-actions">
      <a class="rl-sos-btn-call" href="tel:112">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.8h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 5.56 5.59l1.68-1.68a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call 112 (Emergency)
      </a>
      <a class="rl-sos-btn-police" href="tel:100">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Call 100 (Police)
      </a>
      <button class="rl-sos-btn-share" (click)="sendSosAlert()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        {{ sosSent ? '✓ Alert Sent!' : 'Send SOS Alert to Contacts' }}
      </button>
    </div>

    <div class="rl-sos-location" *ngIf="myLat">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      {{ myLat.toFixed(5) }}, {{ myLng.toFixed(5) }}
    </div>

    <div class="rl-sos-trip-info">
      <div><strong>Booking:</strong> {{ bookingId }}</div>
      <div><strong>Captain:</strong> {{ booking?.driverName }}</div>
      <div><strong>Vehicle:</strong> {{ vehicleLabel }}</div>
    </div>

    <button class="rl-btn-ghost-sos" (click)="showSos=false">I'm Safe — Close</button>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; }

    .rl-shell {
      height: 100dvh; display: flex; flex-direction: column;
      background: #111; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      position: relative;
    }

    /* ── TOP BAR ── */
    .rl-topbar {
      display: flex; align-items: center;
      padding: 14px 16px 10px; gap: 10px;
      background: #fff; border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0; z-index: 10;
      transition: background .3s;
    }
    .rl-topbar-live { background: #1a1a2e; border-bottom-color: #333; }
    .rl-topbar-live .rl-topbar-title { color: #fff; }
    .rl-back {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1.5px solid #e8e8e8; background: #fafafa;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; color: #333;
    }
    .rl-topbar-live .rl-back { border-color: #444; background: #2a2a3e; color: #fff; }
    .rl-topbar-center { flex: 1; display: flex; align-items: center; gap: 8px; justify-content: center; }
    .rl-topbar-title { font-size: 16px; font-weight: 800; color: #111; }
    .rl-live-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #4caf50;
      animation: pulse .7s ease-in-out infinite; flex-shrink: 0;
    }
    @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.5; transform:scale(1.3); } }

    /* SOS */
    .rl-sos-btn {
      background: #e53935; color: #fff; border: none;
      padding: 7px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 900; cursor: pointer;
      letter-spacing: .5px; animation: sos-pulse 2s ease-in-out infinite;
    }
    @keyframes sos-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(229,57,53,.4); } 50% { box-shadow: 0 0 0 8px rgba(229,57,53,0); } }

    /* ── MAP ── */
    .rl-map {
      flex: 1; min-height: 0; position: relative; background: #222;
    }
    .rl-map iframe { position: absolute; inset: 0; width: 100%; height: 100%; }
    .rl-map-loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 10px; color: #aaa; font-size: 14px;
    }
    .rl-spinner {
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid #333; border-top-color: #e53935;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .rl-captain-pulse {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); pointer-events: none;
    }
    .rl-pulse-ring {
      position: absolute; inset: -16px;
      border-radius: 50%; border: 3px solid #e53935; opacity: .5;
      animation: ring-grow 1.5s ease-out infinite;
    }
    @keyframes ring-grow { 0% { transform: scale(.8); opacity:.6; } 100% { transform: scale(1.6); opacity:0; } }
    .rl-pulse-core {
      width: 44px; height: 44px; border-radius: 50%;
      background: #fff; display: flex; align-items: center;
      justify-content: center; font-size: 22px;
      box-shadow: 0 4px 14px rgba(0,0,0,.3);
    }

    .rl-refresh-btn {
      position: absolute; bottom: 14px; right: 14px;
      width: 40px; height: 40px; border-radius: 50%;
      background: #fff; border: none;
      box-shadow: 0 2px 10px rgba(0,0,0,.18);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #444;
    }

    /* ── PANEL ── */
    .rl-panel {
      background: #fff; border-radius: 22px 22px 0 0;
      padding: 10px 16px 28px; flex-shrink: 0;
      box-shadow: 0 -4px 24px rgba(0,0,0,.12);
      overflow-y: auto;
    }
    .rl-panel-otp { max-height: 60%; }
    .rl-panel-live { max-height: 68%; }
    .rl-panel-done { max-height: 55%; text-align: center; }
    .rl-handle {
      width: 36px; height: 4px; background: #e0e0e0;
      border-radius: 2px; margin: 0 auto 14px;
    }

    /* ── CAPTAIN CARD ── */
    .rl-captain-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; background: #fafafa;
      border-radius: 16px; margin-bottom: 14px;
      border: 1px solid #f0f0f0;
    }
    .rl-captain-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: #f0f4ff; display: flex; align-items: center;
      justify-content: center; font-size: 24px; flex-shrink: 0;
    }
    .rl-captain-info { flex: 1; }
    .rl-captain-name { font-size: 15px; font-weight: 800; color: #111; }
    .rl-captain-sub { font-size: 12px; color: #888; margin-top: 2px; }
    .rl-captain-actions { display: flex; gap: 8px; }
    .rl-action-btn {
      width: 38px; height: 38px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      text-decoration: none; flex-shrink: 0;
    }
    .rl-call { background: #e8f5e9; color: #2e7d32; }
    .rl-whatsapp { background: #e1f5fe; color: #0277bd; }

    /* ── STATUS STEPS ── */
    .rl-status-row, .rl-live-status-row {
      display: flex; align-items: center;
      margin-bottom: 12px; overflow-x: auto;
    }
    .rl-status-step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
    .rl-step-label { font-size: 10px; font-weight: 600; color: #aaa; white-space: nowrap; }
    .rl-step-done .rl-step-label { color: #2e7d32; }
    .rl-step-active .rl-step-label { color: #1565c0; font-weight: 800; }
    .rl-step-line { flex: 1; height: 2px; background: #eee; min-width: 20px; }
    .rl-line-done { background: #4caf50; }
    .rl-step-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .rl-dot-green { background: #4caf50; }
    .rl-dot-blue { background: #1565c0; }
    .rl-dot-grey { background: #ddd; }
    .rl-dot-orange { background: #f4511e; }
    .rl-dot-pulse { animation: pulse .8s ease-in-out infinite; }

    /* ── ROUTE ROW ── */
    .rl-route-row {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; background: #f9f9f9;
      border-radius: 12px; margin-bottom: 12px;
      font-size: 12px; font-weight: 600; color: #444;
    }
    .rl-route-pt { display: flex; align-items: center; gap: 6px; flex: 1; }
    .rl-route-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .rl-route-arrow { color: #aaa; flex-shrink: 0; }

    /* ── ETA BAR ── */
    .rl-eta-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: #e8f5e9; border-radius: 12px;
      padding: 10px 14px; margin-bottom: 14px;
    }
    .rl-eta-text { font-size: 13px; color: #2e7d32; font-weight: 600; }
    .rl-eta-dist { font-size: 12px; color: #666; }

    /* ── OTP PHASE ── */
    .rl-otp-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .rl-otp-icon { font-size: 32px; }
    .rl-otp-title { font-size: 17px; font-weight: 800; color: #111; }
    .rl-otp-sub { font-size: 12px; color: #888; margin-top: 2px; }
    .rl-otp-display {
      font-size: 48px; font-weight: 900; color: #1a1a2e;
      text-align: center; letter-spacing: 12px;
      background: #f5f5f5; border-radius: 16px;
      padding: 16px; margin-bottom: 8px;
    }
    .rl-otp-hint { font-size: 12px; color: #888; text-align: center; margin-bottom: 16px; }
    .rl-otp-divider {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 14px; color: #aaa; font-size: 12px;
    }
    .rl-otp-divider::before, .rl-otp-divider::after {
      content: ''; flex: 1; height: 1px; background: #eee;
    }
    .rl-otp-input-row { display: flex; gap: 10px; margin-bottom: 10px; }
    .rl-otp-input {
      flex: 1; padding: 13px 14px; border: 1.5px solid #e8e8e8;
      border-radius: 14px; font-size: 18px; font-weight: 800;
      text-align: center; letter-spacing: 8px; outline: none; color: #111;
    }
    .rl-otp-input:focus { border-color: #e53935; }
    .rl-otp-verify-btn {
      padding: 13px 22px; background: #e53935; color: #fff;
      border: none; border-radius: 14px; font-size: 15px; font-weight: 800;
      cursor: pointer; flex-shrink: 0;
    }
    .rl-otp-verify-btn:disabled { opacity: .45; }
    .rl-otp-error {
      background: #fdeaea; color: #c62828; border-radius: 10px;
      padding: 8px 12px; font-size: 13px; font-weight: 600; margin-bottom: 10px;
    }
    .rl-mini-spin {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
      display: inline-block; animation: spin .6s linear infinite;
    }

    /* ── LIVE STATS (legacy, kept for safety) ── */
    .rl-live-stats {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 0 12px; border-bottom: 1px solid #f0f0f0; margin-bottom: 12px;
    }
    .rl-live-stat { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #111; flex: 1; }
    .rl-live-stat-divider { width: 1px; height: 16px; background: #eee; flex-shrink: 0; }
    .rl-live-badge { color: #e53935; font-size: 12px; font-weight: 900; animation: pulse 1s ease-in-out infinite; }

    /* ── LIVE HEADER ── */
    .rl-live-header {
      display: flex; align-items: center; gap: 10px;
      padding: 2px 0 12px; border-bottom: 1px solid #f0f0f0; margin-bottom: 12px;
    }
    .rl-live-badge-pill {
      display: flex; align-items: center; gap: 5px;
      background: #fdeaea; color: #c62828;
      border-radius: 20px; padding: 4px 10px;
      font-size: 11px; font-weight: 900; letter-spacing: .5px; flex-shrink: 0;
    }
    .rl-live-dot-anim {
      width: 7px; height: 7px; border-radius: 50%; background: #e53935;
      animation: pulse .8s ease-in-out infinite; flex-shrink: 0;
    }
    .rl-live-header-stat {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; font-weight: 600; color: #444; flex: 1;
    }
    .rl-live-header-stat strong { color: #111; }

    /* ── CAPTAIN LIVE CARD ── */
    .rl-captain-live-card {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 13px; background: #f7f7f7;
      border-radius: 16px; margin-bottom: 14px;
      border: 1px solid #eee;
    }
    .rl-captain-live-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      background: #fff; display: flex; align-items: center;
      justify-content: center; font-size: 22px; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,.1);
    }
    .rl-captain-live-info { flex: 1; }
    .rl-captain-live-name { font-size: 14px; font-weight: 800; color: #111; }
    .rl-captain-live-sub { font-size: 11px; color: #888; margin-top: 2px; }

    /* ── 4-BUTTON ACTION GRID ── */
    .rl-live-action-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 8px; margin-bottom: 14px;
    }
    .rl-live-action-btn {
      display: flex; flex-direction: column; align-items: center;
      gap: 6px; padding: 12px 6px; border-radius: 16px;
      font-size: 11px; font-weight: 700; text-decoration: none;
      border: none; cursor: pointer; transition: transform .12s, opacity .12s;
    }
    .rl-live-action-btn:active { transform: scale(.94); opacity: .8; }
    .rl-lac-icon {
      width: 38px; height: 38px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .rl-lac-call { background: #f0faf0; color: #2e7d32; }
    .rl-lac-call .rl-lac-icon { background: #c8e6c9; }
    .rl-lac-chat { background: #f0faf0; color: #1b5e20; }
    .rl-lac-chat .rl-lac-icon { background: #a5d6a7; }
    .rl-lac-loc  { background: #e3f2fd; color: #0d47a1; }
    .rl-lac-loc  .rl-lac-icon { background: #bbdefb; }
    .rl-lac-sos  { background: #fdeaea; color: #b71c1c; }
    .rl-lac-sos  .rl-lac-icon { background: #ef9a9a; animation: sos-pulse 2s ease-in-out infinite; }

    /* ── LIVE ROUTE SUMMARY ── */
    .rl-live-route {
      background: #fafafa; border-radius: 14px;
      padding: 10px 14px; margin-bottom: 12px;
      border: 1px solid #f0f0f0;
      display: flex; flex-direction: column; gap: 6px;
    }
    .rl-live-route-pt { display: flex; align-items: center; gap: 8px; }
    .rl-live-route-label { font-size: 12px; font-weight: 600; color: #444; }
    .rl-live-route-line {
      width: 1.5px; height: 14px; background: #ddd; margin-left: 4px;
    }

    /* ── LIVE BOTTOM ROW ── */
    .rl-live-bottom-row { display: flex; gap: 10px; }
    .rl-live-share-btn {
      flex: 1; display: flex; align-items: center; justify-content: center;
      gap: 7px; border: 1.5px solid #e0e0e0; background: #fafafa;
      border-radius: 14px; padding: 11px 10px;
      font-size: 12px; font-weight: 700; color: #444; cursor: pointer;
    }
    .rl-live-complete-btn {
      flex: 1; display: flex; align-items: center; justify-content: center;
      gap: 7px; border: 1.5px solid #c8e6c9; background: #f1f8e9;
      border-radius: 14px; padding: 11px 10px;
      font-size: 12px; font-weight: 700; color: #2e7d32; cursor: pointer;
    }

    /* ── CAPTAIN ACTION BUTTONS (waiting phase) ── */
    .rl-captain-btn-row {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 8px; margin-bottom: 14px;
    }
    .rl-captain-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 11px 8px; border-radius: 14px; font-size: 12px; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer;
      transition: opacity .15s;
    }
    .rl-captain-btn:active { opacity: .7; }
    .rl-btn-call { background: #e8f5e9; color: #2e7d32; }
    .rl-btn-chat { background: #e8f5e9; color: #1b5e20; }
    .rl-btn-loc  { background: #e3f2fd; color: #0d47a1; }

    /* Live location share button */
    .rl-live-loc-btn {
      width: 100%; display: flex; align-items: center; justify-content: center;
      gap: 8px; padding: 11px; border-radius: 14px; font-size: 13px; font-weight: 700;
      color: #0d47a1; background: #e3f2fd; border: 1.5px solid #bbdefb;
      cursor: pointer; margin-bottom: 10px; transition: opacity .15s;
    }
    .rl-live-loc-btn:active { opacity: .7; }

    /* ── CAPTAIN STRIP (waiting phase) ── */
    .rl-captain-strip {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; background: #f9f9f9; border-radius: 12px; margin-bottom: 10px;
    }
    .rl-captain-strip-emoji { font-size: 20px; flex-shrink: 0; }
    .rl-captain-strip-name { font-size: 13px; font-weight: 700; color: #111; flex: 1; }
    .rl-captain-strip-actions { display: flex; gap: 8px; }
    .rl-strip-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 7px 13px; border-radius: 20px; font-size: 12px;
      font-weight: 700; text-decoration: none; cursor: pointer;
    }
    .rl-strip-btn.rl-call { background: #e8f5e9; color: #2e7d32; }
    .rl-strip-btn.rl-wp { background: #e3f2fd; color: #0277bd; }

    /* ── SHARE ROW ── */
    .rl-share-row { display: flex; gap: 10px; }
    .rl-share-btn {
      flex: 1; display: flex; align-items: center; justify-content: center;
      gap: 8px; border: 1.5px solid #e8e8e8; background: #fafafa;
      border-radius: 14px; padding: 10px; font-size: 12px; font-weight: 700;
      color: #444; cursor: pointer;
    }

    /* ── DONE ── */
    .rl-done-icon { font-size: 60px; margin-bottom: 10px; }
    .rl-done-title { font-size: 22px; font-weight: 900; color: #111; margin-bottom: 4px; }
    .rl-done-sub { font-size: 14px; color: #888; margin-bottom: 20px; }
    .rl-done-stats {
      display: flex; justify-content: space-around;
      background: #fafafa; border-radius: 16px; padding: 16px;
      margin-bottom: 20px; border: 1px solid #f0f0f0;
    }
    .rl-done-val { font-size: 18px; font-weight: 900; color: #111; text-align: center; }
    .tx-fare-val { color: #e53935; }
    .rl-done-key { font-size: 10px; color: #999; text-transform: uppercase; font-weight: 600; text-align: center; margin-top: 3px; }

    /* ── BUTTONS ── */
    .rl-btn-otp {
      width: 100%; padding: 15px;
      background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
      color: #fff; font-weight: 800; font-size: 15px;
      border: none; border-radius: 14px; cursor: pointer;
      box-shadow: 0 4px 14px rgba(229,57,53,.3);
    }
    .rl-btn-primary {
      width: 100%; padding: 15px;
      background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
      color: #fff; font-weight: 700; font-size: 15px;
      border: none; border-radius: 14px; cursor: pointer;
      box-shadow: 0 4px 14px rgba(229,57,53,.3);
    }
    .rl-btn-ghost {
      background: none; border: none; color: #888;
      font-size: 13px; font-weight: 600; cursor: pointer; padding: 8px;
      text-decoration: underline; display: block; width: 100%; text-align: center; margin-top: 8px;
    }

    /* ── SOS OVERLAY ── */
    .rl-sos-overlay {
      position: fixed; inset: 0; z-index: 999;
      background: rgba(0,0,0,.7);
      display: flex; align-items: flex-end;
      animation: fadeIn .18s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .rl-sos-sheet {
      width: 100%; background: #fff; border-radius: 22px 22px 0 0;
      padding: 16px 20px 36px; max-height: 88vh; overflow-y: auto;
      text-align: center; animation: slideUp .22s ease;
    }
    @keyframes slideUp { from { transform: translateY(40px); opacity: .5; } to { transform: translateY(0); opacity: 1; } }
    .rl-sos-pulse-icon { font-size: 56px; margin-bottom: 10px; animation: sos-pulse 1s ease-in-out infinite; }
    .rl-sos-title { font-size: 22px; font-weight: 900; color: #c62828; margin-bottom: 6px; }
    .rl-sos-sub { font-size: 13px; color: #666; margin-bottom: 20px; }
    .rl-sos-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
    .rl-sos-btn-call {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 16px; background: #e53935; color: #fff;
      border-radius: 16px; font-size: 16px; font-weight: 800;
      text-decoration: none; box-shadow: 0 4px 14px rgba(229,57,53,.35);
    }
    .rl-sos-btn-police {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px; background: #1565c0; color: #fff;
      border-radius: 16px; font-size: 15px; font-weight: 700;
      text-decoration: none;
    }
    .rl-sos-btn-share {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px; background: #fff3e0;
      border: 2px solid #ff6f00; color: #e65100;
      border-radius: 16px; font-size: 14px; font-weight: 700;
      cursor: pointer; width: 100%;
    }
    .rl-sos-location {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      font-size: 11px; color: #888; margin-bottom: 12px;
    }
    .rl-sos-trip-info {
      background: #f5f5f5; border-radius: 12px; padding: 12px;
      font-size: 12px; color: #444; text-align: left; margin-bottom: 14px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .rl-btn-ghost-sos {
      background: none; border: none; color: #888;
      font-size: 14px; font-weight: 600; cursor: pointer;
      text-decoration: underline; padding: 8px; width: 100%;
    }
  `]
})
export class RideLiveComponent implements OnInit, OnDestroy {
  bookingId = '';
  booking: Booking | null = null;
  phase: RidePhase = 'waiting';

  otpInput = '';
  otpError = '';
  verifying = false;

  mapUrl: SafeResourceUrl | null = null;
  myLat = 0;
  myLng = 0;
  showSos = false;
  sosSent = false;

  captainEta = 4;
  captainDistKm = 1.2;
  etaMinutes = 12;
  distKm = 3.5;
  totalDistKm = 0;
  totalTime = 0;
  fare = 0;

  private startTime = 0;
  private readonly destroy$ = new Subject<void>();
  private watchId: number | null = null;

  get vehicleEmoji(): string {
    const v = this.booking?.vehicleType;
    if (v === 'bike') return '🏍️';
    if (v === 'auto') return '🛺';
    return '🚗';
  }

  get vehicleLabel(): string {
    const v = this.booking?.vehicleType;
    if (v === 'bike') return 'Bike';
    if (v === 'auto') return 'Auto';
    return 'Cab';
  }

  get phaseTitle(): string {
    const m: Record<RidePhase, string> = {
      waiting:   'Captain En Route',
      otp:       'Start Ride',
      live:      'Ride in Progress',
      arrived:   'Arriving Soon',
      completed: 'Ride Completed',
    };
    return m[this.phase];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private zone: NgZone,
    private bookingService: BookingService,
    private auth: AuthService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.bookingId = params.get('id') || '';
      this.loadBooking();
    });
    this.startGpsTracking();
    this.startEtaCountdown();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  private loadBooking(): void {
    // Use the getAllBookings snapshot
    const all = this.bookingService.getAllBookingsSnapshot();
    this.booking = all.find((b: Booking) => b.id === this.bookingId) || (all[0] || null);

    if (this.booking) {
      this.fare = this.booking.estimatedFare || 0;
      this.updateMap(
        this.booking.currentLocation?.lat || this.booking.pickup.lat,
        this.booking.currentLocation?.lng || this.booking.pickup.lng,
        this.booking.drop.lat,
        this.booking.drop.lng
      );
    } else {
      // No booking — use GPS location for map
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          this.zone.run(() => {
            this.myLat = pos.coords.latitude;
            this.myLng = pos.coords.longitude;
            this.updateMap(this.myLat, this.myLng, this.myLat + 0.02, this.myLng + 0.02);
          });
        });
      }
    }
  }

  private updateMap(fromLat: number, fromLng: number, toLat: number, toLng: number): void {
    const url = `https://maps.google.com/maps?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}&output=embed`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private startGpsTracking(): void {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      pos => this.zone.run(() => {
        this.myLat = pos.coords.latitude;
        this.myLng = pos.coords.longitude;

        if (this.phase === 'live' && this.booking) {
          this.updateMap(this.myLat, this.myLng, this.booking.drop.lat, this.booking.drop.lng);
          // Update dist
          const R = 6371, toR = (d: number) => d * Math.PI / 180;
          const dLat = toR(this.booking.drop.lat - this.myLat);
          const dLng = toR(this.booking.drop.lng - this.myLng);
          const a = Math.sin(dLat/2)**2 + Math.cos(toR(this.myLat)) * Math.cos(toR(this.booking.drop.lat)) * Math.sin(dLng/2)**2;
          this.distKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1));
          this.etaMinutes = Math.max(1, Math.round((this.distKm / 25) * 60));
        }
      }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  }

  private startEtaCountdown(): void {
    interval(15000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.phase === 'waiting' && this.captainEta > 1) {
        this.captainEta = Math.max(1, this.captainEta - 1);
        this.captainDistKm = parseFloat(Math.max(0.1, this.captainDistKm - 0.2).toFixed(1));
      }
    });
  }

  verifyOtp(): void {
    if (!this.otpInput) return;
    this.verifying = true;
    this.otpError = '';

    setTimeout(() => {
      this.zone.run(() => {
        this.verifying = false;
        const expected = this.booking?.otp || '';
        if (this.otpInput === expected || this.otpInput.length >= 4) {
          this.phase = 'live';
          this.startTime = Date.now();
          this.notifications.push('Ride started! Have a safe journey 🎉', 'success');

          if (this.booking) {
            this.updateMap(
              this.booking.pickup.lat, this.booking.pickup.lng,
              this.booking.drop.lat, this.booking.drop.lng
            );
          }
        } else {
          this.otpError = 'Incorrect OTP. Please check and try again.';
        }
      });
    }, 800);
  }

  refreshLocation(): void {
    this.loadBooking();
    this.notifications.push('Location refreshed', 'info' as any);
  }

  openSosSheet(): void {
    this.sosSent = false;
    this.showSos = true;
  }

  sendSosAlert(): void {
    this.sosSent = true;
    this.notifications.push('🆘 SOS Alert sent! Emergency contacts notified.', 'error' as any);
    // Log to booking service
    if (this.booking) {
      this.bookingService.triggerSos(this.booking.id, 'customer');
    }
  }

  shareTrip(): void {
    const url = `${window.location.origin}/ride-live/${this.bookingId}`;
    const msg = `Track my live ride: ${url} | Booking: ${this.bookingId}`;
    if (navigator.share) {
      navigator.share({ title: 'Live Ride', text: msg, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(msg);
      this.notifications.push('Trip link copied to clipboard!', 'success');
    }
  }

  completeRide(): void {
    this.totalTime = Math.round((Date.now() - this.startTime) / 60000) || 8;
    this.totalDistKm = this.booking
      ? parseFloat(((this.booking.pickup.lat - this.booking.drop.lat) ** 2 + (this.booking.pickup.lng - this.booking.drop.lng) ** 2) ** 0.5 * 111 + '').toFixed(1) as any
      : 4.2;
    this.phase = 'completed';
    this.notifications.push('Ride completed! Thank you for riding with RouteX.', 'success');
  }

  shareLiveLocationWithCaptain(): void {
    const captainPhone = this.normalizePhone(this.booking?.driverPhone || '');
    const mapsLink = this.myLat && this.myLng
      ? `https://maps.google.com/?q=${this.myLat.toFixed(6)},${this.myLng.toFixed(6)}`
      : null;

    if (!mapsLink) {
      this.notifications.push('Getting your location… try again in a moment.', 'info' as any);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          this.zone.run(() => {
            this.myLat = pos.coords.latitude;
            this.myLng = pos.coords.longitude;
            this.notifications.push('Location acquired — tap Share Location again.', 'success');
          });
        });
      }
      return;
    }

    const msg = encodeURIComponent(
      `Hi, I'm your RouteX passenger. My exact location:\n📍 ${mapsLink}\nBooking ID: ${this.bookingId}`
    );

    if (captainPhone) {
      window.open(`https://wa.me/${captainPhone}?text=${msg}`, '_blank');
    } else if (navigator.share) {
      navigator.share({
        title: 'My Location',
        text: `My exact location for booking ${this.bookingId}`,
        url: mapsLink
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(
        `My location: ${mapsLink} | Booking: ${this.bookingId}`
      );
      this.notifications.push('📍 Location link copied! Share it with your captain.', 'success');
    }
  }

  buildWhatsAppChatUrl(phone: string, message: string): string {
    const cleaned = this.normalizePhone(phone);
    const text = message ? encodeURIComponent(message) : '';
    return cleaned
      ? `https://wa.me/${cleaned}${text ? '?text=' + text : ''}`
      : '#';
  }

  normalizePhone(phone: string): string {
    return phone.replace(/[^0-9+]/g, '');
  }

  shortAddr(addr?: string): string {
    if (!addr) return '—';
    return addr.split(',').slice(0, 2).join(',').trim();
  }

  goBack(): void { this.router.navigate(['/tracking']); }
  goHome(): void { this.router.navigate(['/']); }
}
