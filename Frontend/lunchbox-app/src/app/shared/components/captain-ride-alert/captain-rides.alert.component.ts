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
        <div class="cra-grab"></div>
        <div class="cra-top">
          <div>
            <div class="cra-badge">New order request</div>
            <h2 class="cra-title">Accept in {{ countdown }}s</h2>
          </div>
          <div class="cra-fare-chip">₹{{ incomingRide.estimatedFare || 0 }}</div>
        </div>

        <div class="cra-route">
          <div class="cra-point">
            <span class="cra-dot cra-dot-g"></span>
            <span>{{ incomingRide.pickup.address | slice:0:56 }}</span>
          </div>
          <div class="cra-line"></div>
          <div class="cra-point">
            <span class="cra-dot cra-dot-o"></span>
            <span>{{ incomingRide.drop.address | slice:0:56 }}</span>
          </div>
        </div>

        <div class="cra-meta">
          <div class="cra-meta-item">
            <div class="cra-ml">Service</div>
            <div class="cra-mv">{{ incomingRide.serviceType | titlecase }}</div>
          </div>
          <div class="cra-meta-item">
            <div class="cra-ml">Payment</div>
            <div class="cra-mv">{{ incomingRide.paymentMethod | titlecase }}</div>
          </div>
          <div class="cra-meta-item cra-meta-customer">
            <div class="cra-ml">Customer</div>
            <div class="cra-mv">{{ incomingRide.userName }}</div>
          </div>
        </div>

        <div class="cra-bar-wrap">
          <div class="cra-bar" [style.width.%]="countdownPct"></div>
        </div>
        <div class="cra-timer">Autodecline when timer ends</div>

        <div class="cra-actions">
          <button class="cra-decline" (click)="decline()">Decline</button>
          <button class="cra-accept" (click)="accept()">
            Accept order
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cra-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(8, 8, 10, 0.76); display: flex; align-items: flex-end; justify-content: center; }
    .cra-sheet { width: 100%; max-width: 520px; background: #151517; color: #fff; border-radius: 24px 24px 0 0; padding: 14px 16px 26px; animation: craUp .22s ease; box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.4); }
    @keyframes craUp { from { transform: translateY(40px); opacity: .6; } to { transform: translateY(0); opacity: 1; } }
    .cra-grab { width: 42px; height: 4px; border-radius: 999px; background: #616168; margin: 0 auto 12px; }
    .cra-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
    .cra-badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; color: #ffd8db; background: #3f171a; border: 1px solid #6b2a30; }
    .cra-title { margin: 6px 0 0; font-size: 21px; font-weight: 800; }
    .cra-fare-chip { background: #e23744; color: #fff; border-radius: 14px; padding: 8px 12px; font-size: 18px; font-weight: 800; }
    .cra-route { border: 1px solid #2b2b31; border-radius: 14px; background: #1d1e21; padding: 12px; margin-bottom: 12px; }
    .cra-point { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.4; color: #e8e9ef; }
    .cra-line { width: 1px; height: 12px; background: #53545c; margin-left: 5px; margin-top: 2px; margin-bottom: 2px; }
    .cra-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
    .cra-dot-g { background: #18ca6c; }
    .cra-dot-o { background: #ff6f39; }
    .cra-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
    .cra-meta-item { border-radius: 12px; padding: 10px; border: 1px solid #2c2d34; background: #1c1d20; }
    .cra-meta-customer { grid-column: 1 / -1; }
    .cra-ml { font-size: 10px; text-transform: uppercase; letter-spacing: 0.35px; color: #9ea0ab; margin-bottom: 3px; }
    .cra-mv { font-size: 13px; font-weight: 700; color: #fff; }
    .cra-bar-wrap { height: 5px; border-radius: 999px; overflow: hidden; background: #2f3038; margin-bottom: 7px; }
    .cra-bar { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #ff8a00 0%, #ef4444 100%); transition: width 1s linear; }
    .cra-timer { font-size: 12px; color: #a8a9b2; margin-bottom: 14px; text-align: center; }
    .cra-actions { display: flex; gap: 8px; }
    .cra-decline { flex: 1; border-radius: 12px; border: 1px solid #4e4f58; background: #1d1d22; color: #f2f2f3; font-size: 14px; font-weight: 700; padding: 13px; }
    .cra-accept { flex: 1.4; border: none; border-radius: 12px; background: #14a44d; color: #fff; font-size: 14px; font-weight: 800; padding: 13px; }
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
