import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Booking } from '../../../core/models/delivery.models';
import { CaptainRideAlertService } from '../../../core/services/captain-ride-alert.service';

@Component({
  selector: 'app-captain-ride-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cp-alert-overlay" *ngIf="incomingRide" (click)="$event.stopPropagation()">
      <div class="cp-alert-sheet">
        <!-- Pulse ring -->
        <div class="cp-alert-pulse-wrap">
          <div class="cp-alert-pulse-ring"></div>
          <div class="cp-alert-pulse-ring cp-ring2"></div>
          <div class="cp-alert-icon">🏍️</div>
        </div>

        <div class="cp-alert-badge">NEW RIDE REQUEST</div>
        <h2 class="cp-alert-title">Incoming Ride!</h2>

        <!-- Route -->
        <div class="cp-alert-route">
          <div class="cp-alert-point">
            <div class="cp-point-dot cp-dot-green"></div>
            <div class="cp-point-addr">{{ incomingRide.pickup.address | slice:0:45 }}</div>
          </div>
          <div class="cp-alert-line"></div>
          <div class="cp-alert-point">
            <div class="cp-point-dot cp-dot-orange"></div>
            <div class="cp-point-addr">{{ incomingRide.drop.address | slice:0:45 }}</div>
          </div>
        </div>

        <!-- Details row -->
        <div class="cp-alert-meta">
          <div class="cp-alert-meta-item">
            <div class="cp-meta-label">Service</div>
            <div class="cp-meta-val">{{ incomingRide.serviceType | titlecase }}</div>
          </div>
          <div class="cp-alert-meta-item">
            <div class="cp-meta-label">Customer</div>
            <div class="cp-meta-val">{{ incomingRide.userName }}</div>
          </div>
          <div class="cp-alert-meta-item">
            <div class="cp-meta-label">Fare</div>
            <div class="cp-meta-val cp-fare">₹{{ incomingRide.estimatedFare || '—' }}</div>
          </div>
          <div class="cp-alert-meta-item">
            <div class="cp-meta-label">Payment</div>
            <div class="cp-meta-val">{{ incomingRide.paymentMethod | titlecase }}</div>
          </div>
        </div>

        <!-- Countdown bar -->
        <div class="cp-alert-countdown-wrap">
          <div class="cp-alert-countdown-bar" [style.width.%]="countdownPct"></div>
        </div>
        <div class="cp-alert-countdown-label">{{ countdown }}s to auto-decline</div>

        <!-- Accept / Decline -->
        <div class="cp-alert-actions">
          <button class="cp-decline-btn" (click)="decline()">✕ Decline</button>
          <button class="cp-accept-btn" (click)="accept()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Accept Ride
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cp-alert-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,.72);
      display: flex; align-items: flex-end; justify-content: center;
      animation: caFadeIn .2s ease;
    }
    @keyframes caFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .cp-alert-sheet {
      width: 100%; max-width: 480px;
      background: #fff; border-radius: 28px 28px 0 0;
      padding: 24px 20px 36px;
      animation: caSlideUp .28s ease;
      text-align: center;
    }
    @keyframes caSlideUp {
      from { transform: translateY(50px); opacity: .4; }
      to   { transform: translateY(0);    opacity: 1;  }
    }

    .cp-alert-pulse-wrap {
      position: relative; width: 90px; height: 90px;
      margin: 0 auto 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .cp-alert-pulse-ring {
      position: absolute; inset: 0; border-radius: 50%;
      border: 3px solid #e53935; opacity: .5;
      animation: caRingGrow 1.4s ease-out infinite;
    }
    .cp-ring2 { animation-delay: .7s; }
    @keyframes caRingGrow {
      0%   { transform: scale(.8);  opacity: .6; }
      100% { transform: scale(1.7); opacity: 0;  }
    }
    .cp-alert-icon { font-size: 40px; z-index: 1; }

    .cp-alert-badge {
      display: inline-block; background: #e53935; color: #fff;
      font-size: 11px; font-weight: 800; letter-spacing: .8px;
      padding: 4px 12px; border-radius: 20px; margin-bottom: 8px;
      animation: caBadgePulse 1s ease-in-out infinite;
    }
    @keyframes caBadgePulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(229,57,53,.4); }
      50%     { box-shadow: 0 0 0 8px rgba(229,57,53,0); }
    }

    .cp-alert-title { font-size: 24px; font-weight: 900; color: #111; margin: 0 0 16px; }

    .cp-alert-route {
      background: #f8f9fa; border-radius: 14px;
      padding: 12px 16px; margin-bottom: 14px; text-align: left;
    }
    .cp-alert-point  { display: flex; align-items: center; gap: 10px; }
    .cp-alert-line   { width: 1.5px; height: 14px; background: #ddd; margin-left: 7px; }
    .cp-point-dot    { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
    .cp-dot-green    { background: #4caf50; }
    .cp-dot-orange   { background: #f4511e; }
    .cp-point-addr   { font-size: 13px; font-weight: 600; color: #333; }

    .cp-alert-meta {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 10px; margin-bottom: 16px; text-align: left;
    }
    .cp-alert-meta-item { background: #f8f9fa; border-radius: 10px; padding: 10px 12px; }
    .cp-meta-label { font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; margin-bottom: 3px; }
    .cp-meta-val   { font-size: 14px; font-weight: 800; color: #111; }
    .cp-fare       { color: #e53935; }

    .cp-alert-countdown-wrap {
      height: 4px; background: #f0f0f0; border-radius: 2px;
      overflow: hidden; margin-bottom: 6px;
    }
    .cp-alert-countdown-bar {
      height: 100%; background: #e53935; border-radius: 2px;
      transition: width 1s linear;
    }
    .cp-alert-countdown-label { font-size: 12px; color: #aaa; margin-bottom: 16px; }

    .cp-alert-actions { display: flex; gap: 12px; }
    .cp-decline-btn {
      flex: 1; padding: 16px; border: 2px solid #e0e0e0;
      background: #fff; border-radius: 16px;
      font-size: 15px; font-weight: 700; color: #666; cursor: pointer;
      transition: all .15s;
    }
    .cp-decline-btn:hover { border-color: #e53935; color: #e53935; background: #fff5f5; }
    .cp-accept-btn {
      flex: 2; padding: 16px; border: none;
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      border-radius: 16px; font-size: 16px; font-weight: 800; color: #fff;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 4px 14px rgba(76,175,80,.4);
      animation: caAcceptPulse 1.5s ease-in-out infinite;
    }
    @keyframes caAcceptPulse {
      0%,100% { box-shadow: 0 4px 14px rgba(76,175,80,.4); }
      50%     { box-shadow: 0 6px 20px rgba(76,175,80,.7); }
    }
  `]
})
export class CaptainRideAlertComponent implements OnInit, OnDestroy {
  incomingRide: Booking | null = null;
  countdown = 25;
  countdownPct = 100;

  private subs: Subscription[] = [];

  constructor(
    private alertService: CaptainRideAlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.alertService.incomingRide$.subscribe(ride => this.incomingRide = ride),
      this.alertService.countdown$.subscribe(v => this.countdown = v),
      this.alertService.countdownPct$.subscribe(v => this.countdownPct = v),
      this.alertService.rideAccepted$.subscribe(rideId => {
        // Navigate to tracking after accepting
        this.router.navigate(['/tracking', rideId]);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  accept(): void {
    this.alertService.acceptRide();
  }

  decline(): void {
    this.alertService.declineRide();
  }
}
