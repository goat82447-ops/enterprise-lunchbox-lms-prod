import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AppUser } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4" *ngIf="user$ | async as user; else noUser">
      <div class="card p-3 p-md-4 mb-3">
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <img class="account-avatar" [src]="avatarUrl(user)" [alt]="user.displayName" />
          <div>
            <div class="small text-muted">Account Profile</div>
            <h3 class="mb-1">{{ user.displayName }}</h3>
            <span class="badge role-badge">{{ user.role | titlecase }}</span>
          </div>
        </div>
      </div>

      <div class="card p-3 p-md-4 mb-3">
        <h5 class="mb-3">Profile Details</h5>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small text-muted mb-1">User ID</label>
            <div class="profile-value">{{ user.id }}</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted mb-1">Username</label>
            <div class="profile-value">{{ user.username }}</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted mb-1">Display Name</label>
            <div class="profile-value">{{ user.displayName }}</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted mb-1">Role</label>
            <div class="profile-value">{{ user.role | titlecase }}</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted mb-1">Email</label>
            <div class="profile-value">{{ user.email || '-' }}</div>
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted mb-1">Mobile</label>
            <div class="profile-value">{{ user.mobile || '-' }}</div>
          </div>
          <div class="col-md-6" *ngIf="user.captainVehicle">
            <label class="form-label small text-muted mb-1">Vehicle</label>
            <div class="profile-value">{{ user.captainVehicle | titlecase }}</div>
          </div>
        </div>
      </div>

      <div class="card p-3 p-md-4">
        <h6 class="mb-3">Quick Actions</h6>
        <div class="d-flex gap-2 flex-wrap">
          <a class="btn btn-primary btn-sm" routerLink="/booking">Book Now</a>
          <a class="btn btn-outline-secondary btn-sm" routerLink="/activity">Activity</a>
          <button class="btn btn-outline-danger btn-sm" type="button" (click)="logout()">Logout</button>
        </div>
      </div>
    </div>

    <ng-template #noUser>
      <div class="container py-4">
        <div class="alert alert-warning mb-3">Please login to view account profile details.</div>
        <a class="btn btn-primary" routerLink="/login">Go to Login</a>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .account-avatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e5e7eb;
        background: #f8fafc;
      }

      .profile-value {
        padding: 10px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fff;
        font-weight: 500;
        min-height: 42px;
        display: flex;
        align-items: center;
      }

      .role-badge {
        background: #eef2ff;
        color: #3730a3;
      }
    `
  ]
})
export class AccountComponent {
  readonly user$: Observable<AppUser | null>;

  constructor(private auth: AuthService, private router: Router) {
    this.user$ = this.auth.user$;
  }

  avatarUrl(user: AppUser): string {
    if (user.profileImageUrl) {
      return user.profileImageUrl;
    }

    const name = encodeURIComponent(user.displayName || user.username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=2563eb&color=ffffff&size=160&bold=true`;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
