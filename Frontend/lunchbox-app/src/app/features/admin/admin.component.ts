import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { AdminUserListItem, Booking, BookingStatus, UserStats } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'drivers'
  | 'rides'
  | 'pricing'
  | 'payments'
  | 'analytics'
  | 'notifications'
  | 'support';

type UserModerationState = 'active' | 'blocked' | 'verified';
type DriverModerationState = 'pending' | 'approved' | 'rejected' | 'suspended';
type TicketState = 'open' | 'in_progress' | 'resolved';

interface LocalUserControl {
  userId: string;
  state: UserModerationState;
  note?: string;
  updatedAt: string;
}

interface DriverControl {
  userId: string;
  state: DriverModerationState;
  documentsVerified: boolean;
  performanceScore: number;
  updatedAt: string;
}

interface PricingState {
  baseFare: number;
  surgeMultiplier: number;
  commissionPercent: number;
  couponCode: string;
  couponDiscountPercent: number;
}

interface PaymentRecord {
  id: string;
  bookingId: string;
  userName: string;
  driverName: string;
  amount: number;
  commission: number;
  method: string;
  status: 'paid' | 'refunded';
  createdAt: string;
}

interface WalletEntry {
  id: string;
  ownerType: 'customer' | 'driver';
  ownerName: string;
  balance: number;
  updatedAt: string;
}

interface SupportTicket {
  id: string;
  category: 'customer' | 'driver';
  title: string;
  details: string;
  status: TicketState;
  assignedTo: string;
  createdAt: string;
  resolvedAt?: string;
}

interface CaptainVerificationRequestState {
  requestId: string;
  userId: string;
  captainName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  kycReferenceId?: string;
}

interface CaptainKycFormState {
  userId: string;
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  kycDocumentType: string;
  kycDocumentNumberMasked: string;
  kycReferenceId: string;
  kycUpdatedAt: string;
}

const CAPTAIN_VERIFICATION_REQUESTS_KEY = 'delivery_captain_verification_requests';
const CAPTAIN_KYC_STORAGE_KEY = 'delivery_captain_kyc_state';
const USER_CONTROL_KEY = 'delivery_admin_user_control_v1';
const DRIVER_CONTROL_KEY = 'delivery_admin_driver_control_v1';
const PRICING_KEY = 'delivery_admin_pricing_v1';
const PAYMENT_RECORDS_KEY = 'delivery_admin_payment_records_v1';
const WALLETS_KEY = 'delivery_admin_wallets_v1';
const TICKETS_KEY = 'delivery_admin_tickets_v1';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-bg"></div>
      <div class="container-fluid admin-wrap">
        <header class="hero">
          <div>
            <p class="kicker">Operations Console</p>
            <h2>Admin Control Center</h2>
            <p class="muted mb-0">Live operations + governance + analytics in one screen.</p>
          </div>
          <button class="btn btn-outline-light btn-sm" type="button" (click)="refreshAll()">Refresh All</button>
        </header>

        <nav class="tab-row">
          <button type="button" class="tab-btn" [class.active]="activeTab === 'dashboard'" (click)="activeTab = 'dashboard'">Dashboard</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'users'" (click)="activeTab = 'users'">User Mgmt</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'drivers'" (click)="activeTab = 'drivers'">Driver Mgmt</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'rides'" (click)="activeTab = 'rides'">Ride Mgmt</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'pricing'" (click)="activeTab = 'pricing'">Pricing</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'payments'" (click)="activeTab = 'payments'">Payments</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'analytics'" (click)="activeTab = 'analytics'">Analytics</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'notifications'" (click)="activeTab = 'notifications'">Notifications</button>
          <button type="button" class="tab-btn" [class.active]="activeTab === 'support'" (click)="activeTab = 'support'">Support</button>
        </nav>

        <div class="panel" *ngIf="activeTab === 'dashboard'">
          <div class="stats-grid">
            <article class="stat-card"><p>Total Users</p><strong>{{ metrics.totalUsers }}</strong></article>
            <article class="stat-card"><p>Total Drivers</p><strong>{{ metrics.totalDrivers }}</strong></article>
            <article class="stat-card"><p>Total Rides</p><strong>{{ metrics.totalRides }}</strong></article>
            <article class="stat-card"><p>Revenue Analytics</p><strong>{{ metrics.totalRevenue | currency:'INR' }}</strong></article>
            <article class="stat-card"><p>Live Rides</p><strong>{{ metrics.liveRides }}</strong></article>
            <article class="stat-card"><p>Cancellation Reports</p><strong>{{ metrics.cancelledRides }}</strong></article>
            <article class="stat-card"><p>System Health</p><strong>{{ metrics.systemHealth }}</strong></article>
            <article class="stat-card"><p>Retention</p><strong>{{ metrics.customerRetention }}%</strong></article>
          </div>

          <div class="split mt-3">
            <div class="card shell p-3">
              <h5>Revenue Trend (7 Day)</h5>
              <div class="trend-row" *ngFor="let point of revenueTrend">
                <span>{{ point.day }}</span>
                <div class="bar-wrap"><div class="bar" [style.width.%]="point.percent"></div></div>
                <strong>{{ point.value | currency:'INR' }}</strong>
              </div>
            </div>
            <div class="card shell p-3">
              <h5>Peak Hours Report</h5>
              <div class="chip-wrap">
                <span class="chip" *ngFor="let hour of peakHourLabels">{{ hour }}</span>
              </div>
              <h6 class="mt-3">Ride Statistics</h6>
              <ul class="mb-0 small muted">
                <li>Completed rides: {{ metrics.completedRides }}</li>
                <li>Average order value: {{ metrics.averageOrderValue | currency:'INR' }}</li>
                <li>Refund ratio: {{ metrics.refundRatio }}%</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="panel" *ngIf="activeTab === 'users'">
          <div class="card shell p-3 mb-3">
            <div class="row g-2">
              <div class="col-md-6">
                <input class="form-control form-control-sm" placeholder="Search by username/name/email/mobile" [value]="searchTerm" (input)="onSearchTermChange($event)" />
              </div>
              <div class="col-md-3">
                <select class="form-select form-select-sm" [value]="selectedRole" (change)="onRoleChange($event)">
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="driver">Driver</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div class="col-md-3">
                <button class="btn btn-sm btn-outline-light w-100" type="button" (click)="loadUsers()">Refresh Users</button>
              </div>
            </div>
            <div class="alert alert-warning mt-2 mb-0" *ngIf="usersError">{{ usersError }}</div>
          </div>

          <div class="table-shell" *ngIf="filteredUsers.length > 0">
            <table class="table table-sm align-middle mb-0 text-white">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Profile</th>
                  <th>Verify</th>
                  <th>Block / Unblock</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of filteredUsers">
                  <td>
                    <strong>{{ user.displayName }}</strong>
                    <div class="small muted">{{ user.username }} | {{ user.mobile }}</div>
                  </td>
                  <td><span class="chip">{{ normalizeRole(user.role) }}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline-light" type="button" (click)="viewProfile(user)">View Profile</button>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-success" type="button" (click)="verifyUser(user)">Verify Account</button>
                  </td>
                  <td>
                    <button
                      class="btn btn-sm"
                      [ngClass]="isUserBlocked(user.id) ? 'btn-outline-success' : 'btn-outline-danger'"
                      type="button"
                      (click)="toggleUserBlock(user)"
                    >
                      {{ isUserBlocked(user.id) ? 'Unblock User' : 'Block User' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="muted" *ngIf="filteredUsers.length === 0">No users available for management.</p>
        </div>

        <div class="panel" *ngIf="activeTab === 'drivers'">
          <div class="card shell p-3 mb-3">
            <h5>Driver Verification Queue</h5>
            <p class="small muted mb-2">Approve, reject, suspend, verify docs, and inspect performance.</p>
            <div class="table-shell" *ngIf="driverUsers.length > 0">
              <table class="table table-sm align-middle mb-0 text-white">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>State</th>
                    <th>Docs</th>
                    <th>Performance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let driver of driverUsers">
                    <td>{{ driver.displayName }}</td>
                    <td><span class="chip">{{ driverState(driver.id) }}</span></td>
                    <td>
                      <button class="btn btn-sm btn-outline-success" type="button" (click)="toggleDriverDocs(driver.id)">
                        {{ isDriverDocsVerified(driver.id) ? 'Verified' : 'Verify Documents' }}
                      </button>
                    </td>
                    <td>{{ getDriverPerformance(driver.id) }}%</td>
                    <td class="d-flex flex-wrap gap-1">
                      <button class="btn btn-sm btn-outline-success" type="button" (click)="setDriverState(driver.id, 'approved')">Approve</button>
                      <button class="btn btn-sm btn-outline-danger" type="button" (click)="setDriverState(driver.id, 'rejected')">Reject</button>
                      <button class="btn btn-sm btn-outline-warning" type="button" (click)="setDriverState(driver.id, 'suspended')">Suspend</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="muted" *ngIf="driverUsers.length === 0">No drivers found yet.</p>
          </div>

          <div class="card shell p-3">
            <h5>Captain Verification Requests</h5>
            <div class="table-shell" *ngIf="verificationRequests.length > 0">
              <table class="table table-sm align-middle mb-0 text-white">
                <thead>
                  <tr>
                    <th>Captain</th>
                    <th>KYC Ref</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let req of verificationRequests">
                    <td>{{ req.captainName }}</td>
                    <td>{{ req.kycReferenceId || '-' }}</td>
                    <td><span class="chip">{{ req.status }}</span></td>
                    <td>
                      <button class="btn btn-sm btn-outline-success me-1" type="button" (click)="approveCaptainVerification(req)" [disabled]="req.status !== 'pending'">Approve</button>
                      <button class="btn btn-sm btn-outline-danger" type="button" (click)="rejectCaptainVerification(req)" [disabled]="req.status !== 'pending'">Reject</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="muted" *ngIf="verificationRequests.length === 0">No captain verification requests.</p>
          </div>
        </div>

        <div class="panel" *ngIf="activeTab === 'rides'">
          <div class="card shell p-3 mb-3">
            <h5>Live Ride Monitor</h5>
            <div class="table-shell" *ngIf="liveBookings.length > 0">
              <table class="table table-sm align-middle mb-0 text-white">
                <thead>
                  <tr>
                    <th>Ride</th>
                    <th>Status</th>
                    <th>Customer</th>
                    <th>Driver</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let booking of liveBookings">
                    <td>
                      <strong>{{ booking.id }}</strong>
                      <div class="small muted">{{ booking.pickup.address }} -> {{ booking.drop.address }}</div>
                    </td>
                    <td><span class="chip">{{ booking.status }}</span></td>
                    <td>{{ booking.userName }}</td>
                    <td>{{ booking.driverName }}</td>
                    <td class="d-flex flex-wrap gap-1">
                      <button class="btn btn-sm btn-outline-danger" type="button" (click)="cancelRideAsAdmin(booking)">Cancel Ride</button>
                      <button class="btn btn-sm btn-outline-info" type="button" (click)="reassignDriver(booking)">Reassign Driver</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="muted" *ngIf="liveBookings.length === 0">No live rides at the moment.</p>
          </div>

          <div class="card shell p-3">
            <h5>Ride Reports</h5>
            <ul class="small muted mb-0">
              <li>Total rides: {{ metrics.totalRides }}</li>
              <li>Cancelled rides: {{ metrics.cancelledRides }}</li>
              <li>Completion ratio: {{ metrics.completionRatio }}%</li>
              <li>Reassigned rides: {{ reassignedRideCount }}</li>
            </ul>
          </div>
        </div>

        <div class="panel" *ngIf="activeTab === 'pricing'">
          <div class="card shell p-3">
            <h5>Pricing Management</h5>
            <div class="row g-2">
              <div class="col-md-3">
                <label class="small muted">Base Fare</label>
                <input class="form-control form-control-sm" type="number" min="0" [(ngModel)]="pricing.baseFare" />
              </div>
              <div class="col-md-3">
                <label class="small muted">Surge Multiplier</label>
                <input class="form-control form-control-sm" type="number" min="1" step="0.1" [(ngModel)]="pricing.surgeMultiplier" />
              </div>
              <div class="col-md-3">
                <label class="small muted">Commission %</label>
                <input class="form-control form-control-sm" type="number" min="0" max="100" [(ngModel)]="pricing.commissionPercent" />
              </div>
              <div class="col-md-3">
                <label class="small muted">Coupon %</label>
                <input class="form-control form-control-sm" type="number" min="0" max="100" [(ngModel)]="pricing.couponDiscountPercent" />
              </div>
              <div class="col-md-6">
                <label class="small muted">Coupon Code</label>
                <input class="form-control form-control-sm" [(ngModel)]="pricing.couponCode" />
              </div>
            </div>
            <button class="btn btn-sm btn-outline-success mt-3" type="button" (click)="savePricing()">Save Pricing Rules</button>
          </div>
        </div>

        <div class="panel" *ngIf="activeTab === 'payments'">
          <div class="split">
            <div class="card shell p-3">
              <h5>Transactions + Refunds</h5>
              <div class="table-shell" *ngIf="payments.length > 0">
                <table class="table table-sm align-middle mb-0 text-white">
                  <thead>
                    <tr>
                      <th>Txn</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let payment of payments">
                      <td>{{ payment.id }}</td>
                      <td>{{ payment.amount | currency:'INR' }}</td>
                      <td><span class="chip">{{ payment.status }}</span></td>
                      <td>
                        <button class="btn btn-sm btn-outline-warning" type="button" (click)="refundPayment(payment)" [disabled]="payment.status === 'refunded'">Refund</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card shell p-3">
              <h5>Wallet Management</h5>
              <div class="table-shell" *ngIf="wallets.length > 0">
                <table class="table table-sm align-middle mb-0 text-white">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Type</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let wallet of wallets">
                      <td>{{ wallet.ownerName }}</td>
                      <td>{{ wallet.ownerType }}</td>
                      <td>{{ wallet.balance | currency:'INR' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <h6 class="mt-3">Commission Reports</h6>
              <p class="small muted mb-0">Total commissions: {{ totalCommission | currency:'INR' }}</p>
            </div>
          </div>
        </div>

        <div class="panel" *ngIf="activeTab === 'analytics'">
          <div class="split">
            <div class="card shell p-3">
              <h5>Revenue Reports</h5>
              <p class="small muted mb-1">Net revenue: {{ metrics.totalRevenue | currency:'INR' }}</p>
              <p class="small muted mb-1">Refunded amount: {{ refundedAmount | currency:'INR' }}</p>
              <p class="small muted mb-0">Peak-hour revenue share: {{ peakHourRevenueShare }}%</p>
            </div>
            <div class="card shell p-3">
              <h5>Driver Performance</h5>
              <div class="trend-row" *ngFor="let d of driverPerformanceTop">
                <span>{{ d.name }}</span>
                <div class="bar-wrap"><div class="bar" [style.width.%]="d.score"></div></div>
                <strong>{{ d.score }}%</strong>
              </div>
            </div>
            <div class="card shell p-3">
              <h5>Customer Retention</h5>
              <p class="small muted">Active repeat customers: {{ metrics.retainedCustomers }}</p>
              <p class="small muted">Retention ratio: {{ metrics.customerRetention }}%</p>
              <p class="small muted mb-0">Ride statistics index: {{ metrics.rideStatisticsIndex }}</p>
            </div>
          </div>
        </div>

        <div class="panel" *ngIf="activeTab === 'notifications'">
          <div class="card shell p-3">
            <h5>Notification Management</h5>
            <div class="row g-2">
              <div class="col-md-4">
                <label class="small muted">Audience</label>
                <select class="form-select form-select-sm" [(ngModel)]="bulkAudience">
                  <option value="all">All Users</option>
                  <option value="customers">Customers</option>
                  <option value="drivers">Drivers</option>
                </select>
              </div>
              <div class="col-md-8">
                <label class="small muted">Message</label>
                <input class="form-control form-control-sm" [(ngModel)]="bulkMessage" placeholder="Type bulk / promotional / push message" />
              </div>
            </div>
            <div class="d-flex gap-2 mt-3 flex-wrap">
              <button class="btn btn-sm btn-outline-info" type="button" (click)="sendBulk('bulk')">Send Bulk Notification</button>
              <button class="btn btn-sm btn-outline-warning" type="button" (click)="sendBulk('promo')">Send Promotional Message</button>
              <button class="btn btn-sm btn-outline-success" type="button" (click)="sendBulk('push')">Send Push Notification</button>
            </div>
          </div>
        </div>

        <div class="panel" *ngIf="activeTab === 'support'">
          <div class="card shell p-3 mb-3">
            <h5>Support Ticket System</h5>
            <div class="row g-2">
              <div class="col-md-2">
                <select class="form-select form-select-sm" [(ngModel)]="newTicket.category">
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
              <div class="col-md-3">
                <input class="form-control form-control-sm" placeholder="Title" [(ngModel)]="newTicket.title" />
              </div>
              <div class="col-md-4">
                <input class="form-control form-control-sm" placeholder="Complaint details" [(ngModel)]="newTicket.details" />
              </div>
              <div class="col-md-2">
                <input class="form-control form-control-sm" placeholder="Assignee" [(ngModel)]="newTicket.assignedTo" />
              </div>
              <div class="col-md-1">
                <button class="btn btn-sm btn-outline-success w-100" type="button" (click)="addTicket()">Add</button>
              </div>
            </div>
          </div>

          <div class="card shell p-3">
            <h5>Complaints + Resolution Tracking</h5>
            <div class="table-shell" *ngIf="tickets.length > 0">
              <table class="table table-sm align-middle mb-0 text-white">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of tickets">
                    <td>
                      <strong>{{ t.title }}</strong>
                      <div class="small muted">{{ t.details }}</div>
                    </td>
                    <td>{{ t.category }}</td>
                    <td><span class="chip">{{ t.status }}</span></td>
                    <td>{{ t.assignedTo }}</td>
                    <td class="d-flex gap-1 flex-wrap">
                      <button class="btn btn-sm btn-outline-info" type="button" (click)="setTicketStatus(t.id, 'in_progress')">In Progress</button>
                      <button class="btn btn-sm btn-outline-success" type="button" (click)="setTicketStatus(t.id, 'resolved')">Resolve</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="muted" *ngIf="tickets.length === 0">No support tickets yet.</p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .admin-page {
        position: relative;
        min-height: 100vh;
        padding: 1rem;
        background: linear-gradient(140deg, #07111b 0%, #101a2c 45%, #0a1e1a 100%);
        color: #f3f8ff;
      }

      .admin-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 12% 18%, rgba(56, 189, 248, 0.18), transparent 35%),
          radial-gradient(circle at 85% 12%, rgba(34, 197, 94, 0.12), transparent 35%);
      }

      .admin-wrap {
        position: relative;
        z-index: 1;
      }

      .kicker {
        margin: 0;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #93c5fd;
      }

      .hero {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .muted {
        color: #acc2d8;
      }

      .tab-row {
        display: grid;
        grid-template-columns: repeat(9, minmax(0, 1fr));
        gap: 0.45rem;
        margin-bottom: 1rem;
      }

      .tab-btn {
        border: 1px solid rgba(147, 197, 253, 0.3);
        background: rgba(15, 23, 42, 0.78);
        color: #d9ecff;
        border-radius: 8px;
        padding: 0.45rem;
        font-size: 0.82rem;
      }

      .tab-btn.active {
        border-color: #38bdf8;
        background: linear-gradient(120deg, #0ea5e9 0%, #0284c7 100%);
        color: #fff;
      }

      .shell {
        background: rgba(12, 21, 36, 0.85);
        border: 1px solid rgba(148, 163, 184, 0.2);
        color: #f4f8fd;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .stat-card {
        border: 1px solid rgba(125, 211, 252, 0.25);
        border-radius: 12px;
        background: rgba(14, 24, 38, 0.88);
        padding: 0.7rem;
      }

      .stat-card p {
        margin: 0;
        font-size: 0.74rem;
        color: #9fc3e0;
        text-transform: uppercase;
      }

      .stat-card strong {
        font-size: 1.45rem;
      }

      .split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .trend-row {
        display: grid;
        grid-template-columns: 56px 1fr auto;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 0.4rem;
      }

      .bar-wrap {
        width: 100%;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.2);
        overflow: hidden;
        height: 8px;
      }

      .bar {
        height: 100%;
        background: linear-gradient(90deg, #22c55e 0%, #38bdf8 100%);
      }

      .chip-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }

      .chip {
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.22);
        border: 1px solid rgba(147, 197, 253, 0.35);
        color: #dbeafe;
        font-size: 0.76rem;
        padding: 0.25rem 0.55rem;
      }

      .table-shell {
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 10px;
        overflow: auto;
      }

      .table {
        --bs-table-bg: transparent;
        --bs-table-color: #f8fcff;
      }

      .form-control,
      .form-select {
        background: rgba(8, 15, 28, 0.92);
        border-color: rgba(148, 163, 184, 0.35);
        color: #fff;
      }

      .form-control:focus,
      .form-select:focus {
        background: rgba(8, 15, 28, 1);
        color: #fff;
        border-color: #38bdf8;
      }

      @media (max-width: 1200px) {
        .tab-row {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 768px) {
        .admin-page {
          padding: 0.8rem;
        }

        .hero {
          flex-direction: column;
          align-items: flex-start;
        }

        .split,
        .stats-grid {
          grid-template-columns: 1fr;
        }

        .tab-row {
          display: flex;
          overflow-x: auto;
          gap: 0.55rem;
          padding-bottom: 0.2rem;
          scrollbar-width: none;
        }

        .tab-row::-webkit-scrollbar {
          display: none;
        }

        .tab-btn {
          flex: 0 0 auto;
          min-width: 130px;
          white-space: nowrap;
          padding: 0.55rem 0.75rem;
        }

        .table-shell {
          overflow-x: auto;
        }
      }
    `
  ]
})
export class AdminComponent {
  activeTab: AdminTab = 'dashboard';

  bookings$: Observable<Booking[]>;
  userStats: UserStats | null = null;
  userStatsError = '';
  users: AdminUserListItem[] = [];
  usersError = '';
  verificationRequests: CaptainVerificationRequestState[] = [];

  searchTerm = '';
  selectedRole: 'all' | 'admin' | 'driver' | 'customer' = 'all';

  userControlMap: Record<string, LocalUserControl> = {};
  driverControlMap: Record<string, DriverControl> = {};

  pricing: PricingState = {
    baseFare: 45,
    surgeMultiplier: 1.3,
    commissionPercent: 18,
    couponCode: 'SAVE20',
    couponDiscountPercent: 20
  };

  payments: PaymentRecord[] = [];
  wallets: WalletEntry[] = [];
  tickets: SupportTicket[] = [];

  newTicket = {
    category: 'customer' as 'customer' | 'driver',
    title: '',
    details: '',
    assignedTo: 'Support Team'
  };

  bulkAudience: 'all' | 'customers' | 'drivers' = 'all';
  bulkMessage = '';

  reassignedRideCount = 0;

  constructor(
    private readonly bookingService: BookingService,
    private readonly authService: AuthService,
    private readonly notifications: NotificationService
  ) {
    this.bookings$ = this.bookingService.bookings$;
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadUserStats();
    this.loadUsers();
    this.loadVerificationRequests();
    this.loadUserControls();
    this.loadDriverControls();
    this.loadPricing();
    this.bootstrapPayments();
    this.bootstrapWallets();
    this.loadTickets();
  }

  get metrics(): {
    totalUsers: number;
    totalDrivers: number;
    totalRides: number;
    totalRevenue: number;
    liveRides: number;
    cancelledRides: number;
    completedRides: number;
    systemHealth: string;
    customerRetention: number;
    averageOrderValue: number;
    completionRatio: number;
    retainedCustomers: number;
    rideStatisticsIndex: number;
    refundRatio: number;
  } {
    const bookings = this.bookingService.getAllBookingsSnapshot();
    const totalRides = bookings.length;
    const liveRides = bookings.filter((b) => this.isLiveStatus(b.status)).length;
    const cancelledRides = bookings.filter((b) => b.status === 'cancelled').length;
    const completedRides = bookings.filter((b) => b.status === 'completed' || b.status === 'delivered').length;
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.estimatedFare || 0), 0);
    const uniqueCustomers = new Set(bookings.map((b) => b.userId));
    const repeatCustomers = new Set(
      bookings
        .map((b) => b.userId)
        .filter((userId) => bookings.filter((x) => x.userId === userId).length > 1)
    );
    const customerRetention = uniqueCustomers.size
      ? Math.round((repeatCustomers.size / uniqueCustomers.size) * 100)
      : 0;
    const completionRatio = totalRides ? Math.round((completedRides / totalRides) * 100) : 0;
    const averageOrderValue = totalRides ? Math.round(totalRevenue / totalRides) : 0;
    const rideStatisticsIndex = Math.min(100, Math.round((completionRatio + customerRetention) / 2));
    const refundRatio = this.payments.length
      ? Math.round((this.payments.filter((p) => p.status === 'refunded').length / this.payments.length) * 100)
      : 0;

    return {
      totalUsers: this.userStats?.totalUsers ?? this.users.length,
      totalDrivers: this.driverUsers.length,
      totalRides,
      totalRevenue,
      liveRides,
      cancelledRides,
      completedRides,
      systemHealth: this.computeSystemHealth(liveRides, cancelledRides, totalRides),
      customerRetention,
      averageOrderValue,
      completionRatio,
      retainedCustomers: repeatCustomers.size,
      rideStatisticsIndex,
      refundRatio
    };
  }

  get liveBookings(): Booking[] {
    return this.bookingService.getAllBookingsSnapshot().filter((b) => this.isLiveStatus(b.status));
  }

  get filteredUsers(): AdminUserListItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.users.filter((user) => {
      const role = this.normalizeRole(user.role);
      const roleMatch = this.selectedRole === 'all' || role === this.selectedRole;
      if (!roleMatch) {
        return false;
      }

      if (!term) {
        return true;
      }

      const hay = `${user.username} ${user.displayName} ${user.email} ${user.mobile}`.toLowerCase();
      return hay.includes(term);
    });
  }

  get driverUsers(): AdminUserListItem[] {
    return this.users.filter((u) => this.normalizeRole(u.role) === 'driver');
  }

  get totalCommission(): number {
    return this.payments.reduce((sum, p) => sum + p.commission, 0);
  }

  get refundedAmount(): number {
    return this.payments.filter((p) => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0);
  }

  get peakHourRevenueShare(): number {
    const total = this.metrics.totalRevenue;
    if (!total) {
      return 0;
    }
    const peak = this.metrics.totalRevenue * 0.42;
    return Math.round((peak / total) * 100);
  }

  get peakHourLabels(): string[] {
    return ['08:00-10:00', '12:00-14:00', '18:00-22:00'];
  }

  get revenueTrend(): Array<{ day: string; value: number; percent: number }> {
    const base = this.metrics.totalRevenue || 1000;
    const vals = [0.78, 0.84, 0.67, 0.92, 0.88, 0.95, 1].map((m) => Math.round(base * m * 0.2));
    const max = Math.max(...vals, 1);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return days.map((day, idx) => ({ day, value: vals[idx], percent: Math.round((vals[idx] / max) * 100) }));
  }

  get driverPerformanceTop(): Array<{ name: string; score: number }> {
    return this.driverUsers.slice(0, 5).map((driver, idx) => ({
      name: driver.displayName,
      score: Math.max(70, this.getDriverPerformance(driver.id) - idx)
    }));
  }

  onSearchTermChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm = input?.value || '';
  }

  onRoleChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.selectedRole = (select?.value as 'all' | 'admin' | 'driver' | 'customer') || 'all';
  }

  viewProfile(user: AdminUserListItem): void {
    this.notifications.push(`Profile: ${user.displayName} | ${user.email} | ${user.mobile}`, 'info');
  }

  verifyUser(user: AdminUserListItem): void {
    this.userControlMap[user.id] = {
      userId: user.id,
      state: 'verified',
      updatedAt: new Date().toISOString(),
      note: 'Verified by admin'
    };
    this.persistUserControls();
    this.notifications.push(`${user.displayName} verified successfully.`, 'success');
  }

  toggleUserBlock(user: AdminUserListItem): void {
    const existing = this.userControlMap[user.id];
    const blocked = existing?.state === 'blocked';
    this.userControlMap[user.id] = {
      userId: user.id,
      state: blocked ? 'active' : 'blocked',
      updatedAt: new Date().toISOString(),
      note: blocked ? 'Unblocked by admin' : 'Blocked by admin'
    };
    this.persistUserControls();
    this.notifications.push(
      blocked ? `${user.displayName} is now unblocked.` : `${user.displayName} has been blocked.`,
      blocked ? 'success' : 'warning'
    );
  }

  isUserBlocked(userId: string): boolean {
    return this.userControlMap[userId]?.state === 'blocked';
  }

  setDriverState(userId: string, state: DriverModerationState): void {
    const existing = this.driverControlMap[userId];
    this.driverControlMap[userId] = {
      userId,
      state,
      documentsVerified: existing?.documentsVerified || false,
      performanceScore: existing?.performanceScore || this.randomScore(),
      updatedAt: new Date().toISOString()
    };
    this.persistDriverControls();
    this.notifications.push(`Driver state updated to ${state}.`, state === 'rejected' ? 'warning' : 'success');
  }

  driverState(userId: string): DriverModerationState {
    return this.driverControlMap[userId]?.state || 'pending';
  }

  toggleDriverDocs(userId: string): void {
    const existing = this.driverControlMap[userId];
    this.driverControlMap[userId] = {
      userId,
      state: existing?.state || 'pending',
      documentsVerified: !(existing?.documentsVerified || false),
      performanceScore: existing?.performanceScore || this.randomScore(),
      updatedAt: new Date().toISOString()
    };
    this.persistDriverControls();
    this.notifications.push('Driver document verification updated.', 'success');
  }

  isDriverDocsVerified(userId: string): boolean {
    return this.driverControlMap[userId]?.documentsVerified || false;
  }

  getDriverPerformance(userId: string): number {
    if (!this.driverControlMap[userId]) {
      this.driverControlMap[userId] = {
        userId,
        state: 'pending',
        documentsVerified: false,
        performanceScore: this.randomScore(),
        updatedAt: new Date().toISOString()
      };
      this.persistDriverControls();
    }
    return this.driverControlMap[userId].performanceScore;
  }

  cancelRideAsAdmin(booking: Booking): void {
    const result = this.bookingService.cancelRide(booking.id, 'captain');
    this.notifications.push(result.message, result.success ? 'warning' : 'error');
  }

  reassignDriver(booking: Booking): void {
    this.bookingService.updateRideStatus(booking.id, 'assigned', 'Driver reassigned by admin');
    this.reassignedRideCount += 1;
    this.notifications.push(`Driver reassigned for ${booking.id}.`, 'info');
  }

  savePricing(): void {
    localStorage.setItem(PRICING_KEY, JSON.stringify(this.pricing));
    this.notifications.push('Pricing rules saved.', 'success');
  }

  refundPayment(payment: PaymentRecord): void {
    this.payments = this.payments.map((p) =>
      p.id === payment.id
        ? {
            ...p,
            status: 'refunded'
          }
        : p
    );
    this.persistPayments();
    this.notifications.push(`Refund processed for ${payment.id}.`, 'warning');
  }

  sendBulk(kind: 'bulk' | 'promo' | 'push'): void {
    if (!this.bulkMessage.trim()) {
      this.notifications.push('Please enter a message before sending.', 'error');
      return;
    }

    const label = kind === 'bulk' ? 'Bulk notification' : kind === 'promo' ? 'Promotional message' : 'Push notification';
    this.notifications.push(`${label} sent to ${this.bulkAudience}.`, 'success');
    this.bulkMessage = '';
  }

  addTicket(): void {
    if (!this.newTicket.title.trim() || !this.newTicket.details.trim()) {
      this.notifications.push('Title and complaint details are required.', 'error');
      return;
    }

    const ticket: SupportTicket = {
      id: `TKT-${Date.now().toString().slice(-6)}`,
      category: this.newTicket.category,
      title: this.newTicket.title.trim(),
      details: this.newTicket.details.trim(),
      status: 'open',
      assignedTo: this.newTicket.assignedTo.trim() || 'Support Team',
      createdAt: new Date().toISOString()
    };

    this.tickets = [ticket, ...this.tickets];
    this.persistTickets();
    this.notifications.push('Support ticket created.', 'success');

    this.newTicket.title = '';
    this.newTicket.details = '';
  }

  setTicketStatus(id: string, status: TicketState): void {
    this.tickets = this.tickets.map((ticket) =>
      ticket.id === id
        ? {
            ...ticket,
            status,
            resolvedAt: status === 'resolved' ? new Date().toISOString() : ticket.resolvedAt
          }
        : ticket
    );
    this.persistTickets();
    this.notifications.push(`Ticket ${id} updated to ${status}.`, status === 'resolved' ? 'success' : 'info');
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
    this.notifications.push(`Captain ${req.captainName} approved.`, 'success');
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
    this.notifications.push(`Captain ${req.captainName} rejected.`, 'warning');
  }

  normalizeRole(role: string): 'admin' | 'driver' | 'customer' {
    if (role === 'captain' || role === 'driver') {
      return 'driver';
    }

    if (role === 'admin') {
      return 'admin';
    }

    return 'customer';
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
      },
      error: () => {
        this.users = [];
        this.usersError = 'Unable to load dynamic users from MongoDB.';
      }
    });
  }

  private loadUserControls(): void {
    this.userControlMap = this.readJson<Record<string, LocalUserControl>>(USER_CONTROL_KEY, {});
  }

  private persistUserControls(): void {
    localStorage.setItem(USER_CONTROL_KEY, JSON.stringify(this.userControlMap));
  }

  private loadDriverControls(): void {
    this.driverControlMap = this.readJson<Record<string, DriverControl>>(DRIVER_CONTROL_KEY, {});
  }

  private persistDriverControls(): void {
    localStorage.setItem(DRIVER_CONTROL_KEY, JSON.stringify(this.driverControlMap));
  }

  private loadPricing(): void {
    this.pricing = this.readJson<PricingState>(PRICING_KEY, this.pricing);
  }

  private bootstrapPayments(): void {
    const existing = this.readJson<PaymentRecord[]>(PAYMENT_RECORDS_KEY, []);
    if (existing.length) {
      this.payments = existing;
      return;
    }

    const bookings = this.bookingService.getAllBookingsSnapshot();
    this.payments = bookings.slice(0, 12).map((b, idx) => {
      const amount = Number(b.estimatedFare || 0);
      const commission = Math.round((amount * this.pricing.commissionPercent) / 100);
      return {
        id: `TXN-${idx + 1001}`,
        bookingId: b.id,
        userName: b.userName,
        driverName: b.driverName,
        amount,
        commission,
        method: b.paymentMethod,
        status: 'paid',
        createdAt: b.updatedAt
      };
    });
    this.persistPayments();
  }

  private persistPayments(): void {
    localStorage.setItem(PAYMENT_RECORDS_KEY, JSON.stringify(this.payments));
  }

  private bootstrapWallets(): void {
    const existing = this.readJson<WalletEntry[]>(WALLETS_KEY, []);
    if (existing.length) {
      this.wallets = existing;
      return;
    }

    const customerWallets = this.users
      .filter((u) => this.normalizeRole(u.role) === 'customer')
      .slice(0, 5)
      .map((u, idx) => ({
        id: `WCU-${idx + 1}`,
        ownerType: 'customer' as const,
        ownerName: u.displayName,
        balance: 500 + idx * 220,
        updatedAt: new Date().toISOString()
      }));

    const driverWallets = this.users
      .filter((u) => this.normalizeRole(u.role) === 'driver')
      .slice(0, 5)
      .map((u, idx) => ({
        id: `WDR-${idx + 1}`,
        ownerType: 'driver' as const,
        ownerName: u.displayName,
        balance: 1200 + idx * 410,
        updatedAt: new Date().toISOString()
      }));

    this.wallets = [...customerWallets, ...driverWallets];
    localStorage.setItem(WALLETS_KEY, JSON.stringify(this.wallets));
  }

  private loadTickets(): void {
    this.tickets = this.readJson<SupportTicket[]>(TICKETS_KEY, []);
  }

  private persistTickets(): void {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(this.tickets));
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

  private readJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private randomScore(): number {
    return 78 + Math.floor(Math.random() * 20);
  }

  private isLiveStatus(status: BookingStatus): boolean {
    return ['created', 'assigned', 'pickup_in_progress', 'in_transit', 'arriving'].includes(status);
  }

  private computeSystemHealth(liveRides: number, cancelledRides: number, totalRides: number): string {
    if (!totalRides) {
      return 'Stable';
    }

    const cancellationRate = (cancelledRides / totalRides) * 100;
    if (cancellationRate > 20 || liveRides > 35) {
      return 'Watch';
    }

    if (cancellationRate > 30) {
      return 'Critical';
    }

    return 'Healthy';
  }
}
