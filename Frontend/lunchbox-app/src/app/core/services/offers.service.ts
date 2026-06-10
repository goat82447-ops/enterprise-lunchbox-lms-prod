import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { DynamicNewsItem, DynamicOffer, DynamicOfferFeed } from '../models/delivery.models';

@Injectable({ providedIn: 'root' })
export class OffersService {
  private readonly feedSubject = new BehaviorSubject<DynamicOfferFeed>({
    updatedAt: new Date().toISOString(),
    offers: [],
    news: []
  });
  readonly feed$: Observable<DynamicOfferFeed> = this.feedSubject.asObservable();

  private readonly baseOffers: Omit<DynamicOffer, 'discountPercent' | 'expiresAt'>[] = [
    {
      id: 'offer-first-ride',
      title: 'First Ride Free!',
      subtitle: 'New users get first ride at ₹0. Limited daily slots.',
      promoCode: 'FIRST100',
      badge: '100% OFF',
      labelType: 'new',
      emoji: '🎉',
      color: '#6c3de0'
    },
    {
      id: 'offer-mega-flash',
      title: 'Mega Flash Deal',
      subtitle: 'Flash riders unlocked every few minutes. Grab now!',
      promoCode: 'RIDER50',
      badge: 'FLASH 50%',
      labelType: 'flash',
      emoji: '⚡',
      color: '#e53935'
    },
    {
      id: 'offer-fast-food',
      title: 'Quick Food Delivery',
      subtitle: 'Priority kitchens delivered under 25 minutes.',
      promoCode: 'FAST25',
      badge: 'HOT DEAL',
      labelType: 'hot',
      emoji: '🍔',
      color: '#ef6c00'
    },
    {
      id: 'offer-parcel',
      title: 'Parcel Week Saver',
      subtitle: 'City-wide parcel drops with real-time tracking.',
      promoCode: 'PARCELPLUS',
      badge: 'TOP PICK',
      labelType: 'top',
      emoji: '📦',
      color: '#00897b'
    },
    {
      id: 'offer-grocery',
      title: 'Grocery Rush',
      subtitle: 'Skip surge windows with smart slots.',
      promoCode: 'FRESHNOW',
      badge: 'HOT',
      labelType: 'hot',
      emoji: '🛒',
      color: '#43a047'
    },
    {
      id: 'offer-medicine',
      title: 'Night Medicine Route',
      subtitle: 'Late-hour verified medicine delivery.',
      promoCode: 'CARE10',
      badge: 'CARE',
      labelType: 'limited',
      emoji: '💊',
      color: '#1e88e5'
    },
    {
      id: 'offer-women-safety',
      title: 'Women Safety Ride',
      subtitle: 'Top-trusted captains. Extra discount this week.',
      promoCode: 'SAFENOW',
      badge: 'NEW',
      labelType: 'new',
      emoji: '🛡️',
      color: '#8e24aa'
    },
    {
      id: 'offer-weekend',
      title: 'Weekend Special',
      subtitle: 'Extra savings on all rides Sat & Sun.',
      promoCode: 'WKND20',
      badge: 'LIMITED',
      labelType: 'limited',
      emoji: '🎯',
      color: '#d81b60'
    }
  ];

  private readonly baseNews: Omit<DynamicNewsItem, 'publishedAt'>[] = [
    {
      id: 'news-50-off-live',
      title: 'Users can now avail LIVE 50% OFF in app',
      summary: 'Flash riders are unlocked every few minutes. Watch the home feed and apply code RIDER50 quickly.',
      tag: 'service'
    },
    {
      id: 'news-sos-upgrade',
      title: 'SOS workflow upgraded for faster dispatch',
      summary: 'Emergency alerts now notify support desk and nearby captains in parallel.',
      tag: 'safety'
    },
    {
      id: 'news-captain-rating',
      title: 'Captain profile now shows cumulative feedback analytics',
      summary: 'Average rating, hearts, and latest customer comments are now synced via backend APIs.',
      tag: 'feature'
    },
    {
      id: 'news-offer-refresh',
      title: 'Offer engine refreshes promotions automatically',
      summary: 'Discount cards now rotate through active campaigns to highlight latest savings.',
      tag: 'service'
    },
    {
      id: 'news-green-delivery',
      title: 'New green-route option for low-emission delivery',
      summary: 'Customers can prefer electric or low-emission vehicle captains when available.',
      tag: 'delivery'
    }
  ];

  constructor() {
    this.feedSubject.next(this.buildFeed());
    interval(10000).subscribe(() => {
      this.feedSubject.next(this.buildFeed());
    });
  }

  private buildFeed(): DynamicOfferFeed {
    const now = Date.now();
    const minuteBucket = Math.floor(now / 60000);
    const slotBucket = Math.floor(now / 10000);
    const dayOfMonth = new Date(now).getUTCDate();

    const offers = this.rotate(this.baseOffers, slotBucket % this.baseOffers.length).map((offer, index) => {
      const dynamicBoost = (dayOfMonth + minuteBucket + index) % 4;
      const isFlashOffer = offer.id === 'offer-mega-flash';
      const isFirstRide = offer.id === 'offer-first-ride';
      const discountPercent = isFirstRide ? 100 : isFlashOffer ? 50 : 12 + dynamicBoost * 4 + index;
      const expiresAt = new Date(now + (index + 6) * 60 * 60 * 1000).toISOString();
      return {
        ...offer,
        discountPercent,
        expiresAt
      } satisfies DynamicOffer;
    });

    const news = this.rotate(this.baseNews, (slotBucket + 1) % this.baseNews.length).map((item, index) => {
      const publishedAt = new Date(now - index * 75 * 60 * 1000).toISOString();
      return {
        ...item,
        publishedAt
      } satisfies DynamicNewsItem;
    });

    return {
      updatedAt: new Date(now).toISOString(),
      offers,
      news
    };
  }

  private rotate<T>(items: T[], startIndex: number): T[] {
    return [...items.slice(startIndex), ...items.slice(0, startIndex)];
  }
}
