import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-safety',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="safety-page">
      <div class="safety-wrap">
        <header class="safety-header">
          <button type="button" class="back-btn" (click)="router.navigate(['/account'])">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <p class="kicker">Protected Travel</p>
            <h2>Women Safety Ride</h2>
          </div>
        </header>

        <section class="hero-card">
          <p>Your safety is our priority. <strong>Women Safety Mode</strong> prioritizes trusted, high-rated captains for protected booking flows.</p>
        </section>

        <section class="panel toggle-panel">
          <div>
            <div class="panel-title">Women Safety Mode</div>
            <div class="panel-sub">{{ safetyModeEnabled ? 'Active — trusted captains prioritized first' : 'Activate protected travel routing' }}</div>
          </div>
          <button type="button" class="toggle-btn" [class.active]="safetyModeEnabled" (click)="toggleSafetyMode()">
            {{ safetyModeEnabled ? 'Enabled' : 'Enable' }}
          </button>
        </section>

        <section class="panel">
          <h3>Safety Tips</h3>
          <div class="tip-list">
            <div class="tip-item" *ngFor="let tip of safetyTips; let i = index">
              <span class="tip-index">{{ i + 1 }}</span>
              <span class="tip-text">{{ tip }}</span>
            </div>
          </div>
        </section>

        <button type="button" class="cta-btn" (click)="bookSafetyRide()">Book Safety Ride Now</button>

        <section class="panel">
          <h3>Emergency Contacts</h3>
          <div class="contact-grid">
            <a class="contact-card" *ngFor="let contact of emergencyContacts" [href]="'tel:' + contact.number">
              <div class="contact-icon">{{ contact.icon }}</div>
              <div class="contact-number">{{ contact.number }}</div>
              <div class="contact-label">{{ contact.label }}</div>
              <span class="contact-call">Call</span>
            </a>
          </div>
        </section>

        <div *ngIf="toastMsg" class="toast-msg">{{ toastMsg }}</div>
      </div>
    </section>
  `,
  styles: [
    `
      .safety-page {
        min-height: 100vh;
        background: linear-gradient(140deg, #09101a 0%, #101827 48%, #0b1712 100%);
        padding: 16px 12px 100px;
      }

      .safety-wrap {
        max-width: 680px;
        margin: 0 auto;
      }

      .safety-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 18px;
      }

      .back-btn {
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: #eef4fc;
        border-radius: 12px;
        width: 42px;
        height: 42px;
        cursor: pointer;
      }

      .kicker {
        margin: 0;
        color: #fda4af;
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      h2, h3 {
        margin: 0;
        color: #f8fbff;
      }

      .hero-card,
      .panel {
        background: linear-gradient(160deg, rgba(10, 14, 24, 0.92) 0%, rgba(16, 23, 36, 0.86) 100%);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 18px 38px rgba(2,6,14,0.38);
        color: #eef4fc;
        margin-bottom: 16px;
      }

      .hero-card {
        background: linear-gradient(135deg, #ea384c 0%, #c62828 100%);
      }

      .hero-card p {
        margin: 0;
        line-height: 1.6;
      }

      .toggle-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
      }

      .panel-title {
        font-weight: 700;
        color: #f8fbff;
      }

      .panel-sub {
        color: #9fb1c8;
        font-size: 0.84rem;
        margin-top: 4px;
      }

      .toggle-btn {
        border: none;
        border-radius: 999px;
        padding: 10px 18px;
        background: rgba(255,255,255,0.14);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .toggle-btn.active {
        background: linear-gradient(130deg, #ea384c 0%, #f9734f 100%);
      }

      .tip-list {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .tip-item {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }

      .tip-item:last-child {
        border-bottom: none;
      }

      .tip-index {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(234,56,76,0.18);
        color: #fda4af;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.78rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      .tip-text {
        color: #d2dceb;
        line-height: 1.5;
      }

      .cta-btn {
        width: 100%;
        border: none;
        border-radius: 16px;
        padding: 16px;
        background: linear-gradient(130deg, #ea384c 0%, #f9734f 100%);
        color: #fff;
        font-size: 1rem;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 16px 30px rgba(234,56,76,0.24);
        margin-bottom: 16px;
      }

      .contact-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .contact-card {
        text-decoration: none;
        color: inherit;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        padding: 16px 10px;
        text-align: center;
      }

      .contact-icon {
        font-size: 1.35rem;
        margin-bottom: 6px;
      }

      .contact-number {
        font-size: 1.05rem;
        font-weight: 800;
        color: #f8fbff;
      }

      .contact-label {
        font-size: 0.74rem;
        color: #9fb1c8;
        margin-top: 4px;
      }

      .contact-call {
        display: inline-block;
        margin-top: 10px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(234,56,76,0.16);
        color: #fda4af;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .toast-msg {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 94px;
        background: rgba(8, 12, 20, 0.94);
        color: #fff;
        padding: 10px 18px;
        border-radius: 999px;
        font-size: 0.85rem;
        z-index: 9999;
        border: 1px solid rgba(255,255,255,0.14);
      }

      @media (max-width: 768px) {
        .toggle-panel {
          flex-direction: column;
          align-items: stretch;
        }

        .contact-grid {
          grid-template-columns: 1fr;
        }

        .toast-msg {
          width: calc(100% - 24px);
          text-align: center;
        }
      }
    `
  ]
})
export class SafetyComponent implements OnInit {
  safetyModeEnabled = false;
  toastMsg = '';

  safetyTips = [
    'Share your live ride location with a trusted family member',
    'Check captain rating and reviews before boarding',
    'Use the in-app SOS button during emergencies',
    'Verify captain name and vehicle details before entering',
    'Avoid sharing personal information with the captain'
  ];

  emergencyContacts = [
    { icon: '🚨', number: '112', label: 'Emergency' },
    { icon: '👮', number: '100', label: 'Police' },
    { icon: '🆘', number: '1091', label: 'Women Helpline' }
  ];

  constructor(public router: Router, private auth: AuthService) {}

  ngOnInit() {
    this.safetyModeEnabled = localStorage.getItem('rx_women_safety_mode') === 'true';
  }

  toggleSafetyMode() {
    this.safetyModeEnabled = !this.safetyModeEnabled;
    localStorage.setItem('rx_women_safety_mode', String(this.safetyModeEnabled));
    this.showToast(this.safetyModeEnabled ? '🛡️ Women Safety Mode Enabled!' : 'Safety Mode Disabled');
  }

  bookSafetyRide() {
    this.router.navigate(['/booking'], { queryParams: { womenSafety: 1, service: 'parcel' } });
  }

  private showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

