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
    <div style="max-width:600px;margin:0 auto;padding:16px 12px 80px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <button (click)="router.navigate(['/account'])" style="background:none;border:none;cursor:pointer;padding:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style="margin:0;font-size:1.4rem;font-weight:700;color:#f97316;">Claims & Support 📋</h2>
      </div>

      <!-- New Claim Form -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#f97316;margin:0 0 16px;">New Claim</h3>

        <div *ngIf="submitSuccess" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:12px 16px;color:#065f46;font-size:0.9rem;margin-bottom:16px;">
          ✅ Your claim has been submitted! We'll get back to you within 24 hours.
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:0.85rem;font-weight:600;color:#444;display:block;margin-bottom:8px;">Claim Type <span style="color:#e53935;">*</span></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label *ngFor="let type of claimTypes" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px;">
              <input type="radio" [(ngModel)]="newClaim.claimType" [value]="type" name="claimType" style="accent-color:#f97316;">
              {{ type }}
            </label>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:0.85rem;font-weight:600;color:#444;display:block;margin-bottom:6px;">Booking ID</label>
          <input [(ngModel)]="newClaim.bookingId" placeholder="e.g. RX20240001"
            style="width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;font-size:0.9rem;outline:none;box-sizing:border-box;">
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:0.85rem;font-weight:600;color:#444;display:block;margin-bottom:6px;">Description <span style="color:#e53935;">*</span></label>
          <textarea [(ngModel)]="newClaim.description" rows="3" placeholder="Describe your issue in detail..."
            style="width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;font-size:0.9rem;outline:none;resize:none;box-sizing:border-box;"></textarea>
        </div>

        <div style="margin-bottom:20px;">
          <label style="font-size:0.85rem;font-weight:600;color:#444;display:block;margin-bottom:8px;">Preferred Contact</label>
          <div style="display:flex;gap:12px;">
            <label *ngFor="let pref of contactPrefs" style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;">
              <input type="radio" [(ngModel)]="newClaim.contactPreference" [value]="pref" name="contactPref" style="accent-color:#f97316;">
              {{ pref }}
            </label>
          </div>
        </div>

        <button (click)="submitClaim()" [disabled]="!newClaim.claimType || !newClaim.description"
          [style.opacity]="!newClaim.claimType || !newClaim.description ? '0.6' : '1'"
          style="width:100%;background:#f97316;color:#fff;border:none;border-radius:12px;padding:14px;font-size:1rem;font-weight:700;cursor:pointer;">
          Submit Claim
        </button>
      </div>

      <!-- My Claims -->
      <div *ngIf="claimsHistory.length > 0">
        <h3 style="font-size:1rem;font-weight:700;color:#f97316;margin:0 0 14px;">My Claims</h3>
        <div *ngFor="let claim of claimsHistory"
          style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div>
              <div style="font-size:0.9rem;font-weight:700;color:#1a1a1a;">{{ claim.claimType }}</div>
              <div style="font-size:0.75rem;color:#999;margin-top:2px;">{{ claim.submittedAt }}</div>
            </div>
            <span [style.background]="statusColor(claim.status)"
              style="color:#fff;border-radius:20px;padding:4px 12px;font-size:0.72rem;font-weight:700;">
              {{ claim.status }}
            </span>
          </div>
          <div *ngIf="claim.bookingId" style="font-size:0.8rem;color:#666;margin-bottom:4px;">Booking: {{ claim.bookingId }}</div>
          <div style="font-size:0.85rem;color:#444;line-height:1.5;">{{ claim.description }}</div>
        </div>
      </div>

      <div *ngIf="claimsHistory.length === 0" style="text-align:center;padding:40px 20px;color:#999;font-size:0.9rem;">
        No claims submitted yet.
      </div>
    </div>
  `
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
