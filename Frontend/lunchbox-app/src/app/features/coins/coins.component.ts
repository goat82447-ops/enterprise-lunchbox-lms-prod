import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface CoinHistoryEntry {
  label: string;
  coins: number;
  date: string;
}

@Component({
  selector: 'app-coins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:600px;margin:0 auto;padding:16px 12px 80px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <button (click)="router.navigate(['/account'])" style="background:none;border:none;cursor:pointer;padding:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style="margin:0;font-size:1.4rem;font-weight:700;color:#f59e0b;">RouteX Coins 🪙</h2>
      </div>

      <!-- Balance -->
      <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px;padding:28px;text-align:center;color:#fff;margin-bottom:20px;">
        <div style="font-size:3.5rem;">🪙</div>
        <div style="font-size:3rem;font-weight:800;margin-top:4px;">{{ coinBalance }}</div>
        <div style="font-size:0.85rem;opacity:0.85;margin-top:4px;">RouteX Coins</div>
      </div>

      <!-- How to Earn -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#f59e0b;margin:0 0 14px;">How to Earn 💡</h3>
        <div *ngFor="let way of earnWays" style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid #fef3c7;" [style.border-bottom]="way === earnWays[earnWays.length-1] ? 'none' : '1px solid #fef3c7'">
          <span style="font-size:1.5rem;">{{ way.icon }}</span>
          <div style="flex:1;">
            <div style="font-size:0.9rem;font-weight:600;color:#1a1a1a;">{{ way.label }}</div>
          </div>
          <span style="background:#fef3c7;color:#d97706;border-radius:20px;padding:4px 12px;font-size:0.85rem;font-weight:700;">+{{ way.coins }} 🪙</span>
        </div>
      </div>

      <!-- Coin History -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#f59e0b;margin:0 0 14px;">Coin History 📜</h3>
        <div *ngIf="coinHistory.length === 0" style="text-align:center;color:#999;padding:20px;font-size:0.9rem;">
          No coins earned yet. Take your first ride!
        </div>
        <div *ngFor="let entry of coinHistory.slice(0,10)" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f5f5f5;">
          <div>
            <div style="font-size:0.9rem;font-weight:600;color:#1a1a1a;">{{ entry.label }}</div>
            <div style="font-size:0.75rem;color:#999;margin-top:2px;">{{ entry.date }}</div>
          </div>
          <span [style.color]="entry.coins > 0 ? '#16a34a' : '#e53935'" style="font-weight:700;font-size:0.95rem;">{{ entry.coins > 0 ? '+' : '' }}{{ entry.coins }} 🪙</span>
        </div>
      </div>

      <!-- Redeem Coins -->
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#f59e0b;margin:0 0 14px;">Redeem Coins 🎁</h3>
        <div *ngFor="let option of redeemOptions" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f5f5f5;" [style.border-bottom]="option === redeemOptions[redeemOptions.length-1] ? 'none' : '1px solid #f5f5f5'">
          <div>
            <div style="font-size:0.9rem;font-weight:600;color:#1a1a1a;">{{ option.coins }} coins → ₹{{ option.discount }} discount</div>
          </div>
          <button (click)="redeemCoins(option)" [disabled]="coinBalance < option.coins"
            [style.opacity]="coinBalance < option.coins ? '0.5' : '1'"
            style="background:#f59e0b;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:0.8rem;font-weight:700;">
            Redeem
          </button>
        </div>
      </div>

      <!-- Toast -->
      <div *ngIf="toastMsg" style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:30px;font-size:0.85rem;z-index:9999;">{{ toastMsg }}</div>
    </div>
  `
})
export class CoinsComponent implements OnInit {
  coinBalance = 0;
  coinHistory: CoinHistoryEntry[] = [];
  toastMsg = '';

  earnWays = [
    { icon: '🚗', label: 'Complete a ride', coins: 10 },
    { icon: '📱', label: 'Pay via UPI', coins: 5 },
    { icon: '👥', label: 'Refer a friend', coins: 50 }
  ];

  redeemOptions = [
    { coins: 50, discount: 5 },
    { coins: 100, discount: 12 },
    { coins: 200, discount: 30 }
  ];

  constructor(public router: Router, private auth: AuthService) {}

  ngOnInit() {
    this.coinBalance = parseInt(localStorage.getItem('rx_coins') || '0', 10);
    try {
      const history = localStorage.getItem('rx_coin_history');
      this.coinHistory = history ? JSON.parse(history) : [];
    } catch {
      this.coinHistory = [];
    }
  }

  redeemCoins(option: { coins: number; discount: number }) {
    if (this.coinBalance < option.coins) return;
    this.coinBalance -= option.coins;
    localStorage.setItem('rx_coins', String(this.coinBalance));
    const entry: CoinHistoryEntry = {
      label: 'Redeemed for ₹' + option.discount + ' discount',
      coins: -option.coins,
      date: new Date().toLocaleDateString('en-IN')
    };
    this.coinHistory = [entry, ...this.coinHistory];
    localStorage.setItem('rx_coin_history', JSON.stringify(this.coinHistory));
    this.showToast('✅ Redeemed ' + option.coins + ' coins for ₹' + option.discount + ' discount!');
  }

  private showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

