import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface Claim {
  id: string;
  claimType: string;
  bookingId: string;
  description: string;
  contactPreference: string;
  status: 'Pending' | 'In Review' | 'Resolved';
  submittedAt: string;
}

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="claims-page">
      <div class="claims-wrap">
        <header class="claims-header">
          <button type="button" class="back-btn" (click)="router.navigate(['/account'])">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <p class="kicker">Support Resolution</p>
            <h2>Claims & Support</h2>
          </div>
        </header>

        <section class="panel">
          <h3>New Claim</h3>

          <div class="success-banner" *ngIf="submitSuccess">
            Your claim has been submitted. We will get back to you within 24 hours.
          </div>

          <div class="form-block">
            <label>Claim Type <span>*</span></label>
            <div class="claim-type-grid">
              <label *ngFor="let type of claimTypes" class="claim-type-item">
                <input type="radio" [(ngModel)]="newClaim.claimType" [value]="type" name="claimType">
                <span>{{ type }}</span>
              </label>
            </div>
          </div>

          <div class="form-block">
            <label>Booking ID</label>
            <input [(ngModel)]="newClaim.bookingId" placeholder="e.g. RX20240001">
          </div>

          <div class="form-block">
            <label>Description <span>*</span></label>
            <textarea [(ngModel)]="newClaim.description" rows="4" placeholder="Describe your issue in detail..."></textarea>
          </div>

          <div class="form-block">
            <label>Preferred Contact</label>
            <div class="contact-pref-row">
              <label *ngFor="let pref of contactPrefs" class="pref-item">
                <input type="radio" [(ngModel)]="newClaim.contactPreference" [value]="pref" name="contactPref">
                <span>{{ pref }}</span>
              </label>
            </div>
          </div>

          <button class="submit-btn" (click)="submitClaim()" [disabled]="!newClaim.claimType || !newClaim.description">Submit Claim</button>
        </section>

        <section *ngIf="claimsHistory.length > 0" class="history-section">
          <h3>My Claims</h3>
          <article class="claim-card" *ngFor="let claim of claimsHistory">
            <div class="claim-top">
              <div>
                <div class="claim-title">{{ claim.claimType }}</div>
                <div class="claim-date">{{ claim.submittedAt }}</div>
              </div>
              <span class="claim-status" [style.background]="statusColor(claim.status)">{{ claim.status }}</span>
            </div>
            <div *ngIf="claim.bookingId" class="claim-booking">Booking: {{ claim.bookingId }}</div>
            <div class="claim-description">{{ claim.description }}</div>
          </article>
        </section>

        <div *ngIf="claimsHistory.length === 0" class="empty-state">No claims submitted yet.</div>
      </div>
    </section>
  `,
  styles: [
    `
      .claims-page {
        min-height: 100vh;
        background: linear-gradient(140deg, #09101a 0%, #101827 48%, #0b1712 100%);
        padding: 16px 12px 100px;
      }

      .claims-wrap {
        max-width: 720px;
        margin: 0 auto;
      }

      .claims-header {
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
        color: #fdba74;
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      h2, h3 {
        margin: 0;
        color: #f8fbff;
      }

      .panel,
      .claim-card,
      .empty-state {
        background: linear-gradient(160deg, rgba(10, 14, 24, 0.92) 0%, rgba(16, 23, 36, 0.86) 100%);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 18px 38px rgba(2,6,14,0.38);
        color: #eef4fc;
      }

      .panel {
        margin-bottom: 16px;
      }

      .success-banner {
        background: rgba(34,197,94,0.12);
        border: 1px solid rgba(34,197,94,0.24);
        border-radius: 12px;
        padding: 12px 14px;
        color: #bbf7d0;
        margin: 14px 0 16px;
      }

      .form-block {
        margin-bottom: 14px;
      }

      .form-block label {
        display: block;
        font-size: 0.84rem;
        font-weight: 600;
        color: #cbd8ea;
        margin-bottom: 8px;
      }

      .form-block label span {
        color: #fca5a5;
      }

      input,
      textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 12px;
        padding: 11px 14px;
        font-size: 0.92rem;
        outline: none;
        background: rgba(8,13,24,0.82);
        color: #f6f9ff;
      }

      textarea {
        resize: vertical;
      }

      .claim-type-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .claim-type-item,
      .pref-item {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.86rem;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 10px;
        padding: 10px;
        color: #d9e4f3;
      }

      .contact-pref-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .submit-btn {
        width: 100%;
        border: none;
        border-radius: 14px;
        padding: 14px;
        background: linear-gradient(130deg, #f97316 0%, #ea580c 100%);
        color: #fff;
        font-size: 1rem;
        font-weight: 800;
        cursor: pointer;
      }

      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .history-section h3 {
        margin-bottom: 14px;
      }

      .claim-card {
        margin-bottom: 12px;
      }

      .claim-top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .claim-title {
        font-size: 0.96rem;
        font-weight: 700;
        color: #f8fbff;
      }

      .claim-date,
      .claim-booking {
        font-size: 0.78rem;
        color: #9fb1c8;
      }

      .claim-status {
        color: #fff;
        border-radius: 999px;
        padding: 4px 12px;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .claim-description {
        color: #d2dceb;
        line-height: 1.5;
        font-size: 0.88rem;
      }

      .empty-state {
        text-align: center;
        color: #9fb1c8;
      }

      @media (max-width: 768px) {
        .claim-type-grid {
          grid-template-columns: 1fr;
        }

        .contact-pref-row,
        .claim-top {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `
  ]
})
export class ClaimsComponent implements OnInit {
  claimsHistory: Claim[] = [];
  submitSuccess = false;

  claimTypes = ['Refund Request', 'Lost Item', 'Ride Issue', 'Billing Error', 'Driver Misconduct', 'Other'];
  contactPrefs = ['Email', 'Phone', 'WhatsApp'];

  newClaim = {
    claimType: '',
    bookingId: '',
    description: '',
    contactPreference: 'Email'
  };

  constructor(public router: Router, private auth: AuthService) {}

  ngOnInit() {
    try {
      const stored = localStorage.getItem('rx_claims');
      this.claimsHistory = stored ? JSON.parse(stored) : [];
    } catch {
      this.claimsHistory = [];
    }
  }

  submitClaim() {
    if (!this.newClaim.claimType || !this.newClaim.description) return;
    const claim: Claim = {
      id: 'CLM' + Date.now(),
      claimType: this.newClaim.claimType,
      bookingId: this.newClaim.bookingId,
      description: this.newClaim.description,
      contactPreference: this.newClaim.contactPreference,
      status: 'Pending',
      submittedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    this.claimsHistory = [claim, ...this.claimsHistory];
    localStorage.setItem('rx_claims', JSON.stringify(this.claimsHistory));
    this.newClaim = { claimType: '', bookingId: '', description: '', contactPreference: 'Email' };
    this.submitSuccess = true;
    setTimeout(() => this.submitSuccess = false, 5000);
  }

  statusColor(status: string): string {
    if (status === 'Resolved') return '#16a34a';
    if (status === 'In Review') return '#1e88e5';
    return '#f97316';
  }
}
