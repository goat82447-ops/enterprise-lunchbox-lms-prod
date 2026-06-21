import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserRole } from '../../core/models/delivery.models';
import { AuthService } from '../../core/services/auth.service';

interface RoleTile {
  title: string;
  subtitle: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-role-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="role-page">
      <div class="role-bg"></div>
      <div class="container py-4 py-md-5 position-relative">
        <div class="role-card">
          <div class="header-row">
            <div>
              <p class="eyebrow">Role Center</p>
              <h1 class="title">{{ heading }}</h1>
              <p class="desc">{{ description }}</p>
            </div>
            <button class="btn btn-outline-light btn-sm" (click)="logout()">Logout</button>
          </div>

          <div class="tile-grid">
            <a class="tile" *ngFor="let tile of tiles" [routerLink]="tile.route" [style.border-color]="tile.color">
              <h3>{{ tile.title }}</h3>
              <p>{{ tile.subtitle }}</p>
              <span>Open</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .role-page {
        min-height: calc(100vh - 56px);
        position: relative;
        background:
          radial-gradient(circle at 15% 20%, rgba(247, 84, 60, 0.2), transparent 36%),
          radial-gradient(circle at 85% 30%, rgba(28, 149, 217, 0.16), transparent 36%),
          linear-gradient(140deg, #091018, #111a24 52%, #1f2a33);
        color: #f6f7fb;
      }

      .role-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 24px 24px;
      }

      .role-card {
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 20px;
        padding: 20px;
        background: rgba(7, 12, 17, 0.75);
        backdrop-filter: blur(8px);
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 20px;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 11px;
        color: #8cc5ef;
        margin: 0;
      }

      .title {
        margin: 4px 0 8px;
      }

      .desc {
        margin: 0;
        color: #c2c7d0;
        max-width: 700px;
      }

      .tile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }

      .tile {
        text-decoration: none;
        color: #f6f8fc;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 14px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.03);
        transition: transform 0.15s ease, background 0.15s ease;
      }

      .tile:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.08);
      }

      .tile h3 {
        margin: 0 0 8px;
        font-size: 18px;
      }

      .tile p {
        margin: 0 0 14px;
        color: #ced3db;
        min-height: 40px;
      }

      .tile span {
        font-size: 12px;
        color: #8cc5ef;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      @media (max-width: 768px) {
        .role-card {
          padding: 16px;
        }

        .header-row {
          flex-direction: column;
        }
      }
    `
  ]
})
export class RoleDashboardComponent {
  readonly user;
  readonly role;
  readonly heading;
  readonly description;
  readonly tiles;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    this.user = this.auth.getCurrentUser();
    this.role = this.user?.role ?? 'customer';
    this.heading = this.getHeading(this.role);
    this.description = this.getDescription(this.role);
    this.tiles = this.getTiles(this.role);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private getHeading(role: UserRole): string {
    const map: Record<UserRole, string> = {
      customer: 'Customer Dashboard',
      rider: 'Rider Dashboard',
      driver: 'Driver Dashboard',
      captain: 'Driver Dashboard',
      admin: 'Admin Command Center',
      fleet_owner: 'Fleet Owner Console',
      support_executive: 'Support Executive Desk',
      user: 'Customer Dashboard'
    };

    return map[role] ?? 'Role Dashboard';
  }

  private getDescription(role: UserRole): string {
    const map: Record<UserRole, string> = {
      customer: 'Book rides, manage orders, and track deliveries in real time.',
      rider: 'Book rides, manage orders, and track deliveries in real time.',
      driver: 'Manage assigned trips, payouts, and profile verification details.',
      captain: 'Manage assigned trips, payouts, and profile verification details.',
      admin: 'Control users, monitor audits, and manage platform operations.',
      fleet_owner: 'Monitor drivers, vehicles, and fleet-level earnings and health.',
      support_executive: 'Review user issues, tickets, and customer assistance workflows.',
      user: 'Book rides, manage orders, and track deliveries in real time.'
    };

    return map[role] ?? 'Use your role tools to continue.';
  }

  private getTiles(role: UserRole): RoleTile[] {
    if (role === 'admin') {
      return [
        { title: 'Admin Panel', subtitle: 'Users, operations and moderation', route: '/admin', color: '#f97316' },
        { title: 'Audit Logs', subtitle: 'System action review trail', route: '/audit', color: '#14b8a6' },
        { title: 'Support', subtitle: 'Customer escalations and reports', route: '/contact', color: '#60a5fa' }
      ];
    }

    if (role === 'driver' || role === 'captain') {
      return [
        { title: 'Driver Hub', subtitle: 'Auth, docs, dashboard, rides, earnings, safety', route: '/driver-hub', color: '#22c55e' },
        { title: 'Ride Assignments', subtitle: 'Daily rides and completion metrics', route: '/captain-rides', color: '#eab308' },
        { title: 'Bank & Payout', subtitle: 'Settlement and payout history', route: '/captain-bank', color: '#38bdf8' }
      ];
    }

    if (role === 'fleet_owner') {
      return [
        { title: 'Fleet Overview', subtitle: 'Track your vehicles and driver performance', route: '/tracking', color: '#a78bfa' },
        { title: 'Driver Accounts', subtitle: 'Manage your active driver profiles', route: '/captain-rides', color: '#22c55e' },
        { title: 'Finance Snapshot', subtitle: 'Trips, commissions and payout health', route: '/captain-bank', color: '#f59e0b' }
      ];
    }

    if (role === 'support_executive') {
      return [
        { title: 'Support Inbox', subtitle: 'Handle complaints and incidents', route: '/contact', color: '#60a5fa' },
        { title: 'Activity Timeline', subtitle: 'Customer journey and action logs', route: '/activity', color: '#34d399' },
        { title: 'Safety', subtitle: 'Escalation and emergency workflows', route: '/safety', color: '#f87171' }
      ];
    }

    return [
      { title: 'Home', subtitle: 'Discover services and offers', route: '/home', color: '#fb7185' },
      { title: 'Book Ride', subtitle: 'Pickup and destination booking', route: '/travel', color: '#2dd4bf' },
      { title: 'Orders', subtitle: 'Track active and completed orders', route: '/order-tracking', color: '#93c5fd' }
    ];
  }
}
