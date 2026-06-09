import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
    <div class="container py-4 py-md-5">
      <section class="hero-card">
        <div class="hero-brand">
          <img
            [src]="homeLogoSrc"
            (error)="onHomeLogoError($event)"
            alt="RouteX logo"
            class="hero-logo"
          />
          <div>
            <div class="brand-pill">ROUTEX SUPER APP</div>
            <h1 class="display-5 fw-bold mb-2 mt-2 hero-headline">One App. Every Journey 🚀</h1>
            <p class="lead mb-4">Book food, parcel, pickup service, women safety rides, and more with live captain tracking.</p>
            <div class="d-grid d-md-flex gap-2 flex-wrap">
              <a routerLink="/booking" class="btn btn-danger btn-lg">{{ t('bookDelivery') }}</a>
              <a routerLink="/services" class="btn btn-outline-light btn-lg fw-semibold">Explore Services</a>
            </div>
          </div>
        </div>

        <div class="hero-metrics">
          <div class="metric-card">
            <div class="metric-value">24x7</div>
            <div class="metric-label">Live Support</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">Live</div>
            <div class="metric-label">Captain Tracking</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">OTP</div>
            <div class="metric-label">Secure Ride Start</div>
          </div>
        </div>
      </section>

      <section class="service-showcase mt-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 class="mb-0">Popular Services</h3>
          <small class="text-muted">Tap and start in seconds</small>
        </div>
        <div class="service-showcase-grid">
          <a
            class="service-showcase-card"
            *ngFor="let service of serviceHighlights"
            [routerLink]="service.route"
            [queryParams]="service.queryParams || null"
          >
            <div class="service-card-glow"></div>
            <div class="service-showcase-icon">{{ service.icon }}</div>
            <span class="service-showcase-label">{{ service.title }}</span>
          </a>
        </div>
      </section>

      <section class="integration-panel mt-3" *ngIf="isAdmin">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 class="mb-0">Integrations</h3>
          <small class="text-muted">Connected services and platform modules</small>
        </div>
        <div class="integration-grid">
          <div class="integration-card" *ngFor="let integration of integrationCards">
            <div class="integration-icon">{{ integration.icon }}</div>
            <div>
              <h6 class="mb-1">{{ integration.name }}</h6>
              <p class="mb-1 text-muted small">{{ integration.description }}</p>
              <span
                class="integration-status"
                [class.integration-status-live]="integration.statusColor === 'green'"
                [class.integration-status-down]="integration.statusColor === 'red'"
              >
                {{ integration.statusLabel }}
              </span>
              <div class="text-muted small mt-1">{{ integration.details }}</div>
            </div>
          </div>
        </div>
        <small class="text-muted d-block mt-2">Checked: {{ integrationCheckedAt | date: 'mediumTime' }}</small>
      </section>

      <section class="feature-panel mt-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 class="mb-0">Features You Can Use Instantly</h3>
          <small class="text-muted">Designed for customers, captains, and admins</small>
        </div>
        <div class="feature-grid">
          <div class="feature-card" *ngFor="let feature of featureCards">
            <div class="feature-icon">{{ feature.icon }}</div>
            <h5 class="mb-1">{{ feature.title }}</h5>
            <p class="mb-0 text-muted">{{ feature.description }}</p>
          </div>
        </div>
      </section>

      <section class="flash-banner mt-3">
        <img src="assets/rider-dummy.svg" alt="Rider promo" class="flash-photo" />
        <div>
          <div class="flash-chip">NEW USER OFFER</div>
          <h4 class="mb-1">Get 50% OFF on your first trip</h4>
          <p class="mb-2">Apply code <span class="flash-code">FIRST50</span> at checkout.</p>
          <small class="text-muted">Live update: {{ updatedAt$ | async | date: 'mediumTime' }}</small>
        </div>
      </section>

      <div class="row g-3 mt-3" *ngIf="offers$ | async as offers">
        <div class="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h3 class="mb-0">Latest Offers</h3>
          <small class="text-muted">Updated: {{ updatedAt$ | async | date: 'mediumTime' }}</small>
        </div>
        <div class="col-12 col-md-6 col-xl-3" *ngFor="let offer of offers">
          <div class="offer-card h-100">
            <div class="badge-chip">{{ offer.badge }}</div>
            <div class="discount-pill">{{ offer.discountPercent }}% OFF</div>
            <h5 class="mb-1">{{ offer.title }}</h5>
            <p class="text-muted small mb-3">{{ offer.subtitle }}</p>
            <div class="small mb-1"><strong>Code:</strong> {{ offer.promoCode }}</div>
            <div class="small text-muted">Ends: {{ offer.expiresAt | date: 'short' }}</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1" *ngIf="news$ | async as news">
        <div class="col-12">
          <h3 class="mb-0">News and Discounts</h3>
        </div>
        <div class="col-12" *ngFor="let item of news">
          <div class="news-card">
            <span class="tag-pill">{{ item.tag | uppercase }}</span>
            <div>
              <h6 class="mb-1">{{ item.title }}</h6>
              <p class="mb-1 text-muted">{{ item.summary }}</p>
              <small class="text-muted">{{ item.publishedAt | date: 'medium' }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .hero-card {
        background: linear-gradient(145deg, #0b2239 0%, #13416a 55%, #1d5f8f 100%);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 24px;
      }

      .hero-brand {
        display: grid;
        grid-template-columns: minmax(104px, 128px) 1fr;
        gap: 18px;
        align-items: center;
      }

      .hero-brand > div {
        min-width: 0;
      }

      .hero-logo {
        width: 100%;
        max-width: 128px;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.26);
        background: rgba(255, 255, 255, 0.08);
        padding: 6px;
      }

      .hero-headline {
        font-size: clamp(2.05rem, 1.3rem + 2.2vw, 3.2rem);
        line-height: 1.1;
        letter-spacing: 0.01em;
      }

      .brand-pill {
        display: inline-block;
        background: rgba(255, 255, 255, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.28);
        color: #dbeafe;
        border-radius: 999px;
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      .hero-metrics {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .metric-card {
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 12px;
      }

      .metric-value {
        font-size: 22px;
        font-weight: 700;
      }

      .metric-label {
        font-size: 13px;
        opacity: 0.9;
      }

      .feature-panel {
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 16px;
        background: linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%);
        padding: 16px;
      }

      .service-showcase {
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 16px;
        background: linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%);
        padding: 16px;
      }

      .service-showcase-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .service-showcase-card {
        text-decoration: none;
        color: inherit;
        border: 1px solid rgba(0, 0, 0, 0.07);
        border-radius: 18px;
        background: var(--surface);
        padding: 20px 10px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
        position: relative;
        overflow: hidden;
        transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.24s ease, border-color 0.24s ease;
      }

      .service-card-glow {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 50% 0%, rgba(239, 35, 60, 0.1) 0%, transparent 65%);
        opacity: 0;
        transition: opacity 0.28s ease;
        pointer-events: none;
        border-radius: inherit;
      }

      .service-showcase-card:hover {
        transform: translateY(-6px) scale(1.04);
        border-color: rgba(239, 35, 60, 0.38);
        box-shadow: 0 16px 32px rgba(2, 6, 23, 0.12), 0 0 0 1px rgba(239, 35, 60, 0.15);
      }

      .service-showcase-card:hover .service-card-glow {
        opacity: 1;
      }

      .service-showcase-card:active {
        transform: translateY(-2px) scale(1.01);
      }

      .service-showcase-icon {
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: linear-gradient(145deg, #fff1f2 0%, #ffe4e6 100%);
        border: 1px solid rgba(239, 35, 60, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        flex-shrink: 0;
        transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.24s ease;
      }

      .service-showcase-card:hover .service-showcase-icon {
        transform: scale(1.14) rotate(-5deg);
        box-shadow: 0 8px 20px rgba(239, 35, 60, 0.22);
      }

      .service-showcase-label {
        font-size: 11.5px;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.3;
        text-align: center;
        word-break: break-word;
        letter-spacing: 0.01em;
      }

      .integration-panel {
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 16px;
        background: linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%);
        padding: 16px;
      }

      .integration-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .integration-card {
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        padding: 12px;
        display: grid;
        grid-template-columns: 38px 1fr;
        gap: 10px;
        align-items: start;
        background: var(--surface);
      }

      .integration-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #ecf2ff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .integration-status {
        display: inline-block;
        border-radius: 999px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 700;
        background: #fff4e5;
        color: #8a5200;
      }

      .integration-status-live {
        background: #e9f7ef;
        color: #146c43;
      }

      .integration-status-down {
        background: #fdeaea;
        color: #9f1239;
      }

      .feature-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .feature-card {
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        padding: 14px;
        background: var(--surface);
      }

      .feature-icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: #e8f3ff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        margin-bottom: 8px;
      }

      .flash-banner {
        border: 1px solid rgba(220, 53, 69, 0.25);
        border-radius: 16px;
        padding: 12px;
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 12px;
        align-items: center;
        background: linear-gradient(120deg, var(--surface-2) 0%, var(--surface) 100%);
      }

      .flash-photo {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
      }

      .flash-chip {
        display: inline-block;
        background: #ef233c;
        color: #fff;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .flash-code {
        display: inline-block;
        background: #1d3557;
        color: #fff;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 12px;
      }

      .offer-card, .news-card {
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        padding: 12px;
        background: var(--surface);
      }

      .badge-chip {
        display: inline-block;
        background: #e9f5ef;
        color: #1b4332;
        border-radius: 999px;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .discount-pill {
        display: inline-block;
        background: #ef233c;
        color: #fff;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 8px;
      }

      .news-card {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        align-items: start;
      }

      .tag-pill {
        background: #2d6a4f;
        color: #fff;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 700;
      }

      /* ── Mobile small (< 480px) ── */
      @media (max-width: 479px) {
        .hero-card {
          padding: 18px 14px;
          border-radius: 16px;
        }

        .hero-brand {
          grid-template-columns: 1fr;
        }

        .hero-logo {
          max-width: 96px;
        }

        .hero-card .display-5 {
          font-size: 1.75rem;
          line-height: 1.2;
        }

        .hero-card .lead {
          font-size: 0.9rem;
          margin-bottom: 0.8rem !important;
        }

        .hero-card .btn {
          width: 100%;
        }

        .hero-metrics {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .metric-card {
          padding: 10px 8px;
        }

        .metric-value {
          font-size: 18px;
        }

        .metric-label {
          font-size: 11px;
        }

        .flash-banner {
          grid-template-columns: 1fr;
        }

        .feature-grid {
          grid-template-columns: 1fr;
        }

        .service-showcase-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .service-showcase-card {
          padding: 16px 8px 14px;
          border-radius: 16px;
        }

        .service-showcase-icon {
          width: 52px;
          height: 52px;
          font-size: 22px;
          border-radius: 14px;
        }

        .service-showcase-label {
          font-size: 11px;
        }

        .integration-grid {
          grid-template-columns: 1fr;
        }

        .news-card {
          grid-template-columns: 1fr;
        }

        .discount-pill {
          margin-top: 6px;
        }
      }

      /* ── Mobile medium (480px – 767px) ── */
      @media (min-width: 480px) and (max-width: 767px) {
        .service-showcase-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .feature-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .flash-banner {
          grid-template-columns: 120px 1fr;
        }
      }

      /* ── Tablet (768px – 1199px) ── */
      @media (min-width: 768px) and (max-width: 1199px) {
        .service-showcase-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .feature-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      /* ── Desktop (≥ 1200px) ── */
      @media (min-width: 1200px) {
        .service-showcase-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .service-showcase-card {
          min-height: 230px;
        }

        .feature-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `
  ]
})
export class HomeComponent {
  homeLogoSrc = '/assets/lunchbox-logo.svg';
  private readonly destroy$ = new Subject<void>();
  integrationCheckedAt = new Date().toISOString();

  readonly serviceHighlights = [
    {
      icon: '🍔',
      title: 'Food Delivery',
      description: 'Nearby restaurants with live prep and captain ETA.',
      route: '/booking/food/hotels'
    },
    {
      icon: '🛍️',
      title: 'Pickup Service',
      description: 'Pickup item from any shop to your destination.',
      route: '/booking',
      queryParams: { service: 'parcel', pickupService: 1 }
    },
    {
      icon: '🛡️',
      title: 'Women Safety Mode',
      description: 'Top-ranked trusted captains prioritized first.',
      route: '/booking',
      queryParams: { womenSafety: 1, service: 'parcel' }
    },
    {
      icon: '🎒',
      title: 'School and Teen Rides',
      description: 'RouteX school delivery and teen-safe assisted ride options.',
      route: '/lunchbox-delivery',
      queryParams: { lunchBox: 1, service: 'food' }
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
      description: 'New customers verify OTP once during registration for a safe and trusted flow.'
    },
    {
      icon: '04',
      title: 'Captain Workflow',
      description: 'Captains can approve rides, update status, and complete deliveries with clarity.'
    },
    {
      icon: '05',
      title: 'Offers and Discounts',
      description: 'Get dynamic offer cards and flash discount updates directly on the home screen.'
    },
    {
      icon: '06',
      title: 'Admin Monitoring',
      description: 'Admins can monitor active bookings and operations in a dedicated control panel.'
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
      description: 'One-time registration verification and secure ride start flow.',
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

  readonly offers$: Observable<DynamicOffer[]>;
  readonly news$: Observable<DynamicNewsItem[]>;
  readonly updatedAt$: Observable<string>;

  constructor(
    private languageService: LanguageService,
    offersService: OffersService,
    private integrationHealthService: IntegrationHealthService,
    private authService: AuthService
  ) {
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
