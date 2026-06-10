import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type CheckoutStep = 'cart' | 'payment' | 'placed' | 'tracking';
type PayMethod = 'upi' | 'cash' | 'card' | 'wallet';

interface CartItem { item: { id: string; name: string; price: number; imageUrl: string; description: string; customisable?: boolean }; qty: number; }

@Component({
  selector: 'app-food-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="fc-page">

  <!-- ── CART ── -->
  <ng-container *ngIf="step === 'cart'">
    <div class="fc-header">
      <button class="fc-back" (click)="goBack()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div>
        <div class="fc-header-title">{{ restaurantName }}</div>
        <div class="fc-header-sub">{{ etaMin }}-{{ etaMin+5 }} mins to {{ deliveryAddress }}</div>
      </div>
    </div>

    <!-- Savings banner -->
    <div class="fc-saved-bar" *ngIf="totalSaved > 0">
      🎉 You saved <strong>₹{{ totalSaved }}</strong> on this order!
    </div>

    <!-- Cart items -->
    <div class="fc-section">
      <div class="fc-item-row" *ngFor="let c of cart">
        <div class="fc-item-info">
          <div class="fc-item-name">{{ c.item.name }}</div>
          <div class="fc-item-price">₹{{ c.item.price }}</div>
        </div>
        <div class="fc-qty-ctrl">
          <button (click)="changeQty(c, -1)">−</button>
          <span>{{ c.qty }}</span>
          <button (click)="changeQty(c, 1)">+</button>
        </div>
        <div class="fc-item-subtotal">₹{{ c.item.price * c.qty }}</div>
      </div>
    </div>

    <!-- Add more -->
    <button class="fc-add-more" (click)="goBack()">+ Add more items</button>

    <!-- Promo Code -->
    <div class="fc-section fc-promo-section">
      <div class="fc-promo-row">
        <input class="fc-promo-input" [(ngModel)]="promoInput" placeholder="Enter promo code" style="text-transform:uppercase" />
        <button class="fc-promo-apply" (click)="applyPromo()">Apply</button>
      </div>
      <div *ngIf="promoMsg" class="fc-promo-msg" [class.fc-promo-ok]="promoOk">{{ promoMsg }}</div>
      <!-- Quick promo chips -->
      <div class="fc-promo-chips">
        <button *ngFor="let p of quickPromos" class="fc-promo-chip" (click)="promoInput=p; applyPromo()">{{ p }}</button>
      </div>
    </div>

    <!-- Bill details -->
    <div class="fc-section fc-bill">
      <div class="fc-bill-title">Bill Details</div>
      <div class="fc-bill-row"><span>Item Total</span><span>₹{{ itemTotal }}</span></div>
      <div class="fc-bill-row"><span>Delivery Fee</span><span class="fc-green">FREE</span></div>
      <div class="fc-bill-row" *ngIf="promoDiscount > 0"><span>Promo ({{ appliedPromo }})</span><span class="fc-green">−₹{{ promoDiscount }}</span></div>
      <div class="fc-bill-row fc-bill-total"><span>Total</span><span>₹{{ grandTotal }}</span></div>
    </div>

    <div class="fc-place-bar">
      <button class="fc-place-btn" (click)="step='payment'">
        <div class="fc-place-total">₹{{ grandTotal }} TOTAL</div>
        <div>Proceed to Payment ›</div>
      </button>
    </div>
  </ng-container>

  <!-- ── PAYMENT ── -->
  <ng-container *ngIf="step === 'payment'">
    <div class="fc-header">
      <button class="fc-back" (click)="step='cart'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="fc-header-title">Choose Payment</div>
    </div>

    <div class="fc-section">
      <div class="fc-pay-option" *ngFor="let p of payMethods"
        [class.fc-pay-selected]="payMethod === p.id"
        (click)="selectPayMethod(p.id)">
        <div class="fc-pay-icon" [style.background]="p.color + '18'">{{ p.icon }}</div>
        <div class="fc-pay-body">
          <div class="fc-pay-name">{{ p.label }}</div>
          <div class="fc-pay-sub">{{ p.sub }}</div>
        </div>
        <div class="fc-pay-check" *ngIf="payMethod === p.id">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>
    </div>

    <!-- Order note -->
    <div class="fc-section">
      <label class="fc-note-label">Add a note for the restaurant (optional)</label>
      <textarea class="fc-note-input" [(ngModel)]="orderNote" placeholder="e.g. Less spicy, extra napkins…" rows="2"></textarea>
    </div>

    <div class="fc-place-bar">
      <button class="fc-place-btn" [disabled]="placing" (click)="placeOrder()">
        <div class="fc-place-total">₹{{ grandTotal }} TOTAL</div>
        <div *ngIf="!placing">PAY · Place Order ›</div>
        <div *ngIf="placing" class="fc-placing-dots">Placing<span>.</span><span>.</span><span>.</span></div>
      </button>
    </div>
  </ng-container>

  <!-- ── ORDER PLACED ── -->
  <ng-container *ngIf="step === 'placed'">
    <div class="fc-placed-screen">
      <div class="fc-placed-anim">✅</div>
      <h2 class="fc-placed-title">Order Placed!</h2>
      <p class="fc-placed-sub">{{ restaurantName }} has received your order</p>

      <div class="fc-order-card">
        <div class="fc-order-id">Order #{{ orderId }}</div>
        <div class="fc-order-eta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Estimated arrival: <strong>{{ etaMin }}-{{ etaMin + 5 }} mins</strong>
        </div>
        <div class="fc-order-items">
          <div *ngFor="let c of cart" class="fc-order-item-row">
            <span>{{ c.qty }}× {{ c.item.name }}</span>
            <span>₹{{ c.item.price * c.qty }}</span>
          </div>
        </div>
        <div class="fc-order-total-row">
          <span>Total Paid</span>
          <span class="fc-order-total">₹{{ grandTotal }}</span>
        </div>
      </div>

      <button class="fc-track-btn" (click)="startTracking()">
        📍 Track My Order
      </button>
      <button class="fc-home-btn" (click)="goHome()">Back to Home</button>
    </div>
  </ng-container>

  <!-- ── LIVE TRACKING ── -->
  <ng-container *ngIf="step === 'tracking'">
    <div class="fc-track-page">
      <div class="fc-track-header">
        <button class="fc-back" (click)="step='placed'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <div class="fc-track-title">Order #{{ orderId }}</div>
          <div class="fc-track-sub">{{ restaurantName }}</div>
        </div>
        <div class="fc-live-badge">● LIVE</div>
      </div>

      <!-- Map embed -->
      <div class="fc-track-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=78.38,17.43,78.41,17.46&layer=mapnik&marker=17.445,78.395" width="100%" height="100%" frameborder="0" loading="lazy"></iframe>
        <div class="fc-map-rider">🛵</div>
      </div>

      <!-- Status steps -->
      <div class="fc-track-panel">
        <div class="fc-track-handle"></div>

        <div class="fc-track-eta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Arriving in <strong>{{ countdown }} min{{ countdown !== 1 ? 's' : '' }}</strong>
        </div>

        <div class="fc-steps">
          <div class="fc-step" *ngFor="let s of trackingSteps; let i = index" [class.fc-step-done]="currentTrackStep > i" [class.fc-step-active]="currentTrackStep === i">
            <div class="fc-step-icon">{{ s.icon }}</div>
            <div class="fc-step-body">
              <div class="fc-step-title">{{ s.title }}</div>
              <div class="fc-step-time" *ngIf="currentTrackStep >= i">{{ s.time }}</div>
            </div>
            <div class="fc-step-dot" [class.fc-step-dot-done]="currentTrackStep > i" [class.fc-step-dot-active]="currentTrackStep === i"></div>
          </div>
        </div>

        <!-- Captain card -->
        <div class="fc-captain-card" *ngIf="currentTrackStep >= 2">
          <div class="fc-captain-avatar">🏍️</div>
          <div class="fc-captain-info">
            <div class="fc-captain-name">{{ captainName }}</div>
            <div class="fc-captain-sub">Delivery Captain · ⭐ 4.8</div>
          </div>
          <div class="fc-captain-actions">
            <a class="fc-act-btn" [href]="'tel:' + captainPhone">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.8h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 5.56 5.59l1.68-1.68a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </a>
            <a class="fc-act-btn fc-act-chat" [href]="'https://wa.me/' + captainPhone" target="_blank">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </a>
          </div>
        </div>

        <button class="fc-home-btn mt-8" (click)="goHome()">Back to Home</button>
      </div>
    </div>
  </ng-container>

</div>
  `,
  styles: [`
    .fc-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 100px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    .fc-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; position: sticky; top: 0; z-index: 50; }
    .fc-back { background: #f0f0f0; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
    .fc-header-title { font-size: 16px; font-weight: 800; color: #111; }
    .fc-header-sub { font-size: 12px; color: #888; margin-top: 1px; }

    .fc-saved-bar { background: #e8f5e9; padding: 10px 16px; font-size: 13px; color: #2e7d32; border-bottom: 1px solid #c8e6c9; }

    .fc-section { background: #fff; margin-bottom: 10px; padding: 14px 16px; }
    .fc-item-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
    .fc-item-info { flex: 1; }
    .fc-item-name { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 2px; }
    .fc-item-price { font-size: 12px; color: #888; }
    .fc-qty-ctrl { display: flex; align-items: center; border: 1.5px solid #e53935; border-radius: 8px; overflow: hidden; }
    .fc-qty-ctrl button { background: #e53935; color: #fff; border: none; width: 26px; height: 28px; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .fc-qty-ctrl span { width: 28px; text-align: center; font-size: 13px; font-weight: 800; color: #e53935; }
    .fc-item-subtotal { font-size: 14px; font-weight: 700; color: #111; min-width: 40px; text-align: right; }

    .fc-add-more { width: 100%; background: #fff; border: none; color: #e53935; font-size: 14px; font-weight: 700; padding: 12px 16px; cursor: pointer; text-align: left; margin-bottom: 10px; }

    .fc-promo-section {}
    .fc-promo-row { display: flex; gap: 10px; margin-bottom: 8px; }
    .fc-promo-input { flex: 1; border: 1.5px solid #e0e0e0; border-radius: 10px; padding: 10px 14px; font-size: 14px; outline: none; }
    .fc-promo-apply { background: #e53935; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .fc-promo-msg { font-size: 12px; font-weight: 600; padding: 4px 0 8px; }
    .fc-promo-ok { color: #2e7d32; }
    .fc-promo-msg:not(.fc-promo-ok) { color: #e53935; }
    .fc-promo-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .fc-promo-chip { border: 1.5px dashed #e53935; color: #e53935; background: #fff; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }

    .fc-bill { border-radius: 0; }
    .fc-bill-title { font-size: 14px; font-weight: 800; color: #111; margin-bottom: 10px; }
    .fc-bill-row { display: flex; justify-content: space-between; font-size: 13px; color: #555; padding: 5px 0; }
    .fc-bill-total { font-size: 15px; font-weight: 800; color: #111; border-top: 1px dashed #e0e0e0; padding-top: 10px; margin-top: 5px; }
    .fc-green { color: #2e7d32; font-weight: 700; }

    /* Payment */
    .fc-pay-option { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
    .fc-pay-selected { background: #fff5f5; border-radius: 12px; padding: 12px; margin: -4px -4px; }
    .fc-pay-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .fc-pay-body { flex: 1; }
    .fc-pay-name { font-size: 15px; font-weight: 700; color: #111; }
    .fc-pay-sub { font-size: 12px; color: #888; margin-top: 2px; }
    .fc-pay-check { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #e53935; display: flex; align-items: center; justify-content: center; }
    .fc-note-label { font-size: 13px; font-weight: 600; color: #444; display: block; margin-bottom: 6px; }
    .fc-note-input { width: 100%; border: 1.5px solid #e0e0e0; border-radius: 10px; padding: 10px 14px; font-size: 14px; outline: none; resize: none; font-family: inherit; box-sizing: border-box; }

    /* Place button */
    .fc-place-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: #fff; box-shadow: 0 -4px 14px rgba(0,0,0,.08); z-index: 100; padding-bottom: max(12px, calc(env(safe-area-inset-bottom) + 12px)); }
    .fc-place-btn {
      width: 100%; background: linear-gradient(135deg, #e53935, #c62828);
      color: #fff; border: none; border-radius: 14px; padding: 16px 20px;
      font-size: 15px; font-weight: 800; cursor: pointer;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 4px 14px rgba(229,57,53,.3);
    }
    .fc-place-btn:disabled { opacity: .6; cursor: not-allowed; }
    .fc-place-total { font-size: 13px; opacity: .85; }
    .fc-placing-dots span { animation: blink 1.2s infinite; }
    .fc-placing-dots span:nth-child(2) { animation-delay: .2s; }
    .fc-placing-dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: .2; } }

    /* Order placed */
    .fc-placed-screen { text-align: center; padding: 40px 20px 100px; }
    .fc-placed-anim { font-size: 72px; margin-bottom: 16px; animation: pop .4s ease; }
    @keyframes pop { 0% { transform: scale(.5); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
    .fc-placed-title { font-size: 26px; font-weight: 900; color: #111; margin: 0 0 6px; }
    .fc-placed-sub { font-size: 14px; color: #888; margin-bottom: 24px; }
    .fc-order-card { background: #fff; border-radius: 18px; padding: 18px; margin-bottom: 20px; text-align: left; box-shadow: 0 2px 14px rgba(0,0,0,.07); }
    .fc-order-id { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; margin-bottom: 8px; }
    .fc-order-eta { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #444; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px dashed #f0f0f0; }
    .fc-order-item-row { display: flex; justify-content: space-between; font-size: 13px; color: #555; padding: 4px 0; }
    .fc-order-total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #111; padding-top: 12px; margin-top: 8px; border-top: 1px solid #f0f0f0; }
    .fc-order-total { color: #e53935; }
    .fc-track-btn { width: 100%; background: #e53935; color: #fff; border: none; border-radius: 14px; padding: 16px; font-size: 15px; font-weight: 800; cursor: pointer; margin-bottom: 12px; }
    .fc-home-btn { width: 100%; background: #f5f5f5; color: #444; border: none; border-radius: 14px; padding: 14px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .mt-8 { margin-top: 8px; }

    /* Tracking */
    .fc-track-page { display: flex; flex-direction: column; height: 100vh; }
    .fc-track-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
    .fc-track-title { font-size: 15px; font-weight: 800; color: #111; }
    .fc-track-sub { font-size: 12px; color: #888; }
    .fc-live-badge { margin-left: auto; background: #fdeaea; color: #e53935; font-size: 11px; font-weight: 900; padding: 4px 10px; border-radius: 20px; animation: pulse .8s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

    .fc-track-map { flex: 1; position: relative; min-height: 0; background: #e8edf2; }
    .fc-track-map iframe { position: absolute; inset: 0; width: 100%; height: 100%; }
    .fc-map-rider { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; filter: drop-shadow(0 2px 6px rgba(0,0,0,.3)); }

    .fc-track-panel { background: #fff; border-radius: 22px 22px 0 0; padding: 10px 16px 80px; flex-shrink: 0; box-shadow: 0 -4px 20px rgba(0,0,0,.1); }
    .fc-track-handle { width: 36px; height: 4px; background: #e0e0e0; border-radius: 2px; margin: 0 auto 14px; }
    .fc-track-eta { display: flex; align-items: center; gap: 6px; font-size: 15px; color: #333; font-weight: 600; margin-bottom: 16px; padding: 12px; background: #fdeaea; border-radius: 12px; }

    .fc-steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 16px; }
    .fc-step { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; position: relative; }
    .fc-step-icon { font-size: 22px; flex-shrink: 0; width: 32px; }
    .fc-step-body { flex: 1; }
    .fc-step-title { font-size: 14px; font-weight: 700; color: #aaa; }
    .fc-step-done .fc-step-title { color: #2e7d32; }
    .fc-step-active .fc-step-title { color: #111; }
    .fc-step-time { font-size: 11px; color: #aaa; margin-top: 2px; }
    .fc-step-dot { width: 12px; height: 12px; border-radius: 50%; background: #ddd; flex-shrink: 0; margin-top: 4px; }
    .fc-step-dot-done { background: #2e7d32; }
    .fc-step-dot-active { background: #e53935; animation: pulse .8s ease-in-out infinite; }

    .fc-captain-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: #fafafa; border-radius: 14px; margin-bottom: 10px; border: 1px solid #f0f0f0; }
    .fc-captain-avatar { font-size: 28px; flex-shrink: 0; }
    .fc-captain-info { flex: 1; }
    .fc-captain-name { font-size: 15px; font-weight: 800; color: #111; }
    .fc-captain-sub { font-size: 12px; color: #888; margin-top: 2px; }
    .fc-captain-actions { display: flex; gap: 8px; }
    .fc-act-btn { width: 38px; height: 38px; border-radius: 50%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; text-decoration: none; color: #2e7d32; }
    .fc-act-chat { background: #e3f2fd; color: #0277bd; }
  `]
})
export class FoodCartComponent implements OnInit {
  step: CheckoutStep = 'cart';
  cart: CartItem[] = [];
  restaurantName = 'Restaurant';
  etaMin = 30;
  deliveryAddress = 'Home';
  orderId = '';
  placing = false;
  countdown = 30;
  currentTrackStep = 0;
  captainName = 'Ravi Kumar';
  captainPhone = '+919000000001';

  payMethod: PayMethod = 'upi' as PayMethod;
  promoInput = '';
  promoMsg = '';
  promoOk = false;
  appliedPromo = '';
  promoDiscount = 0;
  orderNote = '';

  readonly quickPromos = ['RIDER50', 'FAST25', 'FIRST100'];

  readonly payMethods = [
    { id: 'upi',    label: 'UPI / GPay',         sub: 'PhonePe, Google Pay, Paytm', icon: '📱', color: '#6a1b9a' },
    { id: 'card',   label: 'Debit / Credit Card', sub: 'Visa, Mastercard, RuPay',    icon: '💳', color: '#1565c0' },
    { id: 'cash',   label: 'Cash on Delivery',    sub: 'Pay the captain directly',    icon: '💵', color: '#2e7d32' },
    { id: 'wallet', label: 'RouteX Wallet',        sub: 'Instant, zero failures',      icon: '👜', color: '#e53935' },
  ];

  readonly trackingSteps = [
    { icon: '✅', title: 'Order Confirmed',      time: 'Just now' },
    { icon: '👨‍🍳', title: 'Restaurant Preparing', time: '+5 mins' },
    { icon: '🏍️', title: 'Captain Picked Up',   time: '+20 mins' },
    { icon: '📦', title: 'Out for Delivery',     time: '+25 mins' },
    { icon: '🏠', title: 'Delivered',            time: '+30 mins' },
  ];

  get itemTotal(): number { return this.cart.reduce((s, c) => s + c.item.price * c.qty, 0); }
  get totalSaved(): number { return 0; }
  get grandTotal(): number { return Math.max(0, this.itemTotal - this.promoDiscount); }

  constructor(public router: Router, private zone: NgZone, private auth: AuthService) {}

  ngOnInit(): void {
    const state = history.state;
    if (state?.cart) this.cart = state.cart;
    if (state?.restaurant) {
      this.restaurantName = state.restaurant.name;
      this.etaMin = state.restaurant.etaMin ?? 30;
    }
    const user = this.auth.getCurrentUser();
    this.deliveryAddress = user?.displayName ? 'Home' : 'Your location';
  }

  selectPayMethod(id: string): void { this.payMethod = id as PayMethod; }

  changeQty(c: CartItem, delta: number): void {
    c.qty += delta;
    if (c.qty <= 0) this.cart = this.cart.filter(x => x !== c);
    else this.cart = [...this.cart];
  }

  applyPromo(): void {
    const code = this.promoInput.trim().toUpperCase();
    const promos: Record<string, number> = { RIDER50: 50, FAST25: 25, FIRST100: 100, FRESHNOW: 30, CARE10: 20 };
    if (!code) return;
    if (promos[code]) {
      this.promoDiscount = Math.min(promos[code], this.itemTotal);
      this.appliedPromo = code;
      this.promoOk = true;
      this.promoMsg = `✓ ${code} applied! Saved ₹${this.promoDiscount}`;
    } else {
      this.promoDiscount = 0;
      this.appliedPromo = '';
      this.promoOk = false;
      this.promoMsg = '✕ Invalid promo code';
    }
  }

  placeOrder(): void {
    this.placing = true;
    this.orderId = `RXF${Date.now().toString().slice(-6)}`;
    setTimeout(() => {
      this.zone.run(() => {
        this.placing = false;
        this.step = 'placed';
      });
    }, 1800);
  }

  startTracking(): void {
    this.step = 'tracking';
    this.countdown = this.etaMin;
    // Simulate tracking progress
    let step = 0;
    const interval = setInterval(() => {
      this.zone.run(() => {
        if (step < this.trackingSteps.length - 1) {
          step++;
          this.currentTrackStep = step;
          this.countdown = Math.max(0, this.etaMin - step * 6);
        } else {
          clearInterval(interval);
        }
      });
    }, 8000);
  }

  goBack(): void {
    if (history.state?.restaurant) {
      this.router.navigate(['/food/restaurant', history.state.restaurant.id]);
    } else {
      this.router.navigate(['/food']);
    }
  }

  goHome(): void { this.router.navigate(['/home']); }
}
