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
    <div class="cra-overlay" *ngIf="incomingRide" (click)="$event.stopPropagation()">
      <div class="cra-sheet">
        <div class="cra-pulse-wrap">
          <div class="cra-ring"></div><div class="cra-ring cra-ring2"></div>
          <span class="cra-icon">&#x1F3CD;&#xFE0F;</span>
        </div>
        <div class="cra-badge">NEW RIDE REQUEST</div>
        <h2 class="cra-title">Incoming Ride!</h2>
        <div class="cra-route">
          <div class="cra-point"><span class="cra-dot cra-dot-g"></span><span>{{ incomingRide.pickup.address | slice:0:45 }}</span></div>
          <div class="cra-line"></div>
          <div class="cra-point"><span class="cra-dot cra-dot-o"></span><span>{{ incomingRide.drop.address | slice:0:45 }}</span></div>
        </div>
        <div class="cra-meta">
          <div class="cra-meta-item"><div class="cra-ml">Service</div><div class="cra-mv">{{ incomingRide.serviceType | titlecase }}</div></div>
          <div class="cra-meta-item"><div class="cra-ml">Customer</div><div class="cra-mv">{{ incomingRide.userName }}</div></div>
          <div class="cra-meta-item"><div class="cra-ml">Fare</div><div class="cra-mv cra-fare">&#x20B9;{{ incomingRide.estimatedFare || 0 }}</div></div>
          <div class="cra-meta-item"><div class="cra-ml">Payment</div><div class="cra-mv">{{ incomingRide.paymentMethod | titlecase }}</div></div>
        </div>
        <div class="cra-bar-wrap"><div class="cra-bar" [style.width.%]="countdownPct"></div></div>
        <div class="cra-timer">{{ countdown }}s to auto-decline</div>
        <div class="cra-actions">
          <button class="cra-decline" (click)="decline()">&#x2715; Decline</button>
          <button class="cra-accept" (click)="accept()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Accept Ride
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cra-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);display:flex;align-items:flex-end;justify-content:center;animation:craFade .2s ease; }
    @keyframes craFade { from{opacity:0}to{opacity:1} }
    .cra-sheet { width:100%;max-width:480px;background:#fff;border-radius:28px 28px 0 0;padding:24px 20px 36px;animation:craUp .28s ease;text-align:center; }
    @keyframes craUp { from{transform:translateY(50px);opacity:.4}to{transform:translateY(0);opacity:1} }
    .cra-pulse-wrap { position:relative;width:90px;height:90px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center; }
    .cra-ring { position:absolute;inset:0;border-radius:50%;border:3px solid #e53935;opacity:.5;animation:craRing 1.4s ease-out infinite; }
    .cra-ring2 { animation-delay:.7s; }
    @keyframes craRing { 0%{transform:scale(.8);opacity:.6}100%{transform:scale(1.7);opacity:0} }
    .cra-icon { font-size:40px;z-index:1; }
    .cra-badge { display:inline-block;background:#e53935;color:#fff;font-size:11px;font-weight:800;letter-spacing:.8px;padding:4px 12px;border-radius:20px;margin-bottom:8px;animation:craPulse 1s ease-in-out infinite; }
    @keyframes craPulse { 0%,100%{box-shadow:0 0 0 0 rgba(229,57,53,.4)}50%{box-shadow:0 0 0 8px rgba(229,57,53,0)} }
    .cra-title { font-size:24px;font-weight:900;color:#111;margin:0 0 16px; }
    .cra-route { background:#f8f9fa;border-radius:14px;padding:12px 16px;margin-bottom:14px;text-align:left; }
    .cra-point { display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:#333; }
    .cra-line  { width:1.5px;height:14px;background:#ddd;margin-left:7px; }
    .cra-dot   { width:14px;height:14px;border-radius:50%;flex-shrink:0; }
    .cra-dot-g { background:#4caf50; }
    .cra-dot-o { background:#f4511e; }
    .cra-meta  { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;text-align:left; }
    .cra-meta-item { background:#f8f9fa;border-radius:10px;padding:10px 12px; }
    .cra-ml { font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px; }
    .cra-mv { font-size:14px;font-weight:800;color:#111; }
    .cra-fare { color:#e53935; }
    .cra-bar-wrap { height:4px;background:#f0f0f0;border-radius:2px;overflow:hidden;margin-bottom:6px; }
    .cra-bar  { height:100%;background:#e53935;border-radius:2px;transition:width 1s linear; }
    .cra-timer { font-size:12px;color:#aaa;margin-bottom:16px; }
    .cra-actions { display:flex;gap:12px; }
    .cra-decline { flex:1;padding:16px;border:2px solid #e0e0e0;background:#fff;border-radius:16px;font-size:15px;font-weight:700;color:#666;cursor:pointer; }
    .cra-decline:hover { border-color:#e53935;color:#e53935;background:#fff5f5; }
    .cra-accept { flex:2;padding:16px;border:none;background:linear-gradient(135deg,#4caf50,#2e7d32);border-radius:16px;font-size:16px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(76,175,80,.4);animation:craAccept 1.5s ease-in-out infinite; }
    @keyframes craAccept { 0%,100%{box-shadow:0 4px 14px rgba(76,175,80,.4)}50%{box-shadow:0 6px 20px rgba(76,175,80,.7)} }
  `]
})
export class CaptainRideAlertComponent implements OnInit, OnDestroy {
  incomingRide: Booking | null = null;
  countdown = 25;
  countdownPct = 100;
  private subs: Subscription[] = [];

  constructor(private alertService: CaptainRideAlertService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(
      this.alertService.incomingRide$.subscribe(r => this.incomingRide = r),
      this.alertService.countdown$.subscribe(v => this.countdown = v),
      this.alertService.countdownPct$.subscribe(v => this.countdownPct = v),
      this.alertService.rideAccepted$.subscribe(id => this.router.navigate(['/tracking', id]))
    );
  }
  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
  accept(): void { this.alertService.acceptRide(); }
  decline(): void { this.alertService.declineRide(); }
}
