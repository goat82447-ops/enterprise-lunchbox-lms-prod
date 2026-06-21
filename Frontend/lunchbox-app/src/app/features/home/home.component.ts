import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Params, Router, RouterLink } from '@angular/router';
import { catchError, interval, map, Observable, of, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import {
  DynamicNewsItem,
  DynamicOffer,
  IntegrationStatusColor
} from '../../core/models/delivery.models';
import { LanguageService } from '../../core/services/language.service';
import { OffersService } from '../../core/services/offers.service';
import { IntegrationHealthService } from '../../core/services/integration-health.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-page">
      <div class="container py-4 py-md-5">
        <section class="hero-shell">
          <div class="hero-copy">
            <span class="hero-kicker">RouteX Forward Mobility</span>
            <h1>One platform for every urban move.</h1>
            <p>
              Book rides, food, pickups, safety travel and deliveries with cinematic live tracking,
              secure OTP starts, and real-time operations.
            </p>
            <div class="hero-actions">
              <a routerLink="/booking" class="btn btn-danger btn-lg">Start Booking</a>
              <a routerLink="/services" class="btn btn-outline-light btn-lg">Explore Services</a>
            </div>
            <div class="hero-tags">
              <span>Live Captains</span>
              <span>Secure OTP</span>
              <span>24x7 Support</span>
              <span>Instant Dispatch</span>
            </div>
          </div>

          <div class="hero-visual">
            <div class="hero-brand-row">
              <img [src]="homeLogoSrc" (error)="onHomeLogoError($event)" alt="RouteX logo" class="hero-logo" />
            </div>
            <div class="metric-grid">
              <article>
                <strong>2 min</strong>
                <small>Avg Assignment</small>
              </article>
              <article>
                <strong>4.9</strong>
                <small>Rider Trust</small>
              </article>
              <article>
                <strong>99%</strong>
                <small>Route Accuracy</small>
              </article>
              <article>
                <strong>24x7</strong>
                <small>Support Desk</small>
              </article>
            </div>
          </div>
        </section>

        <section class="services-shell mt-4">
          <div class="section-head">
            <h2>Core Services</h2>
            <small>Fast access to your most-used flows</small>
          </div>
          <div class="services-grid">
            <a
              class="service-tile"
              *ngFor="let service of serviceHighlights; index as i"
              [routerLink]="service.route"
              [queryParams]="service.queryParams || null"
            >
              <div class="service-main">
                <div class="service-icon" [attr.aria-label]="service.iconAlt || service.title">
                  <img *ngIf="service.iconImage; else serviceTextIcon" [src]="service.iconImage" [alt]="service.iconAlt || service.title" class="service-icon-logo" />
                  <ng-template #serviceTextIcon>{{ service.icon }}</ng-template>
                </div>
                <h4>{{ service.title }}</h4>
                <p>{{ service.description }}</p>
              </div>
              <span class="service-arrow">-></span>
            </a>
          </div>
        </section>

        <section class="features-shell mt-4">
          <div class="section-head">
            <h2>Designed To Stand Out</h2>
            <small>Operational modules for customers, drivers, and admins</small>
          </div>
          <div class="features-grid">
            <article class="feature-tile" *ngFor="let feature of featureCards">
              <span class="feature-id">{{ feature.icon }}</span>
              <h4>{{ feature.title }}</h4>
              <p>{{ feature.description }}</p>
            </article>
          </div>
        </section>

        <section class="flash-shell mt-4">
          <img src="assets/rider-dummy.svg" alt="RouteX promo" class="flash-photo" />
          <div>
            <span class="flash-kicker">Limited User Offer</span>
            <h3>Unlock 50% OFF on first booking</h3>
            <p>Apply code <span>FIRST50</span> and move faster from day one.</p>
            <small>Live update: {{ updatedAt$ | async | date: 'mediumTime' }}</small>
          </div>
        </section>

        <section class="operations-shell mt-4" *ngIf="isAdmin">
          <div class="section-head">
            <h2>System Integrations</h2>
            <small>Real-time status across critical platform connectors</small>
          </div>
          <div class="integration-grid">
            <article class="integration-tile" *ngFor="let integration of integrationCards">
              <div class="integration-top">
                <span class="integration-icon">{{ integration.icon }}</span>
                <span
                  class="integration-state"
                  [class.live]="integration.statusColor === 'green'"
                  [class.down]="integration.statusColor === 'red'"
                >
                  {{ integration.statusLabel }}
                </span>
              </div>
              <h4>{{ integration.name }}</h4>
              <p>{{ integration.description }}</p>
              <small>{{ integration.details }}</small>
            </article>
          </div>
          <small class="integration-time">Checked: {{ integrationCheckedAt | date: 'mediumTime' }}</small>
        </section>

        <section class="content-grid mt-4">
          <div class="offers-shell" *ngIf="offers$ | async as offers">
            <div class="section-head mb-2">
              <h2>Latest Drops</h2>
              <small>Updated: {{ updatedAt$ | async | date: 'mediumTime' }}</small>
            </div>
            <div class="offer-list">
              <article class="offer-tile" *ngFor="let offer of offers">
                <span class="offer-badge">{{ offer.badge }}</span>
                <h4>{{ offer.title }}</h4>
                <p>{{ offer.subtitle }}</p>
                <div class="offer-meta">
                  <strong>{{ offer.discountPercent }}% OFF</strong>
                  <span>{{ offer.promoCode }}</span>
                </div>
                <small>Ends: {{ offer.expiresAt | date: 'short' }}</small>
              </article>
            </div>
          </div>

          <div class="news-shell" *ngIf="news$ | async as news">
            <div class="section-head mb-2">
              <h2>News and Alerts</h2>
              <small>Mobility + delivery feed</small>
            </div>
            <div class="news-list">
              <article class="news-tile" *ngFor="let item of news">
                <span>{{ item.tag | uppercase }}</span>
                <div>
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.summary }}</p>
                  <small>{{ item.publishedAt | date: 'medium' }}</small>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .home-page {
        position: relative;
        min-height: 100%;
      }

      .hero-shell,
      .services-shell,
      .features-shell,
      .flash-shell,
      .operations-shell,
      .offers-shell,
      .news-shell {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 20px;
        background: linear-gradient(150deg, rgba(10, 14, 23, 0.9) 0%, rgba(17, 24, 38, 0.82) 100%);
        box-shadow: 0 20px 44px rgba(3, 6, 14, 0.38);
      }

      .hero-shell {
        padding: 1.35rem;
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 1rem;
        overflow: hidden;
        position: relative;
      }

      .hero-shell::after {
        content: '';
        position: absolute;
        right: -110px;
        top: -110px;
        width: 280px;
        height: 280px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(234, 56, 76, 0.3), transparent 70%);
        pointer-events: none;
      }

      .hero-kicker {
        display: inline-block;
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 999px;
        color: #d5e4ff;
        padding: 0.22rem 0.75rem;
        text-transform: uppercase;
        font-size: 0.74rem;
        letter-spacing: 0.08em;
      }

      h1,
      h2,
      h3,
      h4 {
        margin: 0;
      }

      .hero-copy h1 {
        margin-top: 0.6rem;
        font-size: clamp(2rem, 1.7rem + 2vw, 3.6rem);
        line-height: 1;
        color: #ffffff;
      }

      .hero-copy p {
        margin: 0.7rem 0 1rem;
        color: #b6c3d6;
        max-width: 52ch;
      }

      .hero-actions {
        display: flex;
        gap: 0.65rem;
        flex-wrap: wrap;
      }

      .hero-tags {
        margin-top: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .hero-tags span {
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #e7edf8;
        padding: 0.25rem 0.62rem;
        font-size: 0.73rem;
      }

      .hero-visual {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        background: rgba(10, 14, 24, 0.6);
        padding: 0.8rem;
      }

      .hero-brand-row {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 0.8rem;
      }

      .hero-logo {
        width: 152px;
        height: 152px;
        object-fit: contain;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.06);
        padding: 0.5rem;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.55rem;
      }

      .metric-grid article {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        padding: 0.65rem;
      }

      .metric-grid strong {
        display: block;
        font-size: 1.2rem;
        color: #f6f9ff;
      }

      .metric-grid small {
        color: #a9b7cb;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.95rem;
      }

      .section-head h2 {
        color: #f8fbff;
        font-size: clamp(1.7rem, 1.4rem + 1vw, 2.4rem);
      }

      .section-head small {
        color: #9fb1c9;
      }

      .services-shell,
      .features-shell,
      .operations-shell,
      .offers-shell,
      .news-shell {
        padding: 1rem;
      }

      .services-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .service-tile {
        text-decoration: none;
        color: inherit;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.03);
        padding: 0.72rem;
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: center;
        transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
      }

      .service-tile:hover {
        transform: translateY(-2px);
        border-color: rgba(234, 56, 76, 0.5);
        box-shadow: 0 14px 30px rgba(234, 56, 76, 0.16);
      }

      .service-icon {
        width: 44px;
        height: 44px;
        border-radius: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(145deg, rgba(234, 56, 76, 0.18), rgba(249, 115, 79, 0.12));
        border: 1px solid rgba(234, 56, 76, 0.32);
        margin-bottom: 0.36rem;
        font-size: 1.15rem;
      }

      .service-icon-logo {
        width: 30px;
        height: 30px;
        object-fit: contain;
      }

      .service-main h4 {
        color: #f9fbff;
        font-size: 1.45rem;
      }

      .service-main p {
        margin: 0;
        color: #a8b7ca;
        font-size: 0.86rem;
      }

      .service-arrow {
        color: #c4d1e6;
        font-size: 1.2rem;
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.7rem;
      }

      .feature-tile {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        padding: 0.85rem;
      }

      .feature-id {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        color: #f2f7ff;
        padding: 0.18rem 0.52rem;
        font-size: 0.72rem;
        margin-bottom: 0.45rem;
      }

      .feature-tile h4 {
        font-size: 1.32rem;
        color: #f8fbff;
      }

      .feature-tile p {
        margin: 0;
        color: #9fb0c7;
        font-size: 0.86rem;
      }

      .flash-shell {
        padding: 0.8rem;
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 0.8rem;
        align-items: center;
      }

      .flash-photo {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.16);
      }

      .flash-kicker {
        border-radius: 999px;
        background: linear-gradient(120deg, #ea384c 0%, #f9734f 100%);
        color: #fff;
        padding: 0.24rem 0.7rem;
        display: inline-block;
        font-size: 0.72rem;
        text-transform: uppercase;
      }

      .flash-shell h3 {
        margin-top: 0.5rem;
        color: #f9fbff;
        font-size: 1.7rem;
      }

      .flash-shell p {
        color: #a8b7ca;
        margin: 0.4rem 0;
      }

      .flash-shell p span {
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.26);
        color: #f8fcff;
        padding: 0.1rem 0.45rem;
      }

      .flash-shell small,
      .integration-time {
        color: #91a5c1;
      }

      .integration-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.7rem;
      }

      .integration-tile {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        padding: 0.75rem;
      }

      .integration-top {
        display: flex;
        justify-content: space-between;
        gap: 0.45rem;
        margin-bottom: 0.4rem;
      }

      .integration-icon {
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        color: #dce7fa;
        padding: 0.17rem 0.5rem;
        font-size: 0.72rem;
      }

      .integration-state {
        border-radius: 999px;
        background: rgba(251, 191, 36, 0.2);
        color: #fde68a;
        padding: 0.17rem 0.5rem;
        font-size: 0.72rem;
      }

      .integration-state.live {
        background: rgba(16, 185, 129, 0.2);
        color: #86efac;
      }

      .integration-state.down {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
      }

      .integration-tile h4 {
        color: #f9fcff;
        font-size: 1.3rem;
      }

      .integration-tile p,
      .integration-tile small {
        margin: 0;
        color: #9fb0c8;
      }

      .content-grid {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 0.75rem;
      }

      .offer-list,
      .news-list {
        display: grid;
        gap: 0.65rem;
      }

      .offer-tile,
      .news-tile {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        padding: 0.68rem;
      }

      .offer-badge {
        border-radius: 999px;
        border: 1px solid rgba(134, 239, 172, 0.42);
        color: #bbf7d0;
        padding: 0.14rem 0.5rem;
        font-size: 0.72rem;
      }

      .offer-tile h4,
      .news-tile h4 {
        margin-top: 0.4rem;
        color: #fbfdff;
        font-size: 1.3rem;
      }

      .offer-tile p,
      .news-tile p {
        margin: 0.15rem 0 0.45rem;
        color: #9fb0c8;
      }

      .offer-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.35rem;
        margin-bottom: 0.25rem;
      }

      .offer-meta strong {
        color: #ffd3c9;
      }

      .offer-meta span,
      .news-tile span {
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        color: #dbe8fa;
        padding: 0.14rem 0.5rem;
        font-size: 0.72rem;
      }

      .offer-tile small,
      .news-tile small {
        color: #8ea3bf;
      }

      .news-tile {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.55rem;
      }

      @media (max-width: 1080px) {
        .hero-shell,
        .content-grid,
        .integration-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .hero-shell,
        .services-shell,
        .features-shell,
        .flash-shell,
        .operations-shell,
        .offers-shell,
        .news-shell {
          border-radius: 16px;
        }

        .hero-actions .btn {
          width: 100%;
        }

        .hero-brand-row {
          justify-content: center;
        }

        .hero-logo {
          width: 136px;
          height: 136px;
        }

        .services-grid {
          grid-template-columns: 1fr;
        }

        .features-grid {
          grid-template-columns: 1fr;
        }

        .flash-shell {
          grid-template-columns: 1fr;
        }

        .news-tile {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class HomeComponent {
  homeLogoSrc = '/assets/lunchbox-logo.svg';
  private readonly destroy$ = new Subject<void>();
  integrationCheckedAt = new Date().toISOString();

  readonly serviceHighlights: HomeServiceHighlight[] = [
    {
      icon: '🍱',
      iconImage: '/assets/lunchbox-logo.svg',
      iconAlt: 'Food delivery logo',
      title: 'Food Delivery',
      description: 'Nearby restaurants with live prep and captain ETA.',
      route: '/booking/food/hotels'
    },
    {
      icon: '📦',
      title: 'Pickup Service',
      description: 'Pickup item from any shop to your destination.',
      route: '/booking',
      queryParams: { service: 'parcel', pickupService: 1 }
    },
    {
      icon: '🛡️',
      title: 'Women Safety Mode',
      description: 'Trusted captains and priority routing for secure travel.',
      route: '/booking',
      queryParams: { womenSafety: 1 }
    },
    {
      icon: '🎓',
      title: 'School and Teen Rides',
      description: 'Assisted and parent-safe commute flows for students.',
      route: '/booking',
      queryParams: { teenRide: 1 }
    }
  ];

  readonly featureCards = [
    {
      icon: '01',
      title: 'Fast Multi-Service Booking',
      description: 'Book food, parcel, grocery, medicine, and document deliveries in one app.'
    },
    {
      icon: '02',
      title: 'Live Tracking',
      description: 'Track captain location and status updates from pickup to final drop.'
    },
    {
      icon: '03',
      title: 'Secure Ride Start',
      description: 'OTP-based start confirmation keeps every trip protected.'
    },
    {
      icon: '04',
      title: 'Driver Workflow',
      description: 'Drivers can accept, manage, and complete rides with clear state flow.'
    },
    {
      icon: '05',
      title: 'Offers Engine',
      description: 'Dynamic promotions and campaign drops rendered in real time.'
    },
    {
      icon: '06',
      title: 'Admin Command Center',
      description: 'Operations, pricing, payments, and support controls from one console.'
    }
  ];

  integrationCards: HomeIntegrationCard[] = [
    {
      icon: 'MAP',
      key: 'googleMaps',
      name: 'Google Maps Distance Matrix',
      description: 'Used for route distance, ETA, and traffic-aware fare estimation.',
      statusLabel: 'Checking...',
      statusColor: 'red',
      details: 'Waiting for backend health check.'
    },
    {
      icon: 'WTH',
      key: 'openWeather',
      name: 'OpenWeather API',
      description: 'Weather-based surge logic support for dynamic pricing.',
      statusLabel: 'Checking...',
      statusColor: 'red',
      details: 'Waiting for backend health check.'
    },
    {
      icon: 'OTP',
      key: 'otpDelivery',
      name: 'Customer OTP Verification',
      description: 'One-time verification and secure ride start flow.',
      statusLabel: 'Checking...',
      statusColor: 'red',
      details: 'Waiting for backend health check.'
    },
    {
      icon: 'AUTH',
      key: 'authService',
      name: 'Auth Service Core',
      description: 'Core authentication and session APIs powering the app.',
      statusLabel: 'Checking...',
      statusColor: 'red',
      details: 'Waiting for backend health check.'
    }
  ];

  readonly offers$!: Observable<DynamicOffer[]>;
  readonly news$!: Observable<DynamicNewsItem[]>;
  readonly updatedAt$!: Observable<string>;

  constructor(
    private languageService: LanguageService,
    offersService: OffersService,
    private integrationHealthService: IntegrationHealthService,
    private authService: AuthService,
    private router: Router
  ) {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'captain') {
      this.router.navigate(['/captain-profile']);
      return;
    }
    if (user?.role === 'admin') {
      this.router.navigate(['/admin']);
      return;
    }

    this.offers$ = offersService.feed$.pipe(map((feed) => feed.offers.slice(0, 4)));
    this.news$ = offersService.feed$.pipe(map((feed) => feed.news.slice(0, 4)));
    this.updatedAt$ = offersService.feed$.pipe(map((feed) => feed.updatedAt));

    interval(15000)
      .pipe(
        startWith(0),
        switchMap(() => this.integrationHealthService.getHealth().pipe(catchError(() => of(null)))),
        takeUntil(this.destroy$)
      )
      .subscribe((health) => {
        if (!health) {
          const now = new Date().toISOString();
          this.integrationCheckedAt = now;
          this.integrationCards = this.integrationCards.map((card) => ({
            ...card,
            statusLabel: 'Down',
            statusColor: 'red',
            details: 'Health endpoint not reachable.',
            checkedAt: now
          }));
          return;
        }

        this.integrationCheckedAt = health.checkedAt;
        const byKey = new Map(health.integrations.map((item) => [item.key, item]));
        this.integrationCards = this.integrationCards.map((card) => {
          const live = byKey.get(card.key);
          if (!live) {
            return {
              ...card,
              statusLabel: 'Down',
              statusColor: 'red',
              details: 'No health data returned.',
              checkedAt: health.checkedAt
            };
          }

          return {
            ...card,
            statusLabel: live.healthy ? 'Live' : 'Down',
            statusColor: live.statusColor,
            details: live.details,
            checkedAt: live.checkedAt
          };
        });
      });
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  onHomeLogoError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    const current = image.getAttribute('src') || '';
    if (current === '/assets/ekart-logo.svg') {
      image.src = '/assets/lunchbox-logo.svg';
      return;
    }

    if (current === '/assets/lunchbox-logo.svg') {
      image.src = '/assets/rider-dummy.svg';
      return;
    }

    image.onerror = null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

interface HomeIntegrationCard {
  icon: string;
  key: string;
  name: string;
  description: string;
  statusLabel: 'Live' | 'Down' | 'Checking...';
  statusColor: IntegrationStatusColor;
  details: string;
  checkedAt?: string;
}

interface HomeServiceHighlight {
  icon: string;
  iconImage?: string;
  iconAlt?: string;
  title: string;
  description: string;
  route: string;
  queryParams?: Params;
}
