import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface PowerPass {
  plan: string;
  ridesTotal: number;
  ridesUsed: number;
  purchasedAt: string;
}

@Component({
  selector: 'app-power-pass',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:600px;margin:0 auto;padding:16px 12px 80px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <button (click)="router.navigate(['/account'])" style="background:none;border:none;cursor:pointer;padding:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style="margin:0;font-size:1.4rem;font-weight:700;color:#1e88e5;">RouteX Power Pass ⚡</h2>
      </div>

      <!-- Active Pass -->
      <div *ngIf="activePass; else choosePlan">
        <div style="background:linear-gradient(135deg,#1e88e5,#1565c0);border-radius:16px;padding:24px;color:#fff;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:0.8rem;opacity:0.8;">Active Plan</div>
              <div style="font-size:1.6rem;font-weight:800;margin-top:2px;">{{ activePass.plan }}</div>
              <div style="font-size:0.85rem;opacity:0.85;margin-top:4px;">Expires {{ expiryDate }}</div>
            </div>
            <div style="position:relative;width:80px;height:80px;">
              <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg);">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fff" stroke-width="3"
                  [attr.stroke-dasharray]="progressDash + ' 100'"
                  stroke-linecap="round"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div style="font-size:1.2rem;font-weight:800;">{{ ridesRemaining }}</div>
                <div style="font-size:0.6rem;opacity:0.8;">left</div>
              </div>
            </div>
          </div>
          <div style="margin-top:16px;background:rgba(255,255,255,0.2);border-radius:8px;padding:10px;font-size:0.85rem;">
            {{ activePass.ridesUsed }} / {{ activePass.ridesTotal }} rides used
          </div>
        </div>
        <button (click)="usePassRide()" [disabled]="ridesRemaining === 0"
          style="width:100%;background:#1e88e5;color:#fff;border:none;border-radius:14px;padding:16px;font-size:1rem;font-weight:700;cursor:pointer;">
          ⚡ Use Pass Ride
        </button>
        <button (click)="cancelPass()"
          style="width:100%;background:none;color:#e53935;border:1.5px solid #e53935;border-radius:14px;padding:12px;font-size:0.9rem;font-weight:600;cursor:pointer;margin-top:10px;">
          Cancel Pass
        </button>
      </div>

      <!-- Choose Plan -->
      <ng-template #choosePlan>
        <p style="color:#666;font-size:0.9rem;margin-bottom:20px;">Choose a plan that suits your ride frequency.</p>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div *ngFor="let plan of plans" [style.border]="plan.bestValue ? '2px solid #1e88e5' : '1px solid #e0e0e0'"
            style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
              <div>
                <div style="font-size:1.1rem;font-weight:700;color:#1a1a1a;">{{ plan.name }}</div>
                <div style="font-size:0.85rem;color:#666;margin-top:2px;">{{ plan.rides }} rides included</div>
                <div style="font-size:0.8rem;color:#888;margin-top:2px;">Valid for 30 days</div>
              </div>
              <div style="text-align:right;">
                <span *ngIf="plan.bestValue" style="background:#1e88e5;color:#fff;border-radius:6px;padding:2px 8px;font-size:0.7rem;font-weight:700;display:block;margin-bottom:4px;">BEST VALUE</span>
                <div style="font-size:1.4rem;font-weight:800;color:#1e88e5;">₹{{ plan.price }}</div>
                <div style="font-size:0.75rem;color:#888;">₹{{ (plan.price / plan.rides).toFixed(0) }}/ride</div>
              </div>
            </div>
            <button (click)="buyPlan(plan)"
              style="width:100%;background:#1e88e5;color:#fff;border:none;border-radius:10px;padding:12px;font-size:0.9rem;font-weight:700;cursor:pointer;">
              Buy Now
            </button>
          </div>
        </div>
      </ng-template>

      <!-- Toast -->
      <div *ngIf="toastMsg" style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:30px;font-size:0.85rem;z-index:9999;">{{ toastMsg }}</div>
    </div>
  `
})
export class PowerPassComponent implements OnInit {
  activePass: PowerPass | null = null;
  toastMsg = '';

  plans = [
    { name: 'Starter', rides: 10, price: 199, bestValue: false },
    { name: 'Popular', rides: 25, price: 449, bestValue: true },
    { name: 'Unlimited', rides: 60, price: 899, bestValue: false }
  ];

  get ridesRemaining(): number {
    return this.activePass ? this.activePass.ridesTotal - this.activePass.ridesUsed : 0;
  }

  get progressDash(): number {
    if (!this.activePass) return 0;
    return (this.activePass.ridesUsed / this.activePass.ridesTotal) * 100;
  }

  get expiryDate(): string {
    if (!this.activePass) return '';
    const d = new Date(this.activePass.purchasedAt);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  constructor(public router: Router, private auth: AuthService) {}

  ngOnInit() {
    const stored = localStorage.getItem('rx_power_pass');
    if (stored) {
      try { this.activePass = JSON.parse(stored); } catch { this.activePass = null; }
    }
  }

  buyPlan(plan: { name: string; rides: number; price: number; bestValue: boolean }) {
    const pass: PowerPass = {
      plan: plan.name,
      ridesTotal: plan.rides,
      ridesUsed: 0,
      purchasedAt: new Date().toISOString()
    };
    localStorage.setItem('rx_power_pass', JSON.stringify(pass));
    this.activePass = pass;
    this.showToast('⚡ ' + plan.name + ' Pass activated! Enjoy your rides.');
  }

  usePassRide() {
    if (!this.activePass || this.ridesRemaining === 0) return;
    this.activePass = { ...this.activePass, ridesUsed: this.activePass.ridesUsed + 1 };
    localStorage.setItem('rx_power_pass', JSON.stringify(this.activePass));
    this.showToast('✅ 1 ride used. ' + this.ridesRemaining + ' rides remaining.');
  }

  cancelPass() {
    localStorage.removeItem('rx_power_pass');
    this.activePass = null;
    this.showToast('Pass cancelled.');
  }

  private showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}
