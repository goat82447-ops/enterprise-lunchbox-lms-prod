import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:600px;margin:0 auto;padding:16px 12px 80px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <button (click)="router.navigate(['/account'])" style="background:none;border:none;cursor:pointer;padding:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style="margin:0;font-size:1.4rem;font-weight:700;color:#7c3aed;">My Rewards 🎁</h2>
      </div>

      <!-- Points Banner -->
      <div style="background:linear-gradient(135deg,#7c3aed,#5b21b6);border-radius:16px;padding:24px;color:#fff;margin-bottom:20px;text-align:center;">
        <div style="font-size:0.9rem;opacity:0.85;margin-bottom:4px;">Your Reward Points</div>
        <div style="font-size:3rem;font-weight:800;">{{ rewardPoints }}</div>
        <div style="font-size:0.8rem;opacity:0.7;margin-top:4px;">{{ rewardPoints >= 10 ? '🎉 You have scratch cards available!' : 'Earn more rides to unlock cards' }}</div>
      </div>

      <!-- Scratch Cards -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#7c3aed;margin:0 0 16px;">Scratch Cards 🎰</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          <div *ngFor="let i of [0,1,2]">
            <div *ngIf="rewardPoints >= 10; else locked">
              <div *ngIf="!scratchedCards[i]" (click)="scratchCard(i)"
                style="background:linear-gradient(135deg,#e9d5ff,#ddd6fe);border-radius:12px;padding:20px 8px;text-align:center;cursor:pointer;border:2px dashed #7c3aed;">
                <div style="font-size:1.5rem;">🎰</div>
                <div style="font-size:0.75rem;color:#7c3aed;font-weight:700;margin-top:6px;">Scratch Me!</div>
              </div>
              <div *ngIf="scratchedCards[i]"
                style="background:linear-gradient(135deg,#ffd700,#f59e0b);border-radius:12px;padding:16px 8px;text-align:center;border:2px solid #f59e0b;">
                <div style="font-size:1.1rem;font-weight:800;color:#1a1a1a;">{{ scratchedCards[i].split(' - ')[0] }}</div>
                <div style="font-size:0.7rem;color:#333;margin-top:4px;">{{ scratchedCards[i].split(' - ')[1] }}</div>
              </div>
            </div>
            <ng-template #locked>
              <div style="background:#f5f5f5;border-radius:12px;padding:20px 8px;text-align:center;opacity:0.6;">
                <div style="font-size:1.5rem;">🔒</div>
                <div style="font-size:0.7rem;color:#999;margin-top:6px;">Earn more rides</div>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Referral -->
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#7c3aed;margin:0 0 14px;">Refer & Earn 🤝</h3>
        <div style="font-size:0.85rem;color:#666;margin-bottom:12px;">Share your referral code and earn 50 bonus points!</div>
        <div style="display:flex;gap:10px;align-items:center;">
          <div style="flex:1;background:#f3e8ff;border:1px dashed #7c3aed;border-radius:10px;padding:12px 16px;font-size:1rem;font-weight:700;color:#7c3aed;letter-spacing:2px;">{{ referralCode }}</div>
          <button (click)="copyReferral()" style="background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:12px 16px;cursor:pointer;font-size:0.85rem;font-weight:600;">Copy</button>
        </div>
      </div>

      <!-- Toast -->
      <div *ngIf="toastMsg" style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:30px;font-size:0.85rem;z-index:9999;">{{ toastMsg }}</div>
    </div>
  `
})
export class RewardsComponent implements OnInit {
  rewardPoints = 0;
  scratchedCards: Record<number, string> = {};
  referralCode = 'ROUTEX50';
  toastMsg = '';

  private rewards = [
    'SAVE10 - 10% OFF',
    'FLAT50 - ₹50 OFF',
    'FIRST100 - ₹100 OFF',
    'LUCKY5 - 5% OFF',
    'RIDE20 - 20% OFF'
  ];

  constructor(public router: Router, private auth: AuthService) {}

  ngOnInit() {
    const stored = parseInt(localStorage.getItem('rx_reward_points') || '0', 10);
    this.rewardPoints = stored || 0;
    const user = this.auth.getCurrentUser();
    if (user) {
      this.referralCode = ('RX' + (user.username || user.displayName || 'USER').toUpperCase().slice(0, 6)).replace(/\s/g, '');
    }
  }

  scratchCard(index: number) {
    if (this.scratchedCards[index]) return;
    const reward = this.rewards[Math.floor(Math.random() * this.rewards.length)];
    this.scratchedCards = { ...this.scratchedCards, [index]: reward };
    this.showToast('🎉 You won: ' + reward.split(' - ')[1] + '!');
  }

  copyReferral() {
    navigator.clipboard.writeText(this.referralCode).catch(() => {});
    this.showToast('Referral code copied!');
  }

  private showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

