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
    <div class="safety-page" style="max-width:600px;margin:0 auto;padding:16px 12px 80px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <button (click)="router.navigate(['/account'])" style="background:none;border:none;cursor:pointer;padding:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style="margin:0;font-size:1.4rem;font-weight:700;color:#e53935;">Women Safety Ride 🛡️</h2>
      </div>

      <!-- Info Card -->
      <div style="background:linear-gradient(135deg,#e53935,#c62828);border-radius:16px;padding:20px;color:#fff;margin-bottom:20px;">
        <p style="margin:0;font-size:0.95rem;line-height:1.6;">Your safety is our top priority. <strong>Women Safety Mode</strong> assigns top-trusted, highest-rated captains exclusively to women passengers.</p>
      </div>

      <!-- Toggle -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-weight:700;font-size:1rem;color:#1a1a1a;">Women Safety Mode</div>
          <div style="font-size:0.8rem;color:#888;margin-top:2px;">{{ safetyModeEnabled ? 'Active — Only trusted captains assigned' : 'Tap to activate protection' }}</div>
        </div>
        <button (click)="toggleSafetyMode()" [style.background]="safetyModeEnabled ? '#e53935' : '#e0e0e0'" style="border:none;border-radius:30px;padding:10px 22px;color:#fff;font-weight:700;cursor:pointer;transition:all 0.3s;font-size:0.85rem;">
          {{ safetyModeEnabled ? '✅ Enabled' : 'Enable' }}
        </button>
      </div>

      <!-- Safety Tips -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#e53935;margin:0 0 14px;">Safety Tips</h3>
        <div *ngFor="let tip of safetyTips; let i = index" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #f5f5f5;" [style.border-bottom]="i === safetyTips.length-1 ? 'none' : '1px solid #f5f5f5'">
          <span style="background:#fce4ec;color:#e53935;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;">{{ i+1 }}</span>
          <span style="font-size:0.9rem;color:#333;line-height:1.5;">{{ tip }}</span>
        </div>
      </div>

      <!-- Book Safety Ride -->
      <button (click)="bookSafetyRide()" style="width:100%;background:#e53935;color:#fff;border:none;border-radius:14px;padding:16px;font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:20px;">
        🚗 Book Safety Ride Now
      </button>

      <!-- Emergency Contacts -->
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#e53935;margin:0 0 14px;">Emergency Contacts</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          <div *ngFor="let contact of emergencyContacts" style="background:#fce4ec;border-radius:12px;padding:16px 8px;text-align:center;">
            <div style="font-size:1.4rem;margin-bottom:6px;">{{ contact.icon }}</div>
            <div style="font-size:1.1rem;font-weight:800;color:#e53935;">{{ contact.number }}</div>
            <div style="font-size:0.72rem;color:#666;margin-top:4px;">{{ contact.label }}</div>
            <a [href]="'tel:' + contact.number" style="display:block;margin-top:8px;background:#e53935;color:#fff;border-radius:8px;padding:6px 4px;font-size:0.75rem;text-decoration:none;font-weight:600;">Call</a>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div *ngIf="toastMsg" style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:30px;font-size:0.85rem;z-index:9999;">{{ toastMsg }}</div>
    </div>
  `
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

