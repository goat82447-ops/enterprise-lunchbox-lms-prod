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
      id: 'offer-night-ride',
      title: '🌙 Hot Night Ride Deal',
      subtitle: 'Book any ride between 9 PM – 6 AM and get 20% off instantly',
      promoCode: 'NIGHT20',
      badge: '🔥 Hot'
    },
    {
      id: 'offer-first-ride',
      title: '🎉 First Ride Free Discount',
      subtitle: 'New users get ₹100 off on their very first booking',
      promoCode: 'FIRST100',
      badge: '🆕 New User'
    },
    {
      id: 'offer-weekend',
      title: '🎊 Weekend Bonanza',
      subtitle: 'Every Saturday & Sunday — flat 25% off on all rides and deliveries',
      promoCode: 'WEEKEND25',
      badge: '🎊 Weekend'
    },
    {
      id: 'offer-mega-flash',
      title: '⚡ Mega Flash Deal',
      subtitle: 'Limited slots with instant captain assignment — grab before it expires!',
      promoCode: 'RIDER50',
      badge: '⚡ Live 50%'
    },
    {
      id: 'offer-medicine',
      title: '💊 Medicine Express',
      subtitle: 'Urgent medicine delivery any time — 10% off on all medicine orders',
      promoCode: 'CARE10',
      badge: '🏥 Health'
    },
    {
      id: 'offer-parcel',
      title: '📦 Parcel Saver',
      subtitle: 'Send parcels across the city with real-time captain tracking',
      promoCode: 'PARCELPLUS',
      badge: '📦 Delivery'
    },
    {
      id: 'offer-grocery',
      title: '🛒 Grocery Rush',
      subtitle: 'Fresh groceries delivered in 30 min — save on every order',
      promoCode: 'FRESHNOW',
      badge: '🛒 Hot'
    },
    {
      id: 'offer-refer',
      title: '👥 Refer & Earn',
      subtitle: 'Refer a friend — both of you get ₹50 off on next ride',
      promoCode: 'REFER50',
      badge: '👥 Referral'
    },
    {
      id: 'offer-rain',
      title: '🌧️ Rainy Day Rescue',
      subtitle: 'Raining outside? Get flat ₹30 off — we\'ll get you there safe',
      promoCode: 'RAIN30',
      badge: '🌧️ Today'
    },
    {
      id: 'offer-fast-food',
      title: '🍱 Flash Food Delivery',
      subtitle: 'Priority kitchens in under 25 minutes — order now!',
      promoCode: 'FAST25',
      badge: '⏱️ Limited'
    }
  ];

  private readonly baseNews: Omit<DynamicNewsItem, 'publishedAt'>[] = [
    {
      id: 'news-night-offer',
      title: '🌙 Night Ride offer is LIVE — 20% off after 9 PM',
      summary: 'Book any ride tonight between 9 PM and 6 AM and save 20% instantly with code NIGHT20.',
      tag: 'offer'
    },
    {
      id: 'news-50-off-live',
      title: '⚡ Flash 50% OFF is live right now!',
      summary: 'Flash riders are unlocked every few minutes. Apply code RIDER50 quickly before it expires.',
      tag: 'service'
    },
    {
      id: 'news-weekend-deal',
      title: '🎊 Weekend Bonanza — 25% off all weekend',
      summary: 'Use code WEEKEND25 every Saturday and Sunday on rides and deliveries. No minimum order.',
      tag: 'offer'
    },
    {
      id: 'news-sos-upgrade',
      title: '🆘 SOS workflow upgraded for faster dispatch',
      summary: 'Emergency alerts now notify support desk and nearby captains in parallel for faster response.',
      tag: 'safety'
    },
    {
      id: 'news-captain-rating',
      title: '⭐ Captain profiles now show live feedback analytics',
      summary: 'Average rating, hearts, and latest customer comments are now synced in real time.',
      tag: 'feature'
    },
    {
      id: 'news-refer',
      title: '👥 New Refer & Earn — give ₹50, get ₹50',
      summary: 'Share your referral code with friends. Both of you save ₹50 on the next ride. Code: REFER50',
      tag: 'feature'
    },
    {
      id: 'news-green-delivery',
      title: '🌱 Green-route option for eco-friendly delivery',
      summary: 'Customers can now prefer electric or low-emission vehicle captains when available.',
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
    const hour = new Date(now).getHours();
    const minuteBucket = Math.floor(now / 60000);
    const slotBucket = Math.floor(now / 10000);
    const dayOfMonth = new Date(now).getUTCDate();
    const dayOfWeek = new Date(now).getDay(); // 0=Sun, 6=Sat

    const offers = this.rotate(this.baseOffers, slotBucket % this.baseOffers.length).map((offer, index) => {
      const dynamicBoost = (dayOfMonth + minuteBucket + index) % 4;
      let discountPercent: number;

      if (offer.id === 'offer-mega-flash') {
        discountPercent = 50;
      } else if (offer.id === 'offer-night-ride') {
        // Night offer always shows 20%, glows between 9PM-6AM
        discountPercent = 20;
      } else if (offer.id === 'offer-weekend') {
        discountPercent = 25;
      } else if (offer.id === 'offer-first-ride') {
        discountPercent = 100; // ₹100 flat shown as 100
      } else if (offer.id === 'offer-refer') {
        discountPercent = 50;
      } else if (offer.id === 'offer-rain') {
        discountPercent = 30;
      } else {
        discountPercent = 10 + dynamicBoost * 3 + index;
      }

      // Shorter expiry for night/flash offers to create urgency
      const hoursLeft = offer.id === 'offer-mega-flash' ? 1
        : offer.id === 'offer-night-ride' ? (hour >= 21 ? 9 - (hour - 21) : hour < 6 ? 6 - hour : 12)
        : (index + 4);
      const expiresAt = new Date(now + hoursLeft * 60 * 60 * 1000).toISOString();

      return { ...offer, discountPercent, expiresAt } satisfies DynamicOffer;
    });

    const news = this.rotate(this.baseNews, (slotBucket + 1) % this.baseNews.length).map((item, index) => {
      const publishedAt = new Date(now - index * 45 * 60 * 1000).toISOString();
      return { ...item, publishedAt } satisfies DynamicNewsItem;
    });

    return { updatedAt: new Date(now).toISOString(), offers, news };
  }

  private rotate<T>(items: T[], startIndex: number): T[] {
    return [...items.slice(startIndex), ...items.slice(0, startIndex)];
  }
}
