import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AdminUserListItem, Booking, UserStats } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';

type CaptainVerificationRequestState = {
  requestId: string;
  userId: string;
  captainName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  kycReferenceId?: string;
};

type CaptainKycFormState = {
  userId: string;
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  kycDocumentType: string;
  kycDocumentNumberMasked: string;
  kycReferenceId: string;
  kycUpdatedAt: string;
};

const CAPTAIN_VERIFICATION_REQUESTS_KEY = 'delivery_captain_verification_requests';
const CAPTAIN_KYC_STORAGE_KEY = 'delivery_captain_kyc_state';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <h2 class="mb-3">Admin Ride Monitor</h2>

      <div class="row g-3 mb-3" *ngIf="userStats">
        <div class="col-6 col-lg-3">
          <div class="card p-3 stats-card">
            <div class="stat-label">Total Users</div>
            <div class="stat-value">{{ userStats.totalUsers }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card p-3 stats-card">
            <div class="stat-label">Customers</div>
            <div class="stat-value">{{ userStats.totalCustomers }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card p-3 stats-card">
            <div class="stat-label">Captains</div>
            <div class="stat-value">{{ userStats.totalCaptains }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card p-3 stats-card">
            <div class="stat-label">Admins</div>
            <div class="stat-value">{{ userStats.totalAdmins }}</div>
          </div>
        </div>
      </div>

      <div class="alert alert-warning" *ngIf="userStatsError">
        {{ userStatsError }}
      </div>

      <div class="card p-3 mb-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">Live Users (MongoDB)</h5>
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="loadUsers()">Refresh</button>
        </div>

        <div class="row g-2 mb-2">
          <div class="col-md-7">
            <input
              class="form-control form-control-sm"
              type="text"
              placeholder="Search by username, name, email, mobile"
              [value]="searchTerm"
              (input)="onSearchTermChange($event)"
            />
          </div>
          <div class="col-md-3">
            <select class="form-select form-select-sm" [value]="selectedRole" (change)="onRoleChange($event)">
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="captain">Captain</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          <div class="col-md-2">
            <select class="form-select form-select-sm" [value]="pageSize" (change)="onPageSizeChange($event)">
              <option [value]="5">5 / page</option>
              <option [value]="10">10 / page</option>
              <option [value]="20">20 / page</option>
              <option [value]="50">50 / page</option>
            </select>
          </div>
        </div>

        <div class="alert alert-warning mb-2" *ngIf="usersError">
          {{ usersError }}
        </div>

        <div class="table-responsive" *ngIf="filteredUsers.length > 0">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Captain Vehicle</th>
                <th>OTP Done</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of paginatedUsers">
                <td>{{ user.username }}</td>
                <td><span class="badge text-bg-light text-capitalize">{{ user.role }}</span></td>
                <td>{{ user.email }}</td>
                <td>{{ user.mobile }}</td>
                <td>{{ user.captainVehicle || '-' }}</td>
                <td>
                  <span class="badge" [ngClass]="user.customerOtpCompleted ? 'text-bg-success' : 'text-bg-warning'">
                    {{ user.customerOtpCompleted ? 'Yes' : 'No' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex align-items-center justify-content-between mt-2" *ngIf="filteredUsers.length > 0">
          <small class="text-muted">
            Showing {{ pageStartIndex + 1 }}-{{ pageEndIndex }} of {{ filteredUsers.length }}
          </small>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" type="button" [disabled]="currentPage <= 1" (click)="prevPage()">Prev</button>
            <button class="btn btn-outline-secondary" type="button" disabled>Page {{ currentPage }} / {{ totalPages }}</button>
            <button class="btn btn-outline-secondary" type="button" [disabled]="currentPage >= totalPages" (click)="nextPage()">Next</button>
          </div>
        </div>

        <div class="text-muted small" *ngIf="filteredUsers.length === 0 && !usersError">
          No users found in MongoDB.
        </div>
      </div>

      <div class="alert alert-info">
        Ride start is customer-controlled only. Admin approval is removed. Customer must enter OTP from tracking page to start ride.
      </div>

      <div class="card p-3 mb-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">Captain Verification Requests</h5>
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="loadVerificationRequests()">Refresh</button>
        </div>
        <div class="text-muted small" *ngIf="verificationRequests.length === 0">No captain verification requests yet.</div>
        <div class="table-responsive" *ngIf="verificationRequests.length > 0">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Captain</th>
                <th>KYC Ref</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let req of verificationRequests">
                <td>{{ req.captainName }}</td>
                <td>{{ req.kycReferenceId || '-' }}</td>
                <td><span class="badge text-capitalize" [ngClass]="req.status === 'approved' ? 'text-bg-success' : (req.status === 'rejected' ? 'text-bg-danger' : 'text-bg-warning')">{{ req.status }}</span></td>
                <td>{{ req.submittedAt | date:'short' }}</td>
                <td>
                  <div class="btn-group btn-group-sm" *ngIf="req.status === 'pending'; else reviewedState">
                    <button class="btn btn-outline-success" type="button" (click)="approveCaptainVerification(req)">Approve</button>
                    <button class="btn btn-outline-danger" type="button" (click)="rejectCaptainVerification(req)">Reject</button>
                  </div>
                  <ng-template #reviewedState>
                    <small class="text-muted">{{ req.reviewedBy || 'Admin' }} • {{ req.reviewedAt | date:'short' }}</small>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card p-3" *ngFor="let booking of bookings$ | async">
        <div class="row g-3 align-items-end">
          <div class="col-lg-4"><strong>{{ booking.id }}</strong></div>
          <div class="col-lg-3">{{ booking.status }}</div>
          <div class="col-lg-2">{{ booking.userName }}</div>
          <div class="col-lg-3">
            <span class="badge" [ngClass]="booking.otpVerified ? 'text-bg-success' : 'text-bg-warning'">
              {{ booking.otpVerified ? 'Customer OTP Verified' : 'Waiting Customer OTP' }}
            </span>
          </div>
        </div>
        <small class="text-muted">Drop: {{ booking.drop.address }} | Vehicle: {{ booking.vehicleType }}</small>
      </div>
    </div>
  `,
  styles: [
    `
      .card + .card {
        margin-top: 0.75rem;
      }

      .stats-card {
        margin-top: 0;
      }

      .stat-label {
        color: #6c757d;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .stat-value {
        font-size: 1.6rem;
        font-weight: 700;
        line-height: 1.2;
      }
    `
  ]
})
export class AdminComponent {
  bookings$: Observable<Booking[]>;
  userStats: UserStats | null = null;
  userStatsError = '';
  users: AdminUserListItem[] = [];
  usersError = '';
  verificationRequests: CaptainVerificationRequestState[] = [];
  searchTerm = '';
  selectedRole: 'all' | 'admin' | 'captain' | 'customer' = 'all';
  pageSize = 10;
  currentPage = 1;

  constructor(private bookingService: BookingService, private authService: AuthService) {
    this.bookings$ = this.bookingService.bookings$;
    this.loadUserStats();
    this.loadUsers();
    this.loadVerificationRequests();
  }

  loadVerificationRequests(): void {
    const raw = localStorage.getItem(CAPTAIN_VERIFICATION_REQUESTS_KEY);
    if (!raw) {
      this.verificationRequests = [];
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CaptainVerificationRequestState[];
      this.verificationRequests = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.verificationRequests = [];
    }
  }

  approveCaptainVerification(req: CaptainVerificationRequestState): void {
    const now = new Date().toISOString();
    this.verificationRequests = this.verificationRequests.map((item) =>
      item.requestId === req.requestId
        ? {
            ...item,
            status: 'approved',
            reviewedAt: now,
            reviewedBy: 'Admin',
            reviewNote: 'Approved by admin'
          }
        : item
    );

    this.persistVerificationRequests();
    this.applyKycStatusForCaptain(req.userId, 'verified', req.kycReferenceId || '');
  }

  rejectCaptainVerification(req: CaptainVerificationRequestState): void {
    const now = new Date().toISOString();
    this.verificationRequests = this.verificationRequests.map((item) =>
      item.requestId === req.requestId
        ? {
            ...item,
            status: 'rejected',
            reviewedAt: now,
            reviewedBy: 'Admin',
            reviewNote: 'Rejected by admin. Please update docs and apply again.'
          }
        : item
    );

    this.persistVerificationRequests();
    this.applyKycStatusForCaptain(req.userId, 'rejected', req.kycReferenceId || '');
  }

  private persistVerificationRequests(): void {
    localStorage.setItem(CAPTAIN_VERIFICATION_REQUESTS_KEY, JSON.stringify(this.verificationRequests));
  }

  private applyKycStatusForCaptain(userId: string, status: 'verified' | 'rejected', referenceId: string): void {
    const raw = localStorage.getItem(CAPTAIN_KYC_STORAGE_KEY);
    const now = new Date().toISOString();
    let store: Record<string, CaptainKycFormState> = {};

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, CaptainKycFormState> | CaptainKycFormState;
        if ('userId' in (parsed as any)) {
          const legacy = parsed as CaptainKycFormState;
          if (legacy.userId) {
            store = { [legacy.userId]: legacy };
          }
        } else {
          store = parsed as Record<string, CaptainKycFormState>;
        }
      } catch {
        store = {};
      }
    }

    const existing = store[userId];
    store[userId] = {
      userId,
      kycStatus: status,
      kycDocumentType: existing?.kycDocumentType || 'Driving License',
      kycDocumentNumberMasked: existing?.kycDocumentNumberMasked || '',
      kycReferenceId: referenceId || existing?.kycReferenceId || '',
      kycUpdatedAt: now
    };

    localStorage.setItem(CAPTAIN_KYC_STORAGE_KEY, JSON.stringify(store));
  }

  private loadUserStats(): void {
    this.authService.getUserStats().subscribe({
      next: (stats) => {
        this.userStats = stats;
        this.userStatsError = '';
      },
      error: () => {
        this.userStats = null;
        this.userStatsError = 'Unable to load live user totals from MongoDB.';
      }
    });
  }

  loadUsers(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.usersError = '';
        this.currentPage = 1;
      },
      error: () => {
        this.users = [];
        this.usersError = 'Unable to load dynamic users from MongoDB.';
      }
    });
  }

  onSearchTermChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm = (input?.value || '').trim();
    this.currentPage = 1;
  }

  onRoleChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = (select?.value || 'all') as 'all' | 'admin' | 'captain' | 'customer';
    this.selectedRole = value;
    this.currentPage = 1;
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const parsed = Number(select?.value || 10);
    this.pageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
    this.currentPage = 1;
  }

  get filteredUsers(): AdminUserListItem[] {
    const term = this.searchTerm.toLowerCase();
    return this.users.filter((user) => {
      const roleMatch = this.selectedRole === 'all' || user.role === this.selectedRole;
      if (!roleMatch) {
        return false;
      }
      if (!term) {
        return true;
      }

      const haystack = [user.username, user.displayName, user.email, user.mobile].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pageStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get pageEndIndex(): number {
    return Math.min(this.pageStartIndex + this.pageSize, this.filteredUsers.length);
  }

  get paginatedUsers(): AdminUserListItem[] {
    return this.filteredUsers.slice(this.pageStartIndex, this.pageEndIndex);
  }

  prevPage(): void {
    this.currentPage = Math.max(1, this.currentPage - 1);
  }

  nextPage(): void {
    this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
  }
}
