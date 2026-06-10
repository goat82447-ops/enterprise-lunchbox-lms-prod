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

      <!-- ─ Features panel hidden (available but not shown on home) ─ -->

      <section class="flash-banner mt-3">
        <img src="assets/rider-dummy.svg" alt="Rider promo" class="flash-photo" />
        <div>
          <div class="flash-chip">NEW USER OFFER</div>
          <h4 class="mb-1">Get 50% OFF on your first trip</h4>
          <p class="mb-2">Apply code <span class="flash-code">FIRST50</span> at checkout.</p>
          <small class="text-muted">Live update: {{ updatedAt$ | async | date: 'mediumTime' }}</small>
        </div>
      </section>

      <!-- ── OFFERS STRIP ── -->
      <div class="offers-section mt-3" *ngIf="offers$ | async as offers">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="offers-section-title">
            <span class="offers-fire">🔥</span> Hot &amp; New Offers
          </div>
          <small class="text-muted">Live · {{ updatedAt$ | async | date: 'shortTime' }}</small>
        </div>

        <div class="offers-scroll-track">
          <div class="offer-pill-card" *ngFor="let offer of offers"
               [style.--offer-color]="offer.color">

            <!-- label badge -->
            <div class="offer-label" [ngClass]="'offer-label-' + offer.labelType">
              <span *ngIf="offer.labelType === 'hot'">🔥 HOT</span>
              <span *ngIf="offer.labelType === 'new'">✨ NEW</span>
              <span *ngIf="offer.labelType === 'flash'">⚡ FLASH</span>
              <span *ngIf="offer.labelType === 'limited'">⏳ LIMITED</span>
              <span *ngIf="offer.labelType === 'top'">🏆 TOP PICK</span>
            </div>

            <!-- emoji + discount -->
            <div class="offer-pill-emoji">{{ offer.emoji }}</div>
            <div class="offer-discount-big">{{ offer.discountPercent }}%<span class="offer-off">OFF</span></div>

            <!-- title + subtitle -->
            <div class="offer-pill-title">{{ offer.title }}</div>
            <div class="offer-pill-sub">{{ offer.subtitle }}</div>

            <!-- promo code row -->
            <div class="offer-code-row">
              <span class="offer-code-chip">{{ offer.promoCode }}</span>
              <button class="offer-copy-btn"
                      (click)="copyCode(offer.promoCode)"
                      [class.offer-copied]="copiedCode === offer.promoCode">
                {{ copiedCode === offer.promoCode ? '✓ Copied' : 'Copy' }}
              </button>
            </div>

            <!-- expires -->
            <div class="offer-expires">
              Expires {{ offer.expiresAt | date: 'shortTime' }}
            </div>
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
        padding: 20px 14px;
        background: var(--surface);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        min-height: 160px;
      }

      .feature-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: #e8f3ff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        margin-bottom: 12px;
        flex-shrink: 0;
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

      /* ── OFFERS STRIP ── */
      .offers-section-title {
        font-size: 17px; font-weight: 800; color: var(--text-primary, #111);
        display: flex; align-items: center; gap: 6px;
      }
      .offers-fire { font-size: 18px; }

      .offers-scroll-track {
        display: flex; gap: 12px;
        overflow-x: auto; padding-bottom: 8px;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
      }
      .offers-scroll-track::-webkit-scrollbar { height: 4px; }
      .offers-scroll-track::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

      .offer-pill-card {
        flex-shrink: 0; width: 190px;
        background: #fff;
        border: 1.5px solid rgba(0,0,0,.07);
        border-radius: 20px; padding: 14px 14px 12px;
        scroll-snap-align: start;
        position: relative; overflow: hidden;
        box-shadow: 0 2px 12px rgba(0,0,0,.07);
        transition: transform .15s, box-shadow .15s;
        border-top: 4px solid var(--offer-color, #e53935);
      }
      .offer-pill-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }

      /* label badge */
      .offer-label {
        display: inline-flex; align-items: center;
        font-size: 10px; font-weight: 800; border-radius: 999px;
        padding: 3px 8px; margin-bottom: 8px; letter-spacing: .3px;
      }
      .offer-label-hot     { background: #fff3e0; color: #e65100; }
      .offer-label-new     { background: #ede7f6; color: #5e35b1; }
      .offer-label-flash   { background: #fdeaea; color: #c62828; }
      .offer-label-limited { background: #fce4ec; color: #880e4f; }
      .offer-label-top     { background: #e8f5e9; color: #1b5e20; }

      /* emoji + big discount */
      .offer-pill-emoji { font-size: 28px; margin-bottom: 4px; line-height: 1; }
      .offer-discount-big {
        font-size: 32px; font-weight: 900;
        color: var(--offer-color, #e53935);
        line-height: 1; margin-bottom: 6px;
      }
      .offer-off { font-size: 14px; font-weight: 700; margin-left: 2px; vertical-align: middle; }

      /* title / sub */
      .offer-pill-title { font-size: 13px; font-weight: 800; color: #111; margin-bottom: 3px; line-height: 1.3; }
      .offer-pill-sub   { font-size: 11px; color: #888; margin-bottom: 10px; line-height: 1.4; }

      /* promo code row */
      .offer-code-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
      .offer-code-chip {
        flex: 1; background: #f5f5f5; border: 1.5px dashed #ccc;
        border-radius: 8px; padding: 4px 8px;
        font-size: 12px; font-weight: 800; color: #333; letter-spacing: .5px;
        text-align: center;
      }
      .offer-copy-btn {
        flex-shrink: 0; padding: 5px 10px; border-radius: 8px;
        background: var(--offer-color, #e53935); color: #fff;
        border: none; font-size: 11px; font-weight: 700; cursor: pointer;
        transition: opacity .15s;
      }
      .offer-copy-btn:active, .offer-copy-btn.offer-copied { opacity: .75; }
      .offer-copy-btn.offer-copied { background: #2e7d32; }

      /* expires */
      .offer-expires { font-size: 10px; color: #aaa; }

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
  copiedCode = '';

  constructor(
    private languageService: LanguageService,
    offersService: OffersService,
    private integrationHealthService: IntegrationHealthService,
    private authService: AuthService
  ) {
    this.offers$ = offersService.feed$.pipe(map((feed) => feed.offers));  // show all offers
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

  copyCode(code: string): void {
    navigator.clipboard?.writeText(code).catch(() => {});
    this.copiedCode = code;
    setTimeout(() => { this.copiedCode = ''; }, 2000);
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
