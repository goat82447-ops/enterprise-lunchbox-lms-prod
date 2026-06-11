import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { BookingService } from '../../core/services/booking.service';
import { AppUser } from '../../core/models/delivery.models';

const BANK_KEY = 'captain_bank_details_v1';

interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  upiId: string;
  savedAt?: string;
}

@Component({
  selector: 'app-captain-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cb-page">
      <!-- Header -->
      <div class="cb-header">
        <h2 class="cb-title">💳 Bank Account</h2>
        <div class="cb-sub">Your payment & earnings details</div>
      </div>

      <!-- Earnings Summary -->
      <div class="cb-section">
        <div class="cb-section-title">📊 Earnings Summary</div>
        <div class="cb-earnings-grid">
          <div class="cb-earn-card cb-today">
            <div class="cb-earn-val">₹{{ todayEarnings | number:'1.0-0' }}</div>
            <div class="cb-earn-label">Today</div>
          </div>
          <div class="cb-earn-card cb-week">
            <div class="cb-earn-val">₹{{ weekEarnings | number:'1.0-0' }}</div>
            <div class="cb-earn-label">This Week</div>
          </div>
          <div class="cb-earn-card cb-total">
            <div class="cb-earn-val">₹{{ totalEarnings | number:'1.0-0' }}</div>
            <div class="cb-earn-label">Total Earned</div>
          </div>
          <div class="cb-earn-card cb-pending">
            <div class="cb-earn-val">₹{{ pendingEarnings | number:'1.0-0' }}</div>
            <div class="cb-earn-label">Pending</div>
          </div>
        </div>
      </div>

      <!-- Ride Payments -->
      <div class="cb-section">
        <div class="cb-section-title">💰 Recent Payments</div>
        <div class="cb-empty" *ngIf="paidRides.length === 0">No payments received yet.</div>
        <div class="cb-payment-row" *ngFor="let ride of paidRides | slice:0:10">
          <div class="cb-pay-left">
            <div class="cb-pay-id">{{ ride.id }}</div>
            <div class="cb-pay-date">{{ ride.paymentDoneAt || ride.updatedAt | date:'dd MMM, hh:mm a' }}</div>
          </div>
          <div class="cb-pay-right">
            <div class="cb-pay-amount">₹{{ ride.finalAmount | number:'1.0-0' }}</div>
            <div class="cb-pay-method">{{ ride.paymentMethod | titlecase }}</div>
          </div>
        </div>
      </div>

      <!-- Bank Details Form -->
      <div class="cb-section">
        <div class="cb-section-header">
          <div class="cb-section-title">🏦 Bank Details</div>
          <span class="cb-saved-badge" *ngIf="saved">✅ Saved</span>
        </div>
        <div class="cb-hint">Add your bank account to receive earnings directly.</div>

        <div class="cb-form">
          <div class="cb-field">
            <label class="cb-label">Account Holder Name</label>
            <input class="cb-input" [(ngModel)]="bank.accountHolderName" placeholder="As per bank records" />
          </div>
          <div class="cb-field">
            <label class="cb-label">Bank Name</label>
            <select class="cb-input" [(ngModel)]="bank.bankName">
              <option value="">Select Bank</option>
              <option>State Bank of India</option>
              <option>HDFC Bank</option>
              <option>ICICI Bank</option>
              <option>Axis Bank</option>
              <option>Kotak Mahindra Bank</option>
              <option>Punjab National Bank</option>
              <option>Bank of Baroda</option>
              <option>Canara Bank</option>
              <option>Union Bank of India</option>
              <option>Indian Bank</option>
              <option>Other</option>
            </select>
          </div>
          <div class="cb-field">
            <label class="cb-label">Account Number</label>
            <input class="cb-input" [(ngModel)]="bank.accountNumber" placeholder="Enter account number" type="password" />
          </div>
          <div class="cb-field">
            <label class="cb-label">Confirm Account Number</label>
            <input class="cb-input" [(ngModel)]="confirmAccount" placeholder="Re-enter account number" />
            <div class="cb-mismatch" *ngIf="confirmAccount && confirmAccount !== bank.accountNumber">⚠️ Account numbers do not match</div>
          </div>
          <div class="cb-field">
            <label class="cb-label">IFSC Code</label>
            <input class="cb-input cb-upper" [(ngModel)]="bank.ifscCode" placeholder="e.g. SBIN0001234" maxlength="11" />
          </div>
          <div class="cb-field">
            <label class="cb-label">Account Type</label>
            <select class="cb-input" [(ngModel)]="bank.accountType">
              <option value="savings">Savings</option>
              <option value="current">Current</option>
            </select>
          </div>
          <div class="cb-divider">── OR ──</div>
          <div class="cb-field">
            <label class="cb-label">UPI ID (for instant transfer)</label>
            <input class="cb-input" [(ngModel)]="bank.upiId" placeholder="yourname@upi" />
          </div>

          <button class="cb-save-btn" [disabled]="!canSave" (click)="saveBankDetails()">
            💾 Save Bank Details
          </button>
        </div>

        <div class="cb-saved-info" *ngIf="saved && bank.savedAt">
          <div class="cb-saved-row"><span>Bank</span><strong>{{ bank.bankName }}</strong></div>
          <div class="cb-saved-row"><span>Account</span><strong>{{ maskedAccount }}</strong></div>
          <div class="cb-saved-row"><span>IFSC</span><strong>{{ bank.ifscCode }}</strong></div>
          <div class="cb-saved-row" *ngIf="bank.upiId"><span>UPI</span><strong>{{ bank.upiId }}</strong></div>
          <div class="cb-saved-row"><span>Last updated</span><strong>{{ bank.savedAt | date:'mediumDate' }}</strong></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cb-page { padding: 0 0 100px; background: #f8f9fc; min-height: 100vh; }
    .cb-header { background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); padding: 24px 16px 20px; color: #fff; }
    .cb-title  { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
    .cb-sub    { font-size: 13px; opacity: 0.7; }
    .cb-section { background: #fff; border-radius: 16px; margin: 14px 16px 0; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
    .cb-section-title { font-size: 14px; font-weight: 800; color: #1a1a2e; margin-bottom: 14px; }
    .cb-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .cb-hint { font-size: 12px; color: #888; margin-bottom: 14px; }
    .cb-saved-badge { background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    /* Earnings grid */
    .cb-earnings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .cb-earn-card { border-radius: 12px; padding: 14px; text-align: center; }
    .cb-today   { background: #dbeafe; }
    .cb-week    { background: #dcfce7; }
    .cb-total   { background: #fef3c7; }
    .cb-pending { background: #fee2e2; }
    .cb-earn-val   { font-size: 22px; font-weight: 800; color: #1a1a2e; }
    .cb-earn-label { font-size: 11px; color: #666; margin-top: 3px; }
    /* Payments */
    .cb-empty { font-size: 13px; color: #aaa; text-align: center; padding: 16px 0; }
    .cb-payment-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f8; }
    .cb-payment-row:last-child { border-bottom: none; }
    .cb-pay-id   { font-size: 13px; font-weight: 700; color: #1a1a2e; }
    .cb-pay-date { font-size: 11px; color: #999; margin-top: 2px; }
    .cb-pay-amount { font-size: 16px; font-weight: 800; color: #166534; text-align: right; }
    .cb-pay-method { font-size: 11px; color: #888; text-align: right; }
    /* Form */
    .cb-form { display: flex; flex-direction: column; gap: 12px; }
    .cb-field { display: flex; flex-direction: column; gap: 4px; }
    .cb-label { font-size: 12px; font-weight: 600; color: #555; }
    .cb-input { border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; background: #fafafa; width: 100%; box-sizing: border-box; }
    .cb-upper { text-transform: uppercase; }
    .cb-input:focus { border-color: #6366f1; background: #fff; }
    .cb-mismatch { font-size: 12px; color: #dc2626; }
    .cb-divider { text-align: center; color: #aaa; font-size: 12px; margin: 4px 0; }
    .cb-save-btn { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; }
    .cb-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    /* Saved info */
    .cb-saved-info { margin-top: 16px; background: #f0fdf4; border-radius: 12px; padding: 14px; }
    .cb-saved-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #dcfce7; }
    .cb-saved-row:last-child { border-bottom: none; }
    .cb-saved-row span { color: #888; }
  `]
})
export class CaptainBankComponent implements OnInit {
  bank: BankDetails = { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', accountType: 'savings', upiId: '' };
  confirmAccount = '';
  saved = false;
  captain: AppUser | null = null;
  paidRides: any[] = [];
  todayEarnings = 0;
  weekEarnings = 0;
  totalEarnings = 0;
  pendingEarnings = 0;

  constructor(private auth: AuthService, private notifications: NotificationService, private bookingService: BookingService) {}

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      this.captain = user;
      this.loadBankDetails();
      this.loadEarnings();
    });
    this.bookingService.bookings$.subscribe(() => this.loadEarnings());
  }

  private loadBankDetails(): void {
    if (!this.captain) return;
    const raw = localStorage.getItem(`${BANK_KEY}_${this.captain.id}`);
    if (raw) {
      try { this.bank = JSON.parse(raw); this.saved = true; } catch { this.saved = false; }
    }
  }

  private loadEarnings(): void {
    const user = this.auth.getCurrentUser();
    if (!user) return;
    const cId = String(user.id || '').toLowerCase();
    const cUser = String(user.username || '').toLowerCase();
    const all = this.bookingService.getAllBookingsSnapshot().filter(b => {
      if (b.notificationTarget === 'all') return true;
      return String(b.captainId || '').toLowerCase() === cId || String(b.driverName || '').toLowerCase() === cUser;
    });
    this.paidRides = all.filter(b => b.paymentDone).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.totalEarnings = this.paidRides.reduce((s, r) => s + (r.finalAmount || 0), 0);
    this.pendingEarnings = all.filter(b => b.status === 'completed' && !b.paymentDone).reduce((s, r) => s + (r.estimatedFare || 0), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
    this.todayEarnings = this.paidRides.filter(r => new Date(r.updatedAt) >= today).reduce((s, r) => s + (r.finalAmount || 0), 0);
    this.weekEarnings = this.paidRides.filter(r => new Date(r.updatedAt) >= weekAgo).reduce((s, r) => s + (r.finalAmount || 0), 0);
  }

  get canSave(): boolean {
    return !!(this.bank.accountHolderName && this.bank.bankName && this.bank.accountNumber &&
      this.bank.accountNumber === this.confirmAccount && this.bank.ifscCode.length >= 11);
  }

  get maskedAccount(): string {
    const n = this.bank.accountNumber;
    if (n.length < 5) return n;
    return '*'.repeat(n.length - 4) + n.slice(-4);
  }

  saveBankDetails(): void {
    if (!this.canSave || !this.captain) return;
    this.bank.savedAt = new Date().toISOString();
    this.bank.ifscCode = this.bank.ifscCode.toUpperCase();
    localStorage.setItem(`${BANK_KEY}_${this.captain.id}`, JSON.stringify(this.bank));
    this.saved = true;
    this.notifications.push('Bank details saved securely.', 'success');
  }
}
