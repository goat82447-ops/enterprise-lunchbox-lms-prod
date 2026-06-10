import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: string;
  distKm: number;
  etaMin: number;
  offer: string;
  offerColor: string;
  tag?: string;
  tagColor?: string;
  imageUrl: string;
  featured?: boolean;
  openNow: boolean;
}

interface Deal {
  id: string;
  name: string;
  restaurantName: string;
  originalPrice: number;
  dealPrice: number;
  discount: string;
  imageUrl: string;
}

@Component({
  selector: 'app-food-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="fh-page">

  <!-- ── Header ── -->
  <div class="fh-header">
    <div class="fh-location-row">
      <button class="fh-back" (click)="router.navigate(['/home'])">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="fh-loc">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#e53935" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <span class="fh-loc-text">{{ userLocation }}</span>
      </div>
    </div>
    <!-- Search bar -->
    <div class="fh-searchbar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input class="fh-search-input" [(ngModel)]="searchQuery"
        (ngModelChange)="onSearch($event)"
        placeholder='Search "biryani", "pizza"…' />
      <button *ngIf="searchQuery" class="fh-search-clear" (click)="searchQuery=''; filteredRestaurants=restaurants">✕</button>
    </div>
  </div>

  <!-- ── Category chips ── -->
  <div class="fh-categories">
    <button *ngFor="let c of categories" class="fh-cat-chip"
      [class.fh-cat-active]="activeCategory === c.id"
      (click)="selectCategory(c.id)">
      <span class="fh-cat-emoji">{{ c.emoji }}</span>
      <span>{{ c.label }}</span>
    </button>
  </div>

  <!-- ── Filter chips ── -->
  <div class="fh-filters">
    <button class="fh-filter-chip" [class.fh-filter-active]="activeFilter==='under200'" (click)="setFilter('under200')">Under ₹200</button>
    <button class="fh-filter-chip" [class.fh-filter-active]="activeFilter==='under500'" (click)="setFilter('under500')">Under ₹500</button>
    <button class="fh-filter-chip" [class.fh-filter-active]="activeFilter==='fast'"    (click)="setFilter('fast')">⚡ Fast Delivery</button>
    <button class="fh-filter-chip" [class.fh-filter-active]="activeFilter==='rated'"   (click)="setFilter('rated')">⭐ 4.0+</button>
    <button class="fh-filter-chip" [class.fh-filter-active]="activeFilter==='veg'"     (click)="setFilter('veg')">🟢 Veg Only</button>
  </div>

  <!-- ── Flash Deal Banner ── -->
  <div class="fh-flash-banner">
    <div class="fh-flash-left">
      <div class="fh-flash-label">⚡ FLASH DEALS</div>
      <div class="fh-flash-title">Meals Under ₹199</div>
      <div class="fh-flash-sub">Limited time · Grab before it's gone!</div>
    </div>
    <div class="fh-flash-right">🍱</div>
  </div>

  <!-- ── Deals section ── -->
  <div class="fh-section">
    <div class="fh-section-header">
      <span class="fh-section-title">🔥 Recommended Deals</span>
      <button class="fh-see-all" (click)="activeFilter='under500'; applyFilters()">See all</button>
    </div>
    <div class="fh-deals-scroll">
      <div class="fh-deal-card" *ngFor="let deal of deals" (click)="openRestaurant(deal.id)">
        <div class="fh-deal-img-wrap">
          <img class="fh-deal-img" [src]="deal.imageUrl" [alt]="deal.name" />
          <div class="fh-deal-badge">{{ deal.discount }}</div>
        </div>
        <div class="fh-deal-name">{{ deal.name }}</div>
        <div class="fh-deal-rest">{{ deal.restaurantName }}</div>
        <div class="fh-deal-price">
          <span class="fh-deal-now">₹{{ deal.dealPrice }}</span>
          <span class="fh-deal-orig">₹{{ deal.originalPrice }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Restaurant count ── -->
  <div class="fh-count-row">
    <span class="fh-count">{{ filteredRestaurants.length }} restaurants delivering to you</span>
  </div>

  <!-- ── Restaurant list ── -->
  <div class="fh-section">
    <div class="fh-section-header">
      <span class="fh-section-title">🏪 All Restaurants</span>
    </div>

    <!-- Featured (big card) -->
    <div *ngFor="let r of filteredRestaurants" class="fh-rest-card" (click)="openRestaurant(r.id)">
      <div class="fh-rest-img-wrap">
        <img class="fh-rest-img" [src]="r.imageUrl" [alt]="r.name" loading="lazy" />
        <div *ngIf="r.offer" class="fh-rest-offer">{{ r.offer }}</div>
        <div *ngIf="!r.openNow" class="fh-rest-closed">Closed</div>
      </div>
      <div class="fh-rest-body">
        <div class="fh-rest-top">
          <span class="fh-rest-name">{{ r.name }}</span>
          <div class="fh-rest-rating">
            <span class="fh-star">★</span>
            <span>{{ r.rating }}</span>
            <span class="fh-reviews">({{ r.reviews }})</span>
          </div>
        </div>
        <div class="fh-rest-meta">{{ r.cuisine }}</div>
        <div class="fh-rest-info">
          <span>🕐 {{ r.etaMin }}-{{ r.etaMin + 5 }} mins</span>
          <span class="fh-dot">·</span>
          <span>{{ r.distKm }} km</span>
          <span *ngIf="r.tag" class="fh-rest-tag" [style.background]="r.tagColor + '18'" [style.color]="r.tagColor">{{ r.tag }}</span>
        </div>
      </div>
    </div>

    <div *ngIf="filteredRestaurants.length === 0" class="fh-empty">
      <div style="font-size:48px;margin-bottom:10px">🍽️</div>
      <div style="font-weight:700;color:#333">No restaurants found</div>
      <div style="color:#999;font-size:13px;margin-top:4px">Try a different filter or search</div>
    </div>
  </div>

</div>
  `,
  styles: [`
    .fh-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 80px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* Header */
    .fh-header { background: #fff; padding: 12px 16px 10px; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 8px rgba(0,0,0,.06); }
    .fh-location-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .fh-back { background: none; border: none; cursor: pointer; padding: 4px; color: #333; display: flex; align-items: center; }
    .fh-loc { display: flex; align-items: center; gap: 5px; }
    .fh-loc-text { font-size: 14px; font-weight: 700; color: #111; }
    .fh-searchbar {
      display: flex; align-items: center; gap: 10px;
      background: #f5f5f5; border-radius: 12px; padding: 10px 14px;
      border: 1.5px solid #eee;
    }
    .fh-search-input { flex: 1; border: none; background: none; font-size: 14px; outline: none; color: #333; }
    .fh-search-clear { background: none; border: none; color: #aaa; cursor: pointer; font-size: 14px; }

    /* Categories */
    .fh-categories {
      display: flex; gap: 10px; overflow-x: auto; padding: 12px 16px 4px;
      background: #fff; scrollbar-width: none;
    }
    .fh-categories::-webkit-scrollbar { display: none; }
    .fh-cat-chip {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      min-width: 60px; padding: 8px 6px; border-radius: 14px;
      border: 1.5px solid #f0f0f0; background: #fafafa; cursor: pointer;
      transition: all .15s; flex-shrink: 0;
    }
    .fh-cat-active { border-color: #e53935; background: #fff5f5; }
    .fh-cat-emoji { font-size: 24px; }
    .fh-cat-chip span:last-child { font-size: 11px; font-weight: 600; color: #444; }

    /* Filters */
    .fh-filters {
      display: flex; gap: 8px; overflow-x: auto; padding: 10px 16px;
      background: #fff; border-bottom: 1px solid #f0f0f0; scrollbar-width: none;
    }
    .fh-filters::-webkit-scrollbar { display: none; }
    .fh-filter-chip {
      flex-shrink: 0; padding: 7px 14px; border-radius: 20px;
      border: 1.5px solid #e0e0e0; background: #fff;
      font-size: 13px; font-weight: 600; color: #444; cursor: pointer; white-space: nowrap;
      transition: all .15s;
    }
    .fh-filter-active { border-color: #e53935; background: #fdeaea; color: #e53935; }

    /* Flash Banner */
    .fh-flash-banner {
      margin: 14px 16px 0;
      background: linear-gradient(135deg, #e53935, #c62828);
      border-radius: 16px; padding: 16px 20px;
      display: flex; align-items: center; justify-content: space-between;
      color: #fff;
    }
    .fh-flash-label { font-size: 11px; font-weight: 800; opacity: .8; letter-spacing: .5px; margin-bottom: 4px; }
    .fh-flash-title { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
    .fh-flash-sub { font-size: 12px; opacity: .85; }
    .fh-flash-right { font-size: 48px; }

    /* Section */
    .fh-section { padding: 16px 16px 0; }
    .fh-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .fh-section-title { font-size: 16px; font-weight: 800; color: #111; }
    .fh-see-all { background: none; border: none; color: #e53935; font-size: 13px; font-weight: 700; cursor: pointer; }

    /* Deal cards scroll */
    .fh-deals-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
    .fh-deals-scroll::-webkit-scrollbar { display: none; }
    .fh-deal-card {
      flex-shrink: 0; width: 150px; cursor: pointer;
      background: #fff; border-radius: 14px; overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,.07);
      transition: transform .15s;
    }
    .fh-deal-card:active { transform: scale(.97); }
    .fh-deal-img-wrap { position: relative; }
    .fh-deal-img { width: 100%; height: 100px; object-fit: cover; display: block; }
    .fh-deal-badge {
      position: absolute; top: 8px; left: 8px;
      background: #e53935; color: #fff; font-size: 10px; font-weight: 800;
      padding: 3px 7px; border-radius: 6px;
    }
    .fh-deal-name { font-size: 12px; font-weight: 700; color: #111; padding: 8px 8px 2px; line-height: 1.3; }
    .fh-deal-rest { font-size: 10px; color: #999; padding: 0 8px 6px; }
    .fh-deal-price { display: flex; align-items: center; gap: 6px; padding: 0 8px 10px; }
    .fh-deal-now { font-size: 13px; font-weight: 800; color: #e53935; }
    .fh-deal-orig { font-size: 11px; color: #bbb; text-decoration: line-through; }

    /* Count */
    .fh-count-row { padding: 14px 16px 4px; }
    .fh-count { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .5px; }

    /* Restaurant cards */
    .fh-rest-card {
      background: #fff; border-radius: 16px; overflow: hidden;
      margin-bottom: 14px; cursor: pointer;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
      transition: transform .15s;
    }
    .fh-rest-card:active { transform: scale(.99); }
    .fh-rest-img-wrap { position: relative; }
    .fh-rest-img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .fh-rest-offer {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,.7));
      color: #fff; font-size: 12px; font-weight: 700;
      padding: 20px 12px 8px;
    }
    .fh-rest-closed {
      position: absolute; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 16px; font-weight: 800;
    }
    .fh-rest-body { padding: 12px 14px 14px; }
    .fh-rest-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
    .fh-rest-name { font-size: 16px; font-weight: 800; color: #111; }
    .fh-rest-rating {
      display: flex; align-items: center; gap: 3px;
      background: #2e7d32; color: #fff; font-size: 12px; font-weight: 700;
      padding: 3px 8px; border-radius: 6px;
    }
    .fh-star { color: #fff; }
    .fh-reviews { font-size: 10px; opacity: .8; }
    .fh-rest-meta { font-size: 13px; color: #888; margin-bottom: 6px; }
    .fh-rest-info { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; flex-wrap: wrap; }
    .fh-dot { color: #ccc; }
    .fh-rest-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }

    .fh-empty { text-align: center; padding: 40px 20px; }
  `]
})
export class FoodHomeComponent implements OnInit {
  searchQuery = '';
  activeCategory = 'all';
  activeFilter = '';
  userLocation = 'Hyderabad, Telangana';

  categories = [
    { id: 'all',     emoji: '🍽️', label: 'All'      },
    { id: 'biryani', emoji: '🍛',  label: 'Biryani'  },
    { id: 'chicken', emoji: '🍗',  label: 'Chicken'  },
    { id: 'rice',    emoji: '🍚',  label: 'Rice'     },
    { id: 'pizza',   emoji: '🍕',  label: 'Pizza'    },
    { id: 'burger',  emoji: '🍔',  label: 'Burger'   },
    { id: 'south',   emoji: '🥞',  label: 'South'    },
    { id: 'chinese', emoji: '🍜',  label: 'Chinese'  },
    { id: 'dessert', emoji: '🍰',  label: 'Dessert'  },
  ];

  deals: Deal[] = [
    { id: 'h1', name: 'Chicken Biryani', restaurantName: 'Spice Garden', originalPrice: 220, dealPrice: 149, discount: '32% OFF', imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=80' },
    { id: 'h2', name: 'Masala Dosa', restaurantName: 'Udipi House', originalPrice: 80, dealPrice: 49, discount: '39% OFF', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&q=80' },
    { id: 'h3', name: 'Butter Chicken', restaurantName: 'Royal Dhaba', originalPrice: 280, dealPrice: 199, discount: '29% OFF', imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300&q=80' },
    { id: 'h4', name: 'Veg Thali', restaurantName: 'Green Bites', originalPrice: 150, dealPrice: 89, discount: '41% OFF', imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&q=80' },
    { id: 'h5', name: 'Margherita Pizza', restaurantName: 'Pizza Hub', originalPrice: 320, dealPrice: 199, discount: '38% OFF', imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80' },
  ];

  restaurants: Restaurant[] = [
    { id: 'h1', name: 'Spice Garden', cuisine: 'Biryani · North Indian · Chicken', rating: 4.3, reviews: '2.1K+', distKm: 1.2, etaMin: 25, offer: '🏷️ 30% OFF up to ₹75 above ₹99', offerColor: '#e53935', tag: '⚡ Near & Fast', tagColor: '#2e7d32', imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80', openNow: true },
    { id: 'h2', name: 'Udipi House', cuisine: 'South Indian · Dosa · Idli', rating: 4.5, reviews: '3.4K+', distKm: 0.8, etaMin: 20, offer: '🏷️ Flat ₹50 OFF above ₹199', offerColor: '#1e88e5', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80', openNow: true },
    { id: 'h3', name: 'Royal Dhaba', cuisine: 'Punjabi · North Indian · Tandoor', rating: 4.2, reviews: '5.6K+', distKm: 2.1, etaMin: 30, offer: '🏷️ 60% OFF select items', offerColor: '#e53935', imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&q=80', openNow: true },
    { id: 'h4', name: 'Green Bites', cuisine: 'Pure Veg · Healthy · Salads', rating: 4.0, reviews: '1.2K+', distKm: 1.5, etaMin: 28, offer: '🏷️ Buy 1 Get 1 FREE', offerColor: '#2e7d32', imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80', openNow: true },
    { id: 'h5', name: 'Pizza Hub', cuisine: 'Pizza · Italian · Pasta', rating: 4.1, reviews: '890+', distKm: 3.2, etaMin: 35, offer: '🏷️ 50% OFF on first order', offerColor: '#e53935', imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80', openNow: true },
    { id: 'h6', name: 'Burger Nation', cuisine: 'Burgers · Sandwiches · Wraps', rating: 3.9, reviews: '670+', distKm: 2.8, etaMin: 32, offer: '🏷️ 20% OFF above ₹299', offerColor: '#ff6f00', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', openNow: true },
    { id: 'h7', name: 'Dragon Palace', cuisine: 'Chinese · Noodles · Fried Rice', rating: 4.2, reviews: '1.8K+', distKm: 1.9, etaMin: 27, offer: '🏷️ Free Delivery', offerColor: '#c62828', imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80', openNow: false },
    { id: 'h8', name: 'Sweet Dreams', cuisine: 'Desserts · Ice Cream · Cakes', rating: 4.6, reviews: '4.1K+', distKm: 0.6, etaMin: 18, offer: '🏷️ 40% OFF combos', offerColor: '#8e24aa', imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80', openNow: true },
  ];

  filteredRestaurants: Restaurant[] = [];

  constructor(public router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (user?.displayName) this.userLocation = 'Hyderabad, Telangana';
    this.filteredRestaurants = [...this.restaurants];
  }

  selectCategory(id: string): void {
    this.activeCategory = id;
    this.applyFilters();
  }

  setFilter(f: string): void {
    this.activeFilter = this.activeFilter === f ? '' : f;
    this.applyFilters();
  }

  onSearch(q: string): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.restaurants];
    const q = this.searchQuery.toLowerCase();
    if (q) list = list.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q));
    if (this.activeCategory !== 'all') {
      const catMap: Record<string, string[]> = {
        biryani: ['biryani'], chicken: ['chicken'], rice: ['rice','biryani'],
        pizza: ['pizza','italian'], burger: ['burger'], south: ['south'],
        chinese: ['chinese','noodle'], dessert: ['dessert','cake','ice'],
      };
      const terms = catMap[this.activeCategory] || [];
      list = list.filter(r => terms.some(t => r.cuisine.toLowerCase().includes(t)));
    }
    if (this.activeFilter === 'fast')    list = list.filter(r => r.etaMin <= 25);
    if (this.activeFilter === 'rated')   list = list.filter(r => r.rating >= 4.0);
    if (this.activeFilter === 'veg')     list = list.filter(r => r.cuisine.toLowerCase().includes('veg'));
    this.filteredRestaurants = list;
  }

  openRestaurant(id: string): void {
    this.router.navigate(['/food/restaurant', id]);
  }
}
