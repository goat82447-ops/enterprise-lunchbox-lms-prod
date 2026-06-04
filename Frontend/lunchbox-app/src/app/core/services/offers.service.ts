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
      id: 'offer-mega-flash',
      title: 'Mega Rider Flash Deal',
      subtitle: 'Limited realtime drop slots with instant captain assignment',
      promoCode: 'RIDER50',
      badge: 'Live 50%'
    },
    {
      id: 'offer-fast-food',
      title: 'Flash Food Delivery',
      subtitle: 'Priority partner kitchens in under 25 minutes',
      promoCode: 'FAST25',
      badge: 'Limited Time'
    },
    {
      id: 'offer-parcel',
      title: 'Parcel Week Saver',
      subtitle: 'City-wide parcel drops with real-time captain tracking',
      promoCode: 'PARCELPLUS',
      badge: 'Top Pick'
    },
    {
      id: 'offer-grocery',
      title: 'Smart Grocery Window',
      subtitle: 'Book preferred slots and skip surge windows',
      promoCode: 'FRESHNOW',
      badge: 'Hot'
    },
    {
      id: 'offer-medicine',
      title: 'Medicine Night Route',
      subtitle: 'Late-hour medicine deliveries with captain verification',
      promoCode: 'CARE10',
      badge: 'Safety'
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
      const discountPercent = isFlashOffer ? 50 : 12 + dynamicBoost * 4 + index;
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
