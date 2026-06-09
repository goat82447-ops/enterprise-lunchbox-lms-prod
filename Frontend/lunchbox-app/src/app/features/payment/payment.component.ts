import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService, LinkedAccount, UpiId } from '../../core/services/payment.service';

interface UpiApp {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="pay-page">

      <!-- ── Header ── -->
      <div class="pay-header">
        <button class="pay-back" type="button" (click)="router.navigate(['/account'])">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 class="pay-title">Payment</h2>
      </div>

      <!-- ── RouteX Wallet ── -->
      <section class="pay-section">
        <div class="pay-wallet-card">
          <div class="pay-wallet-left">
            <div class="pay-wallet-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h2"/><path d="M2 10h20"/></svg>
            </div>
            <div>
              <div class="pay-wallet-name">RouteX Wallet</div>
              <div class="pay-wallet-bal">₹{{ walletBalance.toFixed(2) }}</div>
            </div>
          </div>
          <button class="pay-wallet-add" (click)="openAddMoney()">+ Add Money</button>
        </div>

        <!-- Wallet transactions mini list -->
        <div class="pay-wallet-txns" *ngIf="walletTxns.length">
          <div class="pay-txn-header">Recent Wallet Activity</div>
          <div class="pay-txn-row" *ngFor="let t of walletTxns">
            <div class="pay-txn-dot" [class.credit]="t.type === 'credit'"></div>
            <div class="pay-txn-info">
              <div class="pay-txn-label">{{ t.label }}</div>
              <div class="pay-txn-date">{{ t.date }}</div>
            </div>
            <div class="pay-txn-amount" [class.credit]="t.type === 'credit'">
              {{ t.type === 'credit' ? '+' : '-' }}₹{{ t.amount }}
            </div>
          </div>
        </div>
      </section>

      <!-- ── Linked Bank Accounts ── -->
      <section class="pay-section">
        <div class="pay-section-title">
          <span>Linked Bank Accounts</span>
          <button class="pay-add-btn" (click)="showLinkBank = true">+ Add</button>
        </div>
        <div class="pay-empty" *ngIf="linkedAccounts.length === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" width="40" height="40"><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V6a5 5 0 0 1 10 0v4"/></svg>
          <div>No bank accounts linked</div>
          <button class="pay-link-cta" (click)="showLinkBank = true">Link a bank account</button>
        </div>
        <div *ngFor="let acc of linkedAccounts" class="pay-account-row">
          <div class="pay-account-icon">{{ acc.icon }}</div>
          <div class="pay-account-info">
            <div class="pay-account-label">{{ acc.label }}</div>
            <div class="pay-account-detail">{{ acc.detail }}</div>
          </div>
          <div class="pay-account-actions">
            <span class="pay-default-badge" *ngIf="acc.isDefault">Default</span>
            <button *ngIf="!acc.isDefault" class="pay-set-default" (click)="setDefault(acc.id)">Set default</button>
            <button class="pay-remove" (click)="removeAccount(acc.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </section>

      <!-- ── UPI ── -->
      <section class="pay-section">
        <div class="pay-section-title">
          <span>UPI</span>
          <button class="pay-add-btn" (click)="showAddUpi = true">+ Add UPI ID</button>
        </div>
        <div class="pay-upi-id-list" *ngIf="upiIds.length">
          <div class="pay-upi-row" *ngFor="let u of upiIds">
            <div class="pay-upi-at">@</div>
            <div class="pay-upi-info">
              <div class="pay-upi-id">{{ u.id }}</div>
              <div class="pay-upi-name">{{ u.name }}</div>
            </div>
            <div class="pay-account-actions">
              <span class="pay-default-badge" *ngIf="u.isDefault">Default</span>
              <button *ngIf="!u.isDefault" class="pay-set-default" (click)="setUpiDefault(u.id)">Set default</button>
              <button class="pay-remove" (click)="removeUpi(u.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="pay-section-title" style="margin-top:16px;"><span>Pay via UPI App</span></div>
        <div class="pay-upi-apps">
          <button class="pay-upi-app" *ngFor="let app of upiApps" (click)="payViaApp(app)" [style.--app-color]="app.color">
            <div class="pay-upi-app-icon">{{ app.icon }}</div>
            <div class="pay-upi-app-name">{{ app.name }}</div>
          </button>
        </div>
      </section>

      <!-- ── Pay Later ── -->
      <section class="pay-section">
        <div class="pay-option-card pay-later-card" [class.active]="payLaterEnabled" (click)="togglePayLater()">
          <div class="pay-option-icon pay-later-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="pay-option-info">
            <div class="pay-option-title">Pay Later</div>
            <div class="pay-option-sub">{{ payLaterEnabled ? 'Enabled · Limit ₹500' : 'Settle payment after ride' }}</div>
          </div>
          <div class="pay-toggle" [class.on]="payLaterEnabled">
            <div class="pay-toggle-knob"></div>
          </div>
        </div>
        <div class="pay-later-info" *ngIf="payLaterEnabled">
          <div class="pay-later-info-row">
            <span>Credit limit</span><span class="pay-later-val">₹500.00</span>
          </div>
          <div class="pay-later-info-row">
            <span>Used</span><span class="pay-later-val">₹{{ payLaterUsed.toFixed(2) }}</span>
          </div>
          <div class="pay-later-info-row">
            <span>Available</span><span class="pay-later-val green">₹{{ (500 - payLaterUsed).toFixed(2) }}</span>
          </div>
          <div class="pay-later-bar">
            <div class="pay-later-fill" [style.width.%]="(payLaterUsed / 500) * 100"></div>
          </div>
        </div>
      </section>

      <!-- ── Other Methods ── -->
      <section class="pay-section">
        <div class="pay-section-title"><span>Other Payment Methods</span></div>
        <div class="pay-option-card" [class.active]="selectedMethod === 'cash'" (click)="selectedMethod = 'cash'">
          <div class="pay-option-icon cash-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>
          </div>
          <div class="pay-option-info">
            <div class="pay-option-title">Cash</div>
            <div class="pay-option-sub">Pay directly to captain</div>
          </div>
          <div class="pay-radio" [class.on]="selectedMethod === 'cash'"></div>
        </div>

        <div class="pay-option-card" [class.active]="selectedMethod === 'cod'" (click)="selectedMethod = 'cod'">
          <div class="pay-option-icon cod-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><polyline points="9 11 12 14 22 4"/></svg>
          </div>
          <div class="pay-option-info">
            <div class="pay-option-title">Cash on Delivery</div>
            <div class="pay-option-sub">For parcel & food deliveries</div>
          </div>
          <div class="pay-radio" [class.on]="selectedMethod === 'cod'"></div>
        </div>

        <div class="pay-option-card" [class.active]="selectedMethod === 'netbank'" (click)="selectedMethod = 'netbank'">
          <div class="pay-option-icon net-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="pay-option-info">
            <div class="pay-option-title">Net Banking</div>
            <div class="pay-option-sub">Pay directly from your bank</div>
          </div>
          <div class="pay-radio" [class.on]="selectedMethod === 'netbank'"></div>
        </div>
      </section>

      <!-- ── Payment History ── -->
      <section class="pay-section">
        <div class="pay-section-title"><span>Payment History</span></div>
        <div class="pay-history-row" *ngFor="let h of payHistory">
          <div class="pay-hist-icon" [ngClass]="h.mode">
            <svg *ngIf="h.mode==='upi'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            <svg *ngIf="h.mode==='cash'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
            <svg *ngIf="h.mode==='wallet'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M20 12V8H6a2 2 0 0 1 0-4h14v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="17" cy="16" r="1"/></svg>
          </div>
          <div class="pay-hist-info">
            <div class="pay-hist-label">{{ h.label }}</div>
            <div class="pay-hist-date">{{ h.date }} · {{ h.mode | titlecase }}</div>
          </div>
          <div class="pay-hist-amount" [class.refund]="h.refund">{{ h.refund ? '+' : '-' }}₹{{ h.amount }}</div>
        </div>
        <div class="pay-empty" *ngIf="payHistory.length === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" width="40" height="40"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          <div>No payment history yet</div>
        </div>
      </section>
    </div>

    <!-- ══════ ADD MONEY MODAL ══════ -->
    <div class="pay-modal-backdrop" *ngIf="showAddMoneyModal" (click)="showAddMoneyModal = false">
      <div class="pay-modal" (click)="$event.stopPropagation()">
        <div class="pay-modal-title">Add Money to Wallet</div>
        <div class="pay-quick-amounts">
          <button *ngFor="let amt of quickAmounts" (click)="addAmount = amt" [class.selected]="addAmount === amt">₹{{ amt }}</button>
        </div>
        <div class="pay-input-wrap">
          <span class="pay-input-prefix">₹</span>
          <input class="pay-input" type="number" min="1" max="10000" [(ngModel)]="addAmount" placeholder="Enter amount" />
        </div>
        <div class="pay-modal-actions">
          <button class="pay-cancel-btn" (click)="showAddMoneyModal = false">Cancel</button>
          <button class="pay-confirm-btn" (click)="confirmAddMoney()" [disabled]="!addAmount || addAmount < 1">Add ₹{{ addAmount || 0 }}</button>
        </div>
      </div>
    </div>

    <!-- ══════ LINK BANK ACCOUNT MODAL ══════ -->
    <div class="pay-modal-backdrop" *ngIf="showLinkBank" (click)="showLinkBank = false">
      <div class="pay-modal" (click)="$event.stopPropagation()">
        <div class="pay-modal-title">Link Bank Account</div>
        <div class="pay-input-group">
          <label>Account Holder Name</label>
          <input class="pay-input" type="text" [(ngModel)]="bankForm.name" placeholder="Full name as per bank" />
        </div>
        <div class="pay-input-group">
          <label>Account Number</label>
          <input class="pay-input" type="text" [(ngModel)]="bankForm.accNo" placeholder="Enter account number" maxlength="18" />
        </div>
        <div class="pay-input-group">
          <label>IFSC Code</label>
          <input class="pay-input" type="text" [(ngModel)]="bankForm.ifsc" placeholder="e.g. SBIN0001234" maxlength="11" style="text-transform:uppercase" />
        </div>
        <div class="pay-input-group">
          <label>Bank Name</label>
          <input class="pay-input" type="text" [(ngModel)]="bankForm.bankName" placeholder="e.g. State Bank of India" />
        </div>
        <div class="pay-modal-actions">
          <button class="pay-cancel-btn" (click)="showLinkBank = false">Cancel</button>
          <button class="pay-confirm-btn" (click)="confirmLinkBank()" [disabled]="!bankForm.name || !bankForm.accNo || !bankForm.ifsc || !bankForm.bankName">Link Account</button>
        </div>
      </div>
    </div>

    <!-- ══════ ADD UPI MODAL ══════ -->
    <div class="pay-modal-backdrop" *ngIf="showAddUpi" (click)="showAddUpi = false">
      <div class="pay-modal" (click)="$event.stopPropagation()">
        <div class="pay-modal-title">Add UPI ID</div>
        <div class="pay-input-group">
          <label>Your UPI ID</label>
          <input class="pay-input" type="text" [(ngModel)]="newUpiId" placeholder="e.g. name@upi" />
        </div>
        <div class="pay-upi-verify-status" *ngIf="upiVerifyStatus">{{ upiVerifyStatus }}</div>
        <div class="pay-modal-actions">
          <button class="pay-cancel-btn" (click)="showAddUpi = false; newUpiId = ''">Cancel</button>
          <button class="pay-confirm-btn" (click)="confirmAddUpi()" [disabled]="!newUpiId || !newUpiId.includes('@')">Verify & Add</button>
        </div>
      </div>
    </div>

    <!-- ══════ UPI INTENT SHEET ══════ -->
    <div class="pay-modal-backdrop" *ngIf="showUpiSheet" (click)="showUpiSheet = false">
      <div class="pay-bottom-sheet" (click)="$event.stopPropagation()">
        <div class="pay-sheet-handle"></div>
        <div class="pay-modal-title">Pay via {{ selectedUpiApp?.name }}</div>
        <div class="pay-input-group">
          <label>Amount (₹)</label>
          <input class="pay-input" type="number" [(ngModel)]="upiPayAmount" placeholder="Enter amount" />
        </div>
        <div class="pay-input-group">
          <label>Pay to (UPI ID or number)</label>
          <input class="pay-input" type="text" [(ngModel)]="upiPayTo" placeholder="merchant@upi" />
        </div>
        <div class="pay-modal-actions">
          <button class="pay-cancel-btn" (click)="showUpiSheet = false">Cancel</button>
          <button class="pay-confirm-btn" (click)="launchUpiIntent()">Open {{ selectedUpiApp?.name }}</button>
        </div>
      </div>
    </div>

    <!-- ══════ TOAST ══════ -->
    <div class="pay-toast" [class.show]="toastMsg" *ngIf="toastMsg">{{ toastMsg }}</div>
  `,
  styles: [`
    /* ── Base ── */
    .pay-page {
      min-height: 100vh;
      background: #f7f7f9;
      padding-bottom: 80px;
    }

    /* ── Header ── */
    .pay-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 16px 12px;
      background: #fff;
      border-bottom: 1px solid #f0f0f0;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .pay-back {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      color: #1a1a1a;
      transition: background 0.2s;
    }
    .pay-back:hover { background: #f0f0f0; }
    .pay-back svg { width: 22px; height: 22px; }
    .pay-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
    }

    /* ── Sections ── */
    .pay-section {
      background: #fff;
      border-radius: 16px;
      margin: 12px;
      padding: 16px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.06);
    }
    .pay-section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #888;
      margin-bottom: 12px;
    }
    .pay-add-btn {
      background: none;
      border: none;
      color: #ef233c;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .pay-add-btn:hover { background: #fff1f2; }

    /* ── Wallet Card ── */
    .pay-wallet-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #ef233c 0%, #c81d30 100%);
      border-radius: 14px;
      padding: 18px 16px;
      color: #fff;
    }
    .pay-wallet-left { display: flex; align-items: center; gap: 14px; }
    .pay-wallet-icon {
      width: 46px; height: 46px;
      background: rgba(255,255,255,0.18);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .pay-wallet-icon svg { stroke: #fff; }
    .pay-wallet-name { font-size: 0.82rem; opacity: 0.85; font-weight: 500; }
    .pay-wallet-bal { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; }
    .pay-wallet-add {
      background: rgba(255,255,255,0.2);
      border: 1.5px solid rgba(255,255,255,0.4);
      color: #fff;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .pay-wallet-add:hover { background: rgba(255,255,255,0.3); }

    /* Wallet txns */
    .pay-wallet-txns { margin-top: 14px; border-top: 1px solid #f5f5f5; padding-top: 12px; }
    .pay-txn-header { font-size: 0.75rem; color: #aaa; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .pay-txn-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
    .pay-txn-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef233c; flex-shrink: 0; }
    .pay-txn-dot.credit { background: #22c55e; }
    .pay-txn-info { flex: 1; }
    .pay-txn-label { font-size: 0.85rem; font-weight: 500; color: #1a1a1a; }
    .pay-txn-date { font-size: 0.75rem; color: #999; }
    .pay-txn-amount { font-size: 0.9rem; font-weight: 700; color: #ef233c; }
    .pay-txn-amount.credit { color: #22c55e; }

    /* ── Account rows ── */
    .pay-account-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .pay-account-row:last-child { border-bottom: none; }
    .pay-account-icon { font-size: 1.4rem; width: 36px; text-align: center; }
    .pay-account-info { flex: 1; }
    .pay-account-label { font-size: 0.9rem; font-weight: 600; color: #1a1a1a; }
    .pay-account-detail { font-size: 0.78rem; color: #888; margin-top: 2px; }
    .pay-account-actions { display: flex; align-items: center; gap: 8px; }
    .pay-default-badge {
      background: #e8fdf0; color: #22c55e;
      font-size: 0.72rem; font-weight: 700;
      padding: 3px 8px; border-radius: 20px;
    }
    .pay-set-default {
      background: none; border: 1px solid #e0e0e0;
      color: #666; font-size: 0.72rem;
      padding: 3px 8px; border-radius: 20px; cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }
    .pay-set-default:hover { border-color: #ef233c; color: #ef233c; }
    .pay-remove {
      background: none; border: none;
      color: #ccc; cursor: pointer; padding: 4px;
      display: flex; align-items: center;
      transition: color 0.2s;
    }
    .pay-remove:hover { color: #ef233c; }

    /* ── UPI IDs ── */
    .pay-upi-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .pay-upi-at {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: #fff1f2; color: #ef233c;
      font-size: 1rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .pay-upi-info { flex: 1; }
    .pay-upi-id { font-size: 0.88rem; font-weight: 600; color: #1a1a1a; }
    .pay-upi-name { font-size: 0.75rem; color: #888; }

    /* ── UPI Apps ── */
    .pay-upi-apps {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      margin-top: 4px;
    }
    .pay-upi-app {
      background: none; border: 1.5px solid #f0f0f0;
      border-radius: 14px; padding: 12px 4px 8px;
      cursor: pointer; text-align: center;
      transition: border-color 0.2s, background 0.2s, transform 0.15s;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .pay-upi-app:hover {
      border-color: var(--app-color, #ef233c);
      background: #fff8f9;
      transform: translateY(-2px);
    }
    .pay-upi-app-icon { font-size: 1.8rem; line-height: 1; }
    .pay-upi-app-name { font-size: 0.72rem; font-weight: 600; color: #444; }

    /* ── Pay Later ── */
    .pay-option-card {
      display: flex; align-items: center; gap: 12px;
      border: 1.5px solid #f0f0f0;
      border-radius: 12px; padding: 14px;
      margin-bottom: 10px; cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .pay-option-card.active { border-color: #ef233c; background: #fff8f9; }
    .pay-option-card:last-child { margin-bottom: 0; }
    .pay-option-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .pay-later-icon { background: #fef3c7; color: #d97706; }
    .pay-later-icon svg { stroke: #d97706; }
    .cash-icon { background: #f0fdf4; }
    .cash-icon svg { stroke: #22c55e; }
    .cod-icon { background: #eff6ff; }
    .cod-icon svg { stroke: #3b82f6; }
    .net-icon { background: #faf5ff; }
    .net-icon svg { stroke: #8b5cf6; }
    .pay-option-info { flex: 1; }
    .pay-option-title { font-size: 0.92rem; font-weight: 600; color: #1a1a1a; }
    .pay-option-sub { font-size: 0.78rem; color: #888; margin-top: 2px; }

    /* Toggle */
    .pay-toggle {
      width: 42px; height: 24px; border-radius: 12px;
      background: #e0e0e0; position: relative;
      transition: background 0.25s; flex-shrink: 0;
    }
    .pay-toggle.on { background: #ef233c; }
    .pay-toggle-knob {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #fff; transition: transform 0.25s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .pay-toggle.on .pay-toggle-knob { transform: translateX(18px); }

    /* Radio */
    .pay-radio {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid #ddd; flex-shrink: 0;
      transition: border-color 0.2s; position: relative;
    }
    .pay-radio.on { border-color: #ef233c; }
    .pay-radio.on::after {
      content: ''; position: absolute;
      top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 10px; height: 10px; border-radius: 50%;
      background: #ef233c;
    }

    /* Pay later details */
    .pay-later-info {
      background: #fffbeb; border-radius: 10px; padding: 12px 14px;
      margin-top: -2px; margin-bottom: 4px;
    }
    .pay-later-info-row {
      display: flex; justify-content: space-between;
      font-size: 0.84rem; color: #666; padding: 3px 0;
    }
    .pay-later-val { font-weight: 700; color: #1a1a1a; }
    .pay-later-val.green { color: #22c55e; }
    .pay-later-bar {
      height: 6px; background: #f0f0f0; border-radius: 3px;
      margin-top: 10px; overflow: hidden;
    }
    .pay-later-fill { height: 100%; background: #ef233c; border-radius: 3px; transition: width 0.4s; }

    /* ── Payment History ── */
    .pay-history-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid #f5f5f5;
    }
    .pay-history-row:last-child { border-bottom: none; }
    .pay-hist-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .pay-hist-icon.upi { background: #fff1f2; }
    .pay-hist-icon.upi svg { stroke: #ef233c; }
    .pay-hist-icon.cash { background: #f0fdf4; }
    .pay-hist-icon.cash svg { stroke: #22c55e; }
    .pay-hist-icon.wallet { background: #eff6ff; }
    .pay-hist-icon.wallet svg { stroke: #3b82f6; }
    .pay-hist-info { flex: 1; }
    .pay-hist-label { font-size: 0.88rem; font-weight: 600; color: #1a1a1a; }
    .pay-hist-date { font-size: 0.75rem; color: #999; margin-top: 2px; }
    .pay-hist-amount { font-size: 0.9rem; font-weight: 700; color: #ef233c; }
    .pay-hist-amount.refund { color: #22c55e; }

    /* ── Empty states ── */
    .pay-empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 24px 0; color: #bbb; font-size: 0.85rem;
    }
    .pay-link-cta {
      background: none; border: 1.5px solid #ef233c;
      color: #ef233c; border-radius: 20px;
      padding: 8px 20px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; margin-top: 4px;
      transition: background 0.2s;
    }
    .pay-link-cta:hover { background: #fff1f2; }

    /* ── Modals ── */
    .pay-modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 16px;
      backdrop-filter: blur(2px);
    }
    .pay-modal {
      background: #fff; border-radius: 20px;
      padding: 24px; width: 100%; max-width: 400px;
      animation: pay-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes pay-pop {
      from { transform: scale(0.88); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .pay-modal-title {
      font-size: 1rem; font-weight: 700; color: #1a1a1a;
      margin-bottom: 18px;
    }
    .pay-input-group { margin-bottom: 14px; }
    .pay-input-group label {
      display: block; font-size: 0.78rem; font-weight: 600;
      color: #888; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .pay-input-wrap { position: relative; }
    .pay-input-prefix {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      font-weight: 700; color: #888; font-size: 1rem;
    }
    .pay-input {
      width: 100%; box-sizing: border-box;
      border: 1.5px solid #e8e8e8; border-radius: 10px;
      padding: 11px 12px; font-size: 0.95rem;
      outline: none; transition: border-color 0.2s;
      font-family: inherit;
    }
    .pay-input-wrap .pay-input { padding-left: 28px; }
    .pay-input:focus { border-color: #ef233c; }
    .pay-quick-amounts {
      display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;
    }
    .pay-quick-amounts button {
      background: #f5f5f7; border: 1.5px solid transparent;
      border-radius: 20px; padding: 7px 16px;
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
    }
    .pay-quick-amounts button.selected {
      background: #fff1f2; border-color: #ef233c; color: #ef233c;
    }
    .pay-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
    .pay-cancel-btn {
      flex: 1; background: #f5f5f7; border: none;
      border-radius: 10px; padding: 12px;
      font-size: 0.9rem; font-weight: 600; color: #666; cursor: pointer;
    }
    .pay-confirm-btn {
      flex: 2; background: #ef233c; border: none;
      border-radius: 10px; padding: 12px;
      font-size: 0.9rem; font-weight: 600; color: #fff; cursor: pointer;
      transition: background 0.2s;
    }
    .pay-confirm-btn:hover:not(:disabled) { background: #c81d30; }
    .pay-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .pay-upi-verify-status { font-size: 0.82rem; color: #22c55e; margin-top: -8px; margin-bottom: 8px; }

    /* Bottom sheet */
    .pay-bottom-sheet {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: #fff; border-radius: 20px 20px 0 0;
      padding: 8px 20px 32px;
      animation: pay-slide-up 0.28s ease-out;
    }
    @keyframes pay-slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .pay-sheet-handle {
      width: 36px; height: 4px; border-radius: 2px;
      background: #e0e0e0; margin: 8px auto 16px;
    }

    /* Toast */
    .pay-toast {
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1a1a1a; color: #fff;
      padding: 10px 20px; border-radius: 20px;
      font-size: 0.85rem; font-weight: 500;
      opacity: 0; transition: opacity 0.3s, transform 0.3s;
      pointer-events: none; white-space: nowrap; z-index: 300;
    }
    .pay-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  `]
})
export class PaymentComponent implements OnInit {
  walletBalance = 0;
  walletTxns: { label: string; date: string; amount: number; type: 'credit' | 'debit' }[] = [];

  linkedAccounts: LinkedAccount[] = [];
  upiIds: UpiId[] = [];

  upiApps: UpiApp[] = [
    { id: 'gpay',    name: 'GPay',     icon: '🟢', color: '#1a73e8' },
    { id: 'phonepe', name: 'PhonePe',  icon: '🟣', color: '#5f259f' },
    { id: 'paytm',   name: 'Paytm',    icon: '🔵', color: '#00b9f1' },
    { id: 'bhim',    name: 'BHIM',     icon: '🇮🇳', color: '#ff6b00' },
    { id: 'whatsapp',name: 'WhatsApp', icon: '💬', color: '#25d366' },
    { id: 'amazon',  name: 'Amazon',   icon: '📦', color: '#ff9900' },
    { id: 'cred',    name: 'CRED',     icon: '💎', color: '#1a1a2e' },
    { id: 'slice',   name: 'Slice',    icon: '🍕', color: '#7c3aed' },
  ];

  payLaterEnabled = false;
  payLaterUsed = 0;
  selectedMethod = 'cash';

  payHistory: { label: string; date: string; amount: number; mode: string; refund: boolean }[] = [];

  // UI state
  isLoading = true;
  isSaving = false;

  // Modal states
  showAddMoneyModal = false;
  showLinkBank = false;
  showAddUpi = false;
  showUpiSheet = false;
  selectedUpiApp: UpiApp | null = null;

  // Form models
  addAmount: number | null = null;
  quickAmounts = [50, 100, 200, 500];
  bankForm = { name: '', accNo: '', ifsc: '', bankName: '' };
  newUpiId = '';
  upiVerifyStatus = '';
  upiPayAmount: number | null = null;
  upiPayTo = '';

  toastMsg = '';

  constructor(public router: Router, private auth: AuthService, private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.paymentService.getProfile().subscribe({
      next: (profile) => {
        this.walletBalance    = profile.wallet_balance ?? 0;
        this.linkedAccounts   = profile.linked_accounts ?? [];
        this.upiIds           = profile.upi_ids ?? [];
        this.payLaterEnabled  = profile.pay_later_enabled ?? false;
        this.payLaterUsed     = profile.pay_later_used ?? 0;
        this.walletTxns       = profile.wallet_txns ?? [];
        this.payHistory       = profile.pay_history ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Could not load payment data. Check your connection.');
      }
    });
  }

  private save(): void {
    this.isSaving = true;
    this.paymentService.saveProfile({
      wallet_balance:   this.walletBalance,
      linked_accounts:  this.linkedAccounts,
      upi_ids:          this.upiIds,
      pay_later_enabled: this.payLaterEnabled,
      pay_later_used:   this.payLaterUsed,
      wallet_txns:      this.walletTxns,
      pay_history:      this.payHistory,
    }).subscribe({
      next: () => { this.isSaving = false; },
      error: () => { this.isSaving = false; this.showToast('Sync failed — check connection.'); }
    });
  }

  openAddMoney(): void { this.addAmount = null; this.showAddMoneyModal = true; }

  confirmAddMoney(): void {
    if (!this.addAmount || this.addAmount < 1) return;
    const amount = this.addAmount;
    this.showAddMoneyModal = false;
    this.addAmount = null;
    this.paymentService.addMoneyToWallet(amount).subscribe({
      next: (r) => {
        this.walletBalance = r.wallet_balance;
        this.walletTxns.unshift(r.txn as any);
        this.payHistory.unshift({ label: 'Wallet Top-up', date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), amount, mode: 'wallet', refund: true });
        this.showToast(`₹${amount} added to wallet!`);
      },
      error: () => this.showToast('Failed to add money. Try again.')
    });
  }

  confirmLinkBank(): void {
    const masked = '**** ' + this.bankForm.accNo.slice(-4);
    this.linkedAccounts.push({
      id: Date.now().toString(),
      type: 'bank',
      label: this.bankForm.bankName,
      detail: `${this.bankForm.name} · ${masked} · ${this.bankForm.ifsc.toUpperCase()}`,
      icon: '🏦',
      isDefault: this.linkedAccounts.length === 0
    });
    this.save();
    this.showToast('Bank account linked successfully!');
    this.showLinkBank = false;
    this.bankForm = { name: '', accNo: '', ifsc: '', bankName: '' };
  }

  removeAccount(id: string): void {
    this.linkedAccounts = this.linkedAccounts.filter(a => a.id !== id);
    if (!this.linkedAccounts.find(a => a.isDefault) && this.linkedAccounts.length) {
      this.linkedAccounts[0].isDefault = true;
    }
    this.save();
  }

  setDefault(id: string): void {
    this.linkedAccounts.forEach(a => a.isDefault = a.id === id);
    this.save();
  }

  confirmAddUpi(): void {
    if (!this.newUpiId.includes('@')) return;
    this.upiVerifyStatus = '✓ UPI ID verified';
    setTimeout(() => {
      this.upiIds.push({
        id: this.newUpiId,
        name: this.auth.getCurrentUser()?.displayName ?? 'You',
        isDefault: this.upiIds.length === 0
      });
      this.save();
      this.showToast('UPI ID added!');
      this.showAddUpi = false;
      this.newUpiId = '';
      this.upiVerifyStatus = '';
    }, 700);
  }

  removeUpi(id: string): void {
    this.upiIds = this.upiIds.filter(u => u.id !== id);
    if (!this.upiIds.find(u => u.isDefault) && this.upiIds.length) {
      this.upiIds[0].isDefault = true;
    }
    this.save();
  }

  setUpiDefault(id: string): void {
    this.upiIds.forEach(u => u.isDefault = u.id === id);
    this.save();
  }

  payViaApp(app: UpiApp): void {
    this.selectedUpiApp = app;
    this.upiPayAmount = null;
    this.upiPayTo = '';
    this.showUpiSheet = true;
  }

  launchUpiIntent(): void {
    if (!this.upiPayAmount || !this.upiPayTo) return;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(this.upiPayTo)}&pn=RouteX&am=${this.upiPayAmount}&cu=INR`;
    window.location.href = upiUrl;
    this.showUpiSheet = false;
  }

  togglePayLater(): void {
    this.payLaterEnabled = !this.payLaterEnabled;
    this.save();
    this.showToast(this.payLaterEnabled ? 'Pay Later enabled!' : 'Pay Later disabled');
  }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => { this.toastMsg = ''; }, 2800);
  }
}
