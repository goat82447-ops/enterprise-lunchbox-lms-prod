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

        <!-- Circular countdown timer -->
        <div class="cp-timer-wrap">
          <svg class="cp-timer-svg" viewBox="0 0 80 80">
            <circle class="cp-timer-track" cx="40" cy="40" r="34"/>
            <circle class="cp-timer-arc" cx="40" cy="40" r="34"
              [style.stroke-dashoffset]="timerDashOffset"/>
          </svg>
          <div class="cp-timer-inner">
            <span class="cp-timer-num">{{ countdown }}</span>
            <span class="cp-timer-sec">sec</span>
          </div>
        </div>

        <div class="cp-alert-badge">NEW RIDE REQUEST</div>
        <h2 class="cp-alert-title">Incoming Ride!</h2>

        <!-- Route -->
        <div class="cp-alert-route">
          <div class="cp-alert-point">
            <div class="cp-point-dot cp-dot-green"></div>
            <div class="cp-point-addr">{{ incomingRide.pickup.address | slice:0:50 }}</div>
          </div>
          <div class="cp-alert-line"></div>
          <div class="cp-alert-point">
            <div class="cp-point-dot cp-dot-orange"></div>
            <div class="cp-point-addr">{{ incomingRide.drop.address | slice:0:50 }}</div>
          </div>
        </div>

        <!-- Meta info -->
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
            <div class="cp-meta-label">Earnings</div>
            <div class="cp-meta-val cp-fare">&#x20B9;{{ incomingRide.estimatedFare || 0 }}</div>
          </div>
          <div class="cp-alert-meta-item">
            <div class="cp-meta-label">Payment</div>
            <div class="cp-meta-val">{{ incomingRide.paymentMethod | titlecase }}</div>
          </div>
        </div>

        <!-- Actions -->
        <div class="cp-alert-actions">
          <button class="cp-decline-btn" (click)="decline()">&#x2715; Decline</button>
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
    .cp-alert-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.78);display:flex;align-items:flex-end;justify-content:center;animation:caFadeIn .2s ease; }
    @keyframes caFadeIn { from{opacity:0}to{opacity:1} }
    .cp-alert-sheet { width:100%;max-width:480px;background:#fff;border-radius:28px 28px 0 0;padding:28px 20px 36px;animation:caSlideUp .28s ease;text-align:center; }
    @keyframes caSlideUp { from{transform:translateY(60px);opacity:.3}to{transform:translateY(0);opacity:1} }

    /* Circular timer */
    .cp-timer-wrap { position:relative;width:88px;height:88px;margin:0 auto 16px; }
    .cp-timer-svg { width:88px;height:88px;transform:rotate(-90deg); }
    .cp-timer-track { fill:none;stroke:#f0f0f0;stroke-width:6; }
    .cp-timer-arc { fill:none;stroke:#e23744;stroke-width:6;stroke-linecap:round;stroke-dasharray:213.6;transition:stroke-dashoffset 1s linear; }
    .cp-timer-inner { position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center; }
    .cp-timer-num { font-size:26px;font-weight:900;color:#1c1c1e;line-height:1; }
    .cp-timer-sec { font-size:10px;color:#aaa;font-weight:700;margin-top:1px; }

    .cp-alert-badge { display:inline-block;background:#e23744;color:#fff;font-size:11px;font-weight:800;letter-spacing:.8px;padding:4px 14px;border-radius:20px;margin-bottom:8px;animation:caBadgePulse 1s ease-in-out infinite; }
    @keyframes caBadgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(226,55,68,.4)}50%{box-shadow:0 0 0 8px rgba(226,55,68,0)} }
    .cp-alert-title { font-size:22px;font-weight:900;color:#111;margin:0 0 16px; }

    .cp-alert-route { background:#f8f9fa;border-radius:14px;padding:12px 16px;margin-bottom:14px;text-align:left; }
    .cp-alert-point { display:flex;align-items:center;gap:10px; }
    .cp-alert-line { width:1.5px;height:14px;background:#ddd;margin-left:7px; }
    .cp-point-dot { width:14px;height:14px;border-radius:50%;flex-shrink:0; }
    .cp-dot-green { background:#26a541; }
    .cp-dot-orange { background:#e23744; }
    .cp-point-addr { font-size:13px;font-weight:600;color:#333;line-height:1.3; }

    .cp-alert-meta { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;text-align:left; }
    .cp-alert-meta-item { background:#f8f9fa;border-radius:10px;padding:10px 12px; }
    .cp-meta-label { font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px; }
    .cp-meta-val { font-size:14px;font-weight:800;color:#111; }
    .cp-fare { color:#e23744;font-size:18px; }

    .cp-alert-actions { display:flex;gap:12px; }
    .cp-decline-btn { flex:1;padding:16px;border:2px solid #e0e0e0;background:#fff;border-radius:16px;font-size:15px;font-weight:700;color:#666;cursor:pointer;transition:all .15s; }
    .cp-decline-btn:hover { border-color:#e23744;color:#e23744;background:#fff5f5; }
    .cp-accept-btn { flex:2;padding:16px;border:none;background:linear-gradient(135deg,#26a541,#1d7d32);border-radius:16px;font-size:16px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(38,165,65,.4);animation:caAcceptPulse 1.5s ease-in-out infinite; }
    @keyframes caAcceptPulse { 0%,100%{box-shadow:0 4px 14px rgba(38,165,65,.4)}50%{box-shadow:0 8px 24px rgba(38,165,65,.7)} }
  `]
})
export class CaptainRideAlertComponent implements OnInit, OnDestroy {
  incomingRide: Booking | null = null;
  countdown = 25;
  countdownPct = 100;
  private subs: Subscription[] = [];

  private readonly TIMER_CIRCUMFERENCE = 2 * Math.PI * 34;

  get timerDashOffset(): number {
    return this.TIMER_CIRCUMFERENCE * (1 - this.countdownPct / 100);
  }

  constructor(private alertService: CaptainRideAlertService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(
      this.alertService.incomingRide$.subscribe(ride => this.incomingRide = ride),
      this.alertService.countdown$.subscribe(v => this.countdown = v),
      this.alertService.countdownPct$.subscribe(v => this.countdownPct = v),
      this.alertService.rideAccepted$.subscribe(rideId => {
        this.router.navigate(['/tracking', rideId]);
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
  accept(): void { this.alertService.acceptRide(); }
  decline(): void { this.alertService.declineRide(); }
}
