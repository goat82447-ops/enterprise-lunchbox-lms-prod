import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserPreferencesService, UserSettingsPreferences } from '../../core/services/user-preferences.service';
import { PushNotificationService } from '../../core/services/push-notification.service';

type PaymentPreference = 'upi' | 'card' | 'wallet' | 'cash' | 'auto';

interface AddressItem {
  id: string;
  label: string;
  address: string;
}

interface ContactItem {
  id: string;
  name: string;
  phone: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-shell">
      <header class="settings-header">
        <button type="button" class="back-btn" (click)="router.navigate(['/account'])">←</button>
        <h2>Settings</h2>
      </header>

      <section class="card">
        <h3>Profile</h3>
        <div class="profile-row">
          <img [src]="avatarPreview" class="avatar" alt="Profile" />
          <div class="profile-actions">
            <input #fileInput type="file" accept="image/*" class="hidden-input" (change)="onAvatarSelected($event)" />
            <button type="button" class="btn" (click)="fileInput.click()">Upload Profile Picture</button>
            <button type="button" class="btn btn-light" (click)="saveProfile()">Save Profile</button>
          </div>
        </div>

        <div class="grid two">
          <div>
            <label>Display Name</label>
            <input [(ngModel)]="profile.displayName" placeholder="Your name" />
          </div>
          <div>
            <label>Email</label>
            <input [(ngModel)]="profile.email" placeholder="you@mail.com" />
          </div>
        </div>
        <div>
          <label>Mobile</label>
          <input [(ngModel)]="profile.mobile" placeholder="+91..." />
        </div>
      </section>

      <section class="card">
        <h3>Addresses</h3>
        <div class="grid two">
          <input [(ngModel)]="newAddressLabel" placeholder="Label (Home, Work, Gym...)" />
          <input [(ngModel)]="newAddressText" placeholder="Full address" />
        </div>
        <button class="btn" (click)="addAddress()">Add Multiple Address</button>
        <div class="list" *ngIf="addresses.length">
          <div class="list-item" *ngFor="let item of addresses">
            <div>
              <div class="item-title">{{ item.label }}</div>
              <div class="item-sub">{{ item.address }}</div>
            </div>
            <button class="icon-btn" (click)="removeAddress(item.id)">✕</button>
          </div>
        </div>
      </section>

      <section class="card">
        <h3>Emergency Contacts</h3>
        <div class="grid two">
          <input [(ngModel)]="newEmergencyName" placeholder="Name" />
          <input [(ngModel)]="newEmergencyPhone" placeholder="Phone" />
        </div>
        <button class="btn" (click)="addEmergencyContact()">Add Emergency Contact</button>

        <h3 class="sub-title">Trusted Contacts</h3>
        <div class="grid two">
          <input [(ngModel)]="newTrustedName" placeholder="Name" />
          <input [(ngModel)]="newTrustedPhone" placeholder="Phone" />
        </div>
        <button class="btn" (click)="addTrustedContact()">Add Trusted Contact</button>

        <div class="list" *ngIf="emergencyContacts.length || trustedContacts.length">
          <div class="item-group" *ngIf="emergencyContacts.length">
            <div class="item-group-title">Emergency</div>
            <div class="list-item" *ngFor="let item of emergencyContacts">
              <div>
                <div class="item-title">{{ item.name }}</div>
                <div class="item-sub">{{ item.phone }}</div>
              </div>
              <button class="icon-btn" (click)="removeEmergencyContact(item.id)">✕</button>
            </div>
          </div>
          <div class="item-group" *ngIf="trustedContacts.length">
            <div class="item-group-title">Trusted</div>
            <div class="list-item" *ngFor="let item of trustedContacts">
              <div>
                <div class="item-title">{{ item.name }}</div>
                <div class="item-sub">{{ item.phone }}</div>
              </div>
              <button class="icon-btn" (click)="removeTrustedContact(item.id)">✕</button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <h3>Language Selection</h3>
        <select [(ngModel)]="selectedLanguage" (ngModelChange)="saveAll()">
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Telugu">Telugu</option>
        </select>

        <h3 class="sub-title">Payment Preferences</h3>
        <div class="grid two">
          <select [(ngModel)]="paymentPreference" (ngModelChange)="saveAll()">
            <option value="upi">UPI</option>
            <option value="card">Credit/Debit Cards</option>
            <option value="wallet">Wallet</option>
            <option value="cash">Cash</option>
            <option value="auto">Auto Payment</option>
          </select>
          <label class="toggle-row">
            <span>Auto Payment</span>
            <input type="checkbox" [(ngModel)]="autoPaymentEnabled" (ngModelChange)="saveAll()" />
          </label>
        </div>
      </section>

      <section class="card">
        <h3>Notifications</h3>
        <div class="toggle-grid">
          <label class="toggle-row"><span>SMS Notifications</span><input type="checkbox" [(ngModel)]="notificationPrefs.sms" (ngModelChange)="saveAll()" /></label>
          <label class="toggle-row"><span>Email Notifications</span><input type="checkbox" [(ngModel)]="notificationPrefs.email" (ngModelChange)="saveAll()" /></label>
          <label class="toggle-row"><span>Push Notifications</span><input type="checkbox" [(ngModel)]="notificationPrefs.push" (ngModelChange)="onPushPreferenceChanged($event)" /></label>
          <label class="toggle-row"><span>Ride Updates</span><input type="checkbox" [(ngModel)]="notificationPrefs.rideUpdates" (ngModelChange)="saveAll()" /></label>
          <label class="toggle-row"><span>Payment Alerts</span><input type="checkbox" [(ngModel)]="notificationPrefs.paymentAlerts" (ngModelChange)="saveAll()" /></label>
        </div>
      </section>

      <section class="card">
        <h3>Safety Features</h3>
        <div class="toggle-grid">
          <label class="toggle-row"><span>SOS Button</span><input type="checkbox" [(ngModel)]="safetyPrefs.sosEnabled" (ngModelChange)="saveAll()" /></label>
          <label class="toggle-row"><span>Share Live Location</span><input type="checkbox" [(ngModel)]="safetyPrefs.shareLiveLocation" (ngModelChange)="saveAll()" /></label>
          <label class="toggle-row"><span>Emergency Calling</span><input type="checkbox" [(ngModel)]="safetyPrefs.emergencyCalling" (ngModelChange)="saveAll()" /></label>
          <label class="toggle-row"><span>Driver Verification</span><input type="checkbox" [(ngModel)]="safetyPrefs.driverVerification" (ngModelChange)="saveAll()" /></label>
          <label class="toggle-row"><span>Trip Recording</span><input type="checkbox" [(ngModel)]="safetyPrefs.tripRecording" (ngModelChange)="saveAll()" /></label>
        </div>
      </section>

      <button class="btn btn-danger full" (click)="showDeleteModal = true">Delete Account</button>
      <div class="toast" *ngIf="toastMsg">{{ toastMsg }}</div>

      <div class="modal-backdrop" *ngIf="showDeleteModal" (click)="showDeleteModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h4>Delete Account?</h4>
          <p>This action is irreversible.</p>
          <p class="error" *ngIf="deleteError">{{ deleteError }}</p>
          <div class="modal-actions">
            <button class="btn btn-light" (click)="showDeleteModal = false">Cancel</button>
            <button class="btn btn-danger" (click)="confirmDeleteAccount()" [disabled]="deletingAccount">{{ deletingAccount ? 'Deleting...' : 'Delete' }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .settings-shell {
        max-width: 920px;
        margin: 0 auto;
        padding: 14px 12px 90px;
        background: #f4f6f8;
        min-height: 100vh;
      }

      .settings-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }

      .settings-header h2 {
        margin: 0;
        font-size: 1.35rem;
      }

      .back-btn {
        border: 0;
        background: #e7ebef;
        border-radius: 10px;
        width: 34px;
        height: 34px;
        cursor: pointer;
      }

      .card {
        background: #fff;
        border: 1px solid #e7ebef;
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 12px;
      }

      h3 {
        margin: 0 0 10px;
        font-size: 1rem;
      }

      .sub-title {
        margin-top: 14px;
      }

      .profile-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      .avatar {
        width: 74px;
        height: 74px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e2e8f0;
      }

      .profile-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .hidden-input {
        display: none;
      }

      .grid {
        display: grid;
        gap: 8px;
      }

      .grid.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      input,
      select {
        width: 100%;
        border: 1px solid #d1d9e0;
        border-radius: 10px;
        padding: 9px 10px;
        font-size: 14px;
      }

      label {
        display: block;
        font-size: 12px;
        color: #475569;
        margin-bottom: 4px;
      }

      .btn {
        border: 1px solid #c6d0da;
        background: #1f2937;
        color: #fff;
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
      }

      .btn-light {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-danger {
        background: #dc2626;
        border-color: #dc2626;
      }

      .btn.full {
        width: 100%;
      }

      .list {
        margin-top: 10px;
        display: grid;
        gap: 8px;
      }

      .item-group {
        border: 1px solid #edf2f7;
        border-radius: 10px;
        padding: 8px;
      }

      .item-group-title {
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        margin-bottom: 6px;
      }

      .list-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        border: 1px solid #edf2f7;
        border-radius: 10px;
        padding: 8px;
      }

      .item-title {
        font-weight: 600;
        font-size: 13px;
      }

      .item-sub {
        font-size: 12px;
        color: #64748b;
      }

      .icon-btn {
        border: 0;
        background: #f1f5f9;
        border-radius: 8px;
        width: 28px;
        height: 28px;
        cursor: pointer;
      }

      .toggle-grid {
        display: grid;
        gap: 6px;
      }

      .toggle-row {
        border: 1px solid #e7ebef;
        border-radius: 10px;
        padding: 8px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .toggle-row span {
        font-size: 13px;
      }

      .toast {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 88px;
        background: #111827;
        color: #fff;
        border-radius: 999px;
        padding: 9px 14px;
        font-size: 12px;
        z-index: 1200;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 1200;
      }

      .modal {
        width: 100%;
        max-width: 360px;
        background: #fff;
        border-radius: 14px;
        padding: 14px;
      }

      .modal h4 {
        margin: 0 0 8px;
      }

      .modal p {
        margin: 0 0 8px;
      }

      .modal .error {
        color: #b91c1c;
        font-size: 13px;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      @media (max-width: 720px) {
        .grid.two {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class SettingsComponent implements OnInit {
  profile = {
    displayName: '',
    email: '',
    mobile: ''
  };

  avatarPreview = '/assets/rider-dummy.svg';
  showDeleteModal = false;
  deletingAccount = false;
  deleteError = '';
  toastMsg = '';

  addresses: AddressItem[] = [];
  emergencyContacts: ContactItem[] = [];
  trustedContacts: ContactItem[] = [];

  newAddressLabel = '';
  newAddressText = '';
  newEmergencyName = '';
  newEmergencyPhone = '';
  newTrustedName = '';
  newTrustedPhone = '';

  selectedLanguage = 'English';
  paymentPreference: PaymentPreference = 'upi';
  autoPaymentEnabled = false;

  notificationPrefs = {
    sms: true,
    email: true,
    push: true,
    rideUpdates: true,
    paymentAlerts: true
  };

  safetyPrefs = {
    sosEnabled: true,
    shareLiveLocation: true,
    emergencyCalling: true,
    driverVerification: true,
    tripRecording: false
  };

  constructor(
    public router: Router,
    private auth: AuthService,
    private userPreferences: UserPreferencesService,
    private pushNotifications: PushNotificationService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.profile.displayName = user?.displayName || '';
    this.profile.email = user?.email || '';
    this.profile.mobile = user?.mobile || '';
    this.avatarPreview = user?.profileImageUrl || '/assets/rider-dummy.svg';
    this.selectedLanguage = localStorage.getItem('rx_language') || 'English';
    this.loadPreferencesFromServer();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      if (!value) {
        return;
      }

      this.avatarPreview = value;
      this.auth.applyProfileImage(value);
      this.showToast('Profile picture updated');
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    this.auth.updateLocalProfile({
      displayName: this.profile.displayName.trim(),
      email: this.profile.email.trim(),
      mobile: this.profile.mobile.trim()
    });
    this.showToast('Profile saved');
  }

  addAddress(): void {
    const label = this.newAddressLabel.trim();
    const address = this.newAddressText.trim();
    if (!label || !address) {
      this.showToast('Enter address label and value');
      return;
    }

    this.addresses = [{ id: this.makeId(), label, address }, ...this.addresses];
    this.newAddressLabel = '';
    this.newAddressText = '';
    this.saveAll();
  }

  removeAddress(id: string): void {
    this.addresses = this.addresses.filter((x) => x.id !== id);
    this.saveAll();
  }

  addEmergencyContact(): void {
    const name = this.newEmergencyName.trim();
    const phone = this.newEmergencyPhone.trim();
    if (!name || !phone) {
      this.showToast('Enter emergency contact details');
      return;
    }

    this.emergencyContacts = [{ id: this.makeId(), name, phone }, ...this.emergencyContacts];
    this.newEmergencyName = '';
    this.newEmergencyPhone = '';
    this.saveAll();
  }

  removeEmergencyContact(id: string): void {
    this.emergencyContacts = this.emergencyContacts.filter((x) => x.id !== id);
    this.saveAll();
  }

  addTrustedContact(): void {
    const name = this.newTrustedName.trim();
    const phone = this.newTrustedPhone.trim();
    if (!name || !phone) {
      this.showToast('Enter trusted contact details');
      return;
    }

    this.trustedContacts = [{ id: this.makeId(), name, phone }, ...this.trustedContacts];
    this.newTrustedName = '';
    this.newTrustedPhone = '';
    this.saveAll();
  }

  removeTrustedContact(id: string): void {
    this.trustedContacts = this.trustedContacts.filter((x) => x.id !== id);
    this.saveAll();
  }

  saveAll(): void {
    // Keep language local as an intentional client-side preference.
    localStorage.setItem('rx_language', this.selectedLanguage);
    this.userPreferences.saveSettingsPreferences(this.toPreferencesPayload()).subscribe({
      next: () => this.showToast('Preferences saved'),
      error: () => this.showToast('Unable to save preferences right now')
    });
  }

  onPushPreferenceChanged(enabled: boolean): void {
    this.notificationPrefs.push = !!enabled;
    if (this.notificationPrefs.push) {
      this.pushNotifications.enableFromUserGesture();
    } else {
      this.pushNotifications.disablePush();
    }
    this.saveAll();
  }

  confirmDeleteAccount(): void {
    this.deletingAccount = true;
    this.deleteError = '';
    this.auth.deleteAccount().subscribe({
      next: () => {
        localStorage.removeItem('rx_language');
        this.auth.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deletingAccount = false;
        this.deleteError = err?.error?.error || 'Failed to delete account. Please try again.';
      }
    });
  }

  private loadPreferencesFromServer(): void {
    this.userPreferences.getSettingsPreferences().subscribe({
      next: (prefs) => {
        if (!prefs) {
          return;
        }

        this.addresses = Array.isArray(prefs.addresses) ? prefs.addresses : [];
        this.emergencyContacts = Array.isArray(prefs.emergencyContacts) ? prefs.emergencyContacts : [];
        this.trustedContacts = Array.isArray(prefs.trustedContacts) ? prefs.trustedContacts : [];
        this.paymentPreference = prefs.paymentPreference || 'upi';
        this.autoPaymentEnabled = !!prefs.autoPaymentEnabled;
        this.notificationPrefs = {
          sms: prefs.notificationPrefs?.sms ?? true,
          email: prefs.notificationPrefs?.email ?? true,
          push: prefs.notificationPrefs?.push ?? true,
          rideUpdates: prefs.notificationPrefs?.rideUpdates ?? true,
          paymentAlerts: prefs.notificationPrefs?.paymentAlerts ?? true
        };
        this.safetyPrefs = {
          sosEnabled: prefs.safetyPrefs?.sosEnabled ?? true,
          shareLiveLocation: prefs.safetyPrefs?.shareLiveLocation ?? true,
          emergencyCalling: prefs.safetyPrefs?.emergencyCalling ?? true,
          driverVerification: prefs.safetyPrefs?.driverVerification ?? true,
          tripRecording: prefs.safetyPrefs?.tripRecording ?? false
        };

        // Local language is source of truth if already chosen on this device.
        if (!localStorage.getItem('rx_language') && prefs.selectedLanguage) {
          this.selectedLanguage = prefs.selectedLanguage;
          localStorage.setItem('rx_language', this.selectedLanguage);
        }
      },
      error: () => void 0
    });
  }

  private toPreferencesPayload(): UserSettingsPreferences {
    return {
      selectedLanguage: this.selectedLanguage,
      paymentPreference: this.paymentPreference,
      autoPaymentEnabled: this.autoPaymentEnabled,
      addresses: this.addresses,
      emergencyContacts: this.emergencyContacts,
      trustedContacts: this.trustedContacts,
      notificationPrefs: this.notificationPrefs,
      safetyPrefs: this.safetyPrefs
    };
  }

  private makeId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => {
      this.toastMsg = '';
    }, 2200);
  }
}
