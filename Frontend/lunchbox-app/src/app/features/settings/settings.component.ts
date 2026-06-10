import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:600px;margin:0 auto;padding:16px 12px 80px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <button (click)="router.navigate(['/account'])" style="background:none;border:none;cursor:pointer;padding:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" width="24" height="24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style="margin:0;font-size:1.4rem;font-weight:700;color:#1a1a1a;">Settings ⚙️</h2>
      </div>

      <!-- Saved Places -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#475569;margin:0 0 16px;">📍 Saved Places</h3>
        <div style="margin-bottom:14px;">
          <label style="font-size:0.85rem;font-weight:600;color:#444;display:block;margin-bottom:6px;">🏠 Home</label>
          <div style="display:flex;gap:8px;">
            <input [(ngModel)]="homeAddress" placeholder="Enter home address" style="flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;font-size:0.9rem;outline:none;">
            <button (click)="saveHome()" style="background:#475569;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:0.85rem;font-weight:600;">Save</button>
          </div>
        </div>
        <div>
          <label style="font-size:0.85rem;font-weight:600;color:#444;display:block;margin-bottom:6px;">💼 Work</label>
          <div style="display:flex;gap:8px;">
            <input [(ngModel)]="workAddress" placeholder="Enter work address" style="flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;font-size:0.9rem;outline:none;">
            <button (click)="saveWork()" style="background:#475569;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:0.85rem;font-weight:600;">Save</button>
          </div>
        </div>
      </div>

      <!-- Preferences -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#475569;margin:0 0 16px;">⚙️ Preferences</h3>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f0f0;">
          <div>
            <div style="font-size:0.9rem;font-weight:600;color:#1a1a1a;">Theme</div>
            <div style="font-size:0.75rem;color:#999;margin-top:2px;">{{ isDark ? 'Dark Mode' : 'Light Mode' }}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button (click)="setTheme('light')" [style.background]="!isDark ? '#1a1a1a' : '#e5e7eb'" [style.color]="!isDark ? '#fff' : '#444'" style="border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:0.8rem;font-weight:600;">Light</button>
            <button (click)="setTheme('dark')" [style.background]="isDark ? '#1a1a1a' : '#e5e7eb'" [style.color]="isDark ? '#fff' : '#444'" style="border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:0.8rem;font-weight:600;">Dark</button>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f0f0;">
          <div>
            <div style="font-size:0.9rem;font-weight:600;color:#1a1a1a;">Notifications</div>
            <div style="font-size:0.75rem;color:#999;margin-top:2px;">{{ notificationsOn ? 'Enabled' : 'Disabled' }}</div>
          </div>
          <button (click)="toggleNotifications()" [style.background]="notificationsOn ? '#22c55e' : '#e5e7eb'" style="border:none;border-radius:30px;padding:8px 20px;cursor:pointer;color:#fff;font-weight:700;font-size:0.8rem;transition:all 0.3s;">
            {{ notificationsOn ? 'On' : 'Off' }}
          </button>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;">
          <div>
            <div style="font-size:0.9rem;font-weight:600;color:#1a1a1a;">Language</div>
          </div>
          <select [(ngModel)]="selectedLanguage" (ngModelChange)="saveLanguage()" style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:0.85rem;outline:none;background:#fff;">
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Telugu">Telugu</option>
          </select>
        </div>
      </div>

      <!-- App Shortcuts -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#475569;margin:0 0 16px;">⚡ App Shortcuts</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
          <button *ngFor="let shortcut of shortcuts" (click)="router.navigate([shortcut.route])"
            style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px 8px;text-align:center;cursor:pointer;">
            <div style="font-size:1.4rem;">{{ shortcut.icon }}</div>
            <div style="font-size:0.75rem;color:#475569;font-weight:600;margin-top:4px;">{{ shortcut.label }}</div>
          </button>
        </div>
      </div>

      <!-- Account Info -->
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size:1rem;font-weight:700;color:#475569;margin:0 0 14px;">ℹ️ About</h3>
        <div style="font-size:0.9rem;color:#666;">App Version: <strong>RouteX v2.4.1 (Build 2024)</strong></div>
      </div>

      <!-- Delete Account -->
      <button (click)="showDeleteModal = true" style="width:100%;background:#fff;color:#e53935;border:2px solid #e53935;border-radius:14px;padding:14px;font-size:0.95rem;font-weight:700;cursor:pointer;">
        🗑️ Delete Account
      </button>

      <!-- Delete Modal -->
      <div *ngIf="showDeleteModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#fff;border-radius:20px;padding:28px;max-width:340px;width:100%;text-align:center;">
          <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
          <h3 style="font-size:1.1rem;font-weight:700;color:#1a1a1a;margin:0 0 10px;">Delete Account?</h3>
          <p style="font-size:0.85rem;color:#666;margin:0 0 16px;line-height:1.6;">This action is <strong>irreversible</strong>. Your account, ride history, coins, and passes will be permanently deleted from our servers.</p>
          <div *ngIf="deleteError" style="background:#fdeaea;color:#c62828;border-radius:10px;padding:10px;font-size:0.82rem;margin-bottom:14px;">{{ deleteError }}</div>
          <div style="display:flex;gap:12px;">
            <button (click)="showDeleteModal = false" [disabled]="deletingAccount" style="flex:1;background:#f0f0f0;color:#444;border:none;border-radius:12px;padding:12px;font-weight:600;cursor:pointer;">Cancel</button>
            <button (click)="confirmDeleteAccount()" [disabled]="deletingAccount"
              style="flex:1;background:#e53935;color:#fff;border:none;border-radius:12px;padding:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
              <span *ngIf="deletingAccount" style="width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;"></span>
              {{ deletingAccount ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div *ngIf="toastMsg" style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:30px;font-size:0.85rem;z-index:9999;">{{ toastMsg }}</div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  homeAddress = '';
  workAddress = '';
  isDark = false;
  notificationsOn = true;
  selectedLanguage = 'English';
  showDeleteModal = false;
  toastMsg = '';

  shortcuts = [
    { icon: '🚗', label: 'Book Ride', route: '/booking' },
    { icon: '📋', label: 'My Rides', route: '/activity' },
    { icon: '🎁', label: 'Offers', route: '/rewards' },
    { icon: '📍', label: 'Track Ride', route: '/tracking' },
    { icon: '💳', label: 'Payment', route: '/payment' },
    { icon: '🛡️', label: 'Safety', route: '/safety' }
  ];

  constructor(public router: Router, private auth: AuthService) {}

  ngOnInit() {
    this.homeAddress = localStorage.getItem('rx_home_address') || '';
    this.workAddress = localStorage.getItem('rx_work_address') || '';
    this.isDark = localStorage.getItem('rx_theme') === 'dark';
    this.notificationsOn = localStorage.getItem('rx_notifications') !== 'false';
    this.selectedLanguage = localStorage.getItem('rx_language') || 'English';
    this.applyTheme();
  }

  saveHome() {
    localStorage.setItem('rx_home_address', this.homeAddress);
    this.showToast('🏠 Home address saved!');
  }

  saveWork() {
    localStorage.setItem('rx_work_address', this.workAddress);
    this.showToast('💼 Work address saved!');
  }

  setTheme(theme: 'light' | 'dark') {
    this.isDark = theme === 'dark';
    localStorage.setItem('rx_theme', theme);
    this.applyTheme();
    this.showToast(this.isDark ? '🌙 Dark mode enabled' : '☀️ Light mode enabled');
  }

  private applyTheme() {
    if (this.isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  toggleNotifications() {
    this.notificationsOn = !this.notificationsOn;
    localStorage.setItem('rx_notifications', String(this.notificationsOn));
    this.showToast(this.notificationsOn ? '🔔 Notifications enabled' : '🔕 Notifications disabled');
  }

  saveLanguage() {
    localStorage.setItem('rx_language', this.selectedLanguage);
    this.showToast('🌐 Language set to ' + this.selectedLanguage);
  }

  deletingAccount = false;
  deleteError = '';

  confirmDeleteAccount() {
    this.deletingAccount = true;
    this.deleteError = '';
    this.auth.deleteAccount().subscribe({
      next: () => {
        localStorage.clear();
        this.auth.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deletingAccount = false;
        this.deleteError = err?.error?.error || 'Failed to delete account. Please try again.';
      }
    });
  }

  private showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

