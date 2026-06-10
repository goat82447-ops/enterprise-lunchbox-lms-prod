import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface MenuItem {
  id: string;
  name: string;
  category: 'veg' | 'nonveg' | 'egg';
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  isTopPick?: boolean;
  customisable?: boolean;
  section: string;
}

interface CartItem { item: MenuItem; qty: number; }

interface RestaurantData {
  id: string; name: string; cuisine: string; rating: number; reviews: string;
  distKm: number; etaMin: number; offer: string; imageUrl: string;
  sections: string[];
}

const RESTAURANTS: Record<string, RestaurantData> = {
  h1: { id: 'h1', name: 'Spice Garden', cuisine: 'Biryani · North Indian', rating: 4.3, reviews: '2.1K+', distKm: 1.2, etaMin: 25, offer: '30% OFF up to ₹75 above ₹99', imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80', sections: ['🔥 Best Sellers', 'Biryani', 'Starters', 'Curries', 'Breads', 'Beverages'] },
  h2: { id: 'h2', name: 'Udipi House',  cuisine: 'South Indian · Dosa',    rating: 4.5, reviews: '3.4K+', distKm: 0.8, etaMin: 20, offer: 'Flat ₹50 OFF above ₹199',    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&q=80', sections: ['🔥 Best Sellers', 'Dosa', 'Idli & Vada', 'Rice Items', 'Beverages'] },
  h3: { id: 'h3', name: 'Royal Dhaba',  cuisine: 'Punjabi · North Indian',  rating: 4.2, reviews: '5.6K+', distKm: 2.1, etaMin: 30, offer: '60% OFF select items',        imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&q=80', sections: ['🔥 Best Sellers', 'Tandoor', 'Curries', 'Dal & Rice', 'Breads'] },
  h4: { id: 'h4', name: 'Green Bites',  cuisine: 'Pure Veg · Healthy',      rating: 4.0, reviews: '1.2K+', distKm: 1.5, etaMin: 28, offer: 'Buy 1 Get 1 FREE',           imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80', sections: ['🔥 Best Sellers', 'Salads', 'Sandwiches', 'Bowls', 'Juices'] },
  h5: { id: 'h5', name: 'Pizza Hub',    cuisine: 'Pizza · Italian · Pasta', rating: 4.1, reviews: '890+',  distKm: 3.2, etaMin: 35, offer: '50% OFF on first order',     imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', sections: ['🔥 Best Sellers', 'Pizzas', 'Pastas', 'Garlic Breads', 'Desserts'] },
};

const MENUS: Record<string, MenuItem[]> = {
  h1: [
    { id: 'i1',  name: 'Chicken Dum Biryani',    category: 'nonveg', section: '🔥 Best Sellers', price: 180, originalPrice: 280, description: 'Aromatic dum-cooked biryani with tender chicken pieces, raita included', imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80', isTopPick: true, customisable: true },
    { id: 'i2',  name: 'Mutton Biryani',          category: 'nonveg', section: '🔥 Best Sellers', price: 220, originalPrice: 320, description: 'Slow-cooked mutton biryani with caramelised onions and mint', imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80', isTopPick: true },
    { id: 'i3',  name: 'Veg Biryani',             category: 'veg',    section: '🔥 Best Sellers', price: 130, description: 'Mixed vegetable biryani with fragrant basmati rice', imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80' },
    { id: 'i4',  name: 'Chicken Biryani (Full)',   category: 'nonveg', section: 'Biryani',         price: 320, description: 'Full portion Hyderabadi chicken biryani, serves 2', imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80', customisable: true },
    { id: 'i5',  name: 'Chicken 65',               category: 'nonveg', section: 'Starters',        price: 160, description: 'Spicy deep-fried chicken, crispy outside tender inside', imageUrl: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400&q=80', isTopPick: true },
    { id: 'i6',  name: 'Paneer Tikka',             category: 'veg',    section: 'Starters',        price: 140, description: 'Grilled cottage cheese with bell peppers and spices', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80' },
    { id: 'i7',  name: 'Butter Chicken Curry',     category: 'nonveg', section: 'Curries',         price: 190, description: 'Creamy tomato-based chicken curry, best with naan', imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80', isTopPick: true },
    { id: 'i8',  name: 'Garlic Naan',              category: 'veg',    section: 'Breads',          price: 30, description: 'Freshly baked naan with garlic butter', imageUrl: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&q=80' },
    { id: 'i9',  name: 'Mango Lassi',              category: 'veg',    section: 'Beverages',       price: 60, description: 'Chilled mango yogurt drink', imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80' },
  ],
  h2: [
    { id: 'j1', name: 'Masala Dosa',         category: 'veg', section: '🔥 Best Sellers', price: 70,  description: 'Crispy dosa with spiced potato filling, sambar & 2 chutneys', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80', isTopPick: true },
    { id: 'j2', name: 'Plain Dosa',          category: 'veg', section: 'Dosa',            price: 45,  description: 'Classic crispy dosa with sambar and coconut chutney', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80' },
    { id: 'j3', name: 'Rava Dosa',           category: 'veg', section: 'Dosa',            price: 80,  description: 'Lacy, crispy semolina dosa', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80', isTopPick: true },
    { id: 'j4', name: 'Idli (4 pieces)',     category: 'veg', section: 'Idli & Vada',     price: 50,  description: 'Steamed rice cakes with sambar and chutneys', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80' },
    { id: 'j5', name: 'Medu Vada (2 pcs)',   category: 'veg', section: 'Idli & Vada',     price: 55,  description: 'Crispy lentil donuts with sambar', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80' },
    { id: 'j6', name: 'Puliyodarai',         category: 'veg', section: 'Rice Items',      price: 90,  description: 'Tamarind rice with peanuts and spices', imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80', isTopPick: true },
    { id: 'j7', name: 'Filter Coffee',       category: 'veg', section: 'Beverages',       price: 30,  description: 'Traditional South Indian filter coffee', imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80' },
  ],
};

// Fallback for all other restaurants
const defaultMenu = (id: string): MenuItem[] => [
  { id: `${id}_1`, name: 'Special Combo',    category: 'nonveg', section: '🔥 Best Sellers', price: 199, originalPrice: 299, description: 'Chef special combo with rice, curry and dessert', imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80', isTopPick: true, customisable: true },
  { id: `${id}_2`, name: 'Veg Delight',      category: 'veg',    section: '🔥 Best Sellers', price: 149, description: 'Fresh vegetables with rice or bread', imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80' },
  { id: `${id}_3`, name: 'Starter Platter',  category: 'nonveg', section: '🔥 Best Sellers', price: 179, description: 'Assorted starters for 2', imageUrl: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400&q=80', isTopPick: true },
  { id: `${id}_4`, name: 'Classic Main',     category: 'veg',    section: 'Main Course',     price: 160, description: 'House specialty main course', imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80' },
  { id: `${id}_5`, name: 'Signature Drink',  category: 'veg',    section: 'Beverages',       price: 60,  description: 'Refreshing house drink', imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80' },
];

@Component({
  selector: 'app-food-restaurant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="fr-page" *ngIf="restaurant">

  <!-- ── Header ── -->
  <div class="fr-header">
    <button class="fr-back" (click)="router.navigate(['/food'])">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <button class="fr-search-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Search
    </button>
  </div>

  <!-- ── Hero banner ── -->
  <div class="fr-hero">
    <img class="fr-hero-img" [src]="restaurant.imageUrl" [alt]="restaurant.name" />
    <div class="fr-hero-overlay">
      <div class="fr-hero-name">{{ restaurant.name }}</div>
      <div class="fr-hero-meta">{{ restaurant.cuisine }}</div>
      <div class="fr-hero-row">
        <div class="fr-hero-tag">⏱ {{ restaurant.etaMin }}-{{ restaurant.etaMin + 5 }} mins</div>
        <div class="fr-hero-tag">📍 {{ restaurant.distKm }} km</div>
        <div class="fr-hero-rating">★ {{ restaurant.rating }} ({{ restaurant.reviews }})</div>
      </div>
    </div>
  </div>

  <!-- ── Offer banner ── -->
  <div class="fr-offer-bar" *ngIf="restaurant.offer">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#e53935" stroke="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
    {{ restaurant.offer }}
  </div>

  <!-- ── Filter chips ── -->
  <div class="fr-pref-row">
    <button class="fr-pref" [class.fr-pref-active]="pref==='all'"    (click)="setPref('all')">All</button>
    <button class="fr-pref fr-pref-veg"    [class.fr-pref-active]="pref==='veg'"    (click)="setPref('veg')">🟢 Veg</button>
    <button class="fr-pref fr-pref-egg"    [class.fr-pref-active]="pref==='egg'"    (click)="setPref('egg')">🟡 Egg</button>
    <button class="fr-pref fr-pref-nonveg" [class.fr-pref-active]="pref==='nonveg'" (click)="setPref('nonveg')">🔺 Non-Veg</button>
  </div>

  <!-- ── Section nav ── -->
  <div class="fr-section-nav">
    <button *ngFor="let s of restaurant.sections" class="fr-sec-btn"
      [class.fr-sec-active]="activeSection === s"
      (click)="scrollToSection(s)">{{ s }}</button>
  </div>

  <!-- ── Menu ── -->
  <div class="fr-menu">
    <div *ngFor="let section of restaurant.sections">
      <div *ngIf="itemsForSection(section).length > 0">
        <div class="fr-section-title" [id]="'sec_' + section">{{ section }}</div>

        <div *ngFor="let item of itemsForSection(section)" class="fr-item-card">
          <div class="fr-item-left">
            <div class="fr-item-dot" [class.fr-dot-veg]="item.category==='veg'" [class.fr-dot-nonveg]="item.category==='nonveg'" [class.fr-dot-egg]="item.category==='egg'">
              <div class="fr-dot-inner"></div>
            </div>
            <div class="fr-item-name">
              {{ item.name }}
              <span *ngIf="item.isTopPick" class="fr-top-pick">🔥 Bestseller</span>
            </div>
            <div class="fr-item-desc">{{ item.description }}</div>
            <div class="fr-item-price-row">
              <span class="fr-item-price">₹{{ item.price }}</span>
              <span *ngIf="item.originalPrice" class="fr-item-orig">₹{{ item.originalPrice }}</span>
              <span *ngIf="item.originalPrice" class="fr-item-save">{{ getSavePct(item) }}% OFF</span>
            </div>
            <div *ngIf="item.customisable" class="fr-customisable">customisable</div>
          </div>
          <div class="fr-item-right">
            <img class="fr-item-img" [src]="item.imageUrl" [alt]="item.name" loading="lazy" />
            <div *ngIf="getQty(item.id) === 0" class="fr-add-btn" (click)="addItem(item)">
              ADD <span>+</span>
            </div>
            <div *ngIf="getQty(item.id) > 0" class="fr-qty-ctrl">
              <button (click)="removeItem(item)">−</button>
              <span>{{ getQty(item.id) }}</span>
              <button (click)="addItem(item)">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── View Cart sticky bar ── -->
  <div class="fr-cart-bar" *ngIf="cartCount > 0" (click)="goToCart()">
    <div class="fr-cart-count">{{ cartCount }} item{{ cartCount > 1 ? 's' : '' }}</div>
    <div class="fr-cart-label">View Cart →</div>
    <div class="fr-cart-total">₹{{ cartTotal }}</div>
  </div>

</div>
  `,
  styles: [`
    .fr-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 80px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    .fr-header { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,.95); backdrop-filter: blur(8px); }
    .fr-back { background: #f0f0f0; border: none; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .fr-search-btn { display: flex; align-items: center; gap: 6px; background: #f5f5f5; border: none; border-radius: 20px; padding: 8px 16px; font-size: 14px; color: #555; cursor: pointer; }

    .fr-hero { position: relative; height: 220px; }
    .fr-hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .fr-hero-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 40%, rgba(0,0,0,.75)); display: flex; flex-direction: column; justify-content: flex-end; padding: 16px; }
    .fr-hero-name { font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 3px; }
    .fr-hero-meta { font-size: 13px; color: rgba(255,255,255,.8); margin-bottom: 8px; }
    .fr-hero-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .fr-hero-tag { background: rgba(255,255,255,.2); border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #fff; }
    .fr-hero-rating { background: #2e7d32; border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #fff; }

    .fr-offer-bar { background: #fff9c4; border-bottom: 1px solid #f0e04a; padding: 10px 16px; font-size: 13px; font-weight: 600; color: #555; display: flex; align-items: center; gap: 6px; }

    .fr-pref-row { display: flex; gap: 8px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; overflow-x: auto; scrollbar-width: none; }
    .fr-pref-row::-webkit-scrollbar { display: none; }
    .fr-pref { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; border: 1.5px solid #e0e0e0; background: #fff; font-size: 13px; font-weight: 600; color: #555; cursor: pointer; }
    .fr-pref-active { border-color: #2e7d32; background: #e8f5e9; color: #2e7d32; }
    .fr-pref-veg.fr-pref-active { border-color: #2e7d32; }
    .fr-pref-nonveg.fr-pref-active { border-color: #e53935; background: #fdeaea; color: #e53935; }
    .fr-pref-egg.fr-pref-active { border-color: #f59e0b; background: #fffbeb; color: #b45309; }

    .fr-section-nav { display: flex; gap: 6px; overflow-x: auto; padding: 10px 16px; background: #fff; border-bottom: 2px solid #f0f0f0; scrollbar-width: none; }
    .fr-section-nav::-webkit-scrollbar { display: none; }
    .fr-sec-btn { flex-shrink: 0; padding: 6px 12px; border-radius: 8px; border: 1px solid #e0e0e0; background: #fafafa; font-size: 12px; font-weight: 600; color: #444; cursor: pointer; }
    .fr-sec-active { border-color: #e53935; background: #fdeaea; color: #e53935; }

    .fr-menu { padding: 0 0 20px; }
    .fr-section-title { font-size: 16px; font-weight: 800; color: #111; padding: 16px 16px 8px; background: #fff; border-bottom: 1px solid #f5f5f5; }

    .fr-item-card { display: flex; gap: 12px; padding: 14px 16px; background: #fff; border-bottom: 1px solid #f5f5f5; }
    .fr-item-left { flex: 1; }
    .fr-item-dot { width: 16px; height: 16px; border: 2px solid #aaa; border-radius: 3px; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; flex-shrink: 0; }
    .fr-dot-veg { border-color: #2e7d32; }
    .fr-dot-nonveg { border-color: #e53935; }
    .fr-dot-egg { border-color: #f59e0b; }
    .fr-dot-inner { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .fr-dot-veg .fr-dot-inner { background: #2e7d32; }
    .fr-dot-nonveg .fr-dot-inner { background: #e53935; }
    .fr-dot-egg .fr-dot-inner { background: #f59e0b; }
    .fr-item-name { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 4px; line-height: 1.3; }
    .fr-top-pick { display: inline-block; font-size: 10px; font-weight: 700; color: #e65100; background: #fff3e0; border-radius: 4px; padding: 1px 5px; margin-left: 4px; }
    .fr-item-desc { font-size: 12px; color: #999; line-height: 1.4; margin-bottom: 6px; }
    .fr-item-price-row { display: flex; align-items: center; gap: 6px; }
    .fr-item-price { font-size: 14px; font-weight: 800; color: #111; }
    .fr-item-orig { font-size: 12px; color: #bbb; text-decoration: line-through; }
    .fr-item-save { font-size: 11px; color: #e53935; font-weight: 700; }
    .fr-customisable { font-size: 11px; color: #999; margin-top: 3px; font-style: italic; }

    .fr-item-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .fr-item-img { width: 100px; height: 80px; object-fit: cover; border-radius: 10px; }
    .fr-add-btn {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      border: 2px solid #e53935; color: #e53935; background: #fff;
      border-radius: 8px; padding: 6px 18px; font-size: 14px; font-weight: 800;
      cursor: pointer; min-width: 80px; letter-spacing: .5px;
      transition: all .15s;
    }
    .fr-add-btn:active { background: #fdeaea; }
    .fr-qty-ctrl {
      display: flex; align-items: center; gap: 0;
      border: 2px solid #e53935; border-radius: 8px; overflow: hidden;
      min-width: 80px;
    }
    .fr-qty-ctrl button { background: #e53935; color: #fff; border: none; width: 28px; height: 32px; font-size: 18px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .fr-qty-ctrl span { flex: 1; text-align: center; font-size: 14px; font-weight: 800; color: #e53935; }

    /* Cart bar */
    .fr-cart-bar {
      position: fixed; bottom: 72px; left: 16px; right: 16px; z-index: 100;
      background: #e53935; border-radius: 16px; padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 6px 24px rgba(229,57,53,.4); cursor: pointer;
      animation: slideUp .22s ease;
    }
    @keyframes slideUp { from { transform: translateY(20px); opacity: .6; } to { transform: translateY(0); opacity: 1; } }
    .fr-cart-count { background: rgba(255,255,255,.25); color: #fff; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .fr-cart-label { color: #fff; font-size: 15px; font-weight: 800; }
    .fr-cart-total { color: #fff; font-size: 15px; font-weight: 800; }
  `]
})
export class FoodRestaurantComponent implements OnInit {
  restaurant: RestaurantData | null = null;
  menuItems: MenuItem[] = [];
  cart: CartItem[] = [];
  pref: 'all' | 'veg' | 'egg' | 'nonveg' = 'all';
  activeSection = '';

  get cartCount(): number { return this.cart.reduce((s, c) => s + c.qty, 0); }
  get cartTotal(): number { return this.cart.reduce((s, c) => s + c.qty * c.item.price, 0); }

  constructor(public router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      const id = p.get('id') || 'h1';
      this.restaurant = RESTAURANTS[id] || RESTAURANTS['h1'];
      this.menuItems = MENUS[id] || defaultMenu(id);
      this.activeSection = this.restaurant.sections[0];
    });
  }

  setPref(p: 'all' | 'veg' | 'egg' | 'nonveg'): void { this.pref = p; }

  itemsForSection(section: string): MenuItem[] {
    return this.menuItems.filter(i => {
      if (i.section !== section) return false;
      if (this.pref === 'all') return true;
      return i.category === this.pref;
    });
  }

  getSavePct(item: MenuItem): number {
    if (!item.originalPrice) return 0;
    return Math.round((1 - item.price / item.originalPrice) * 100);
  }

  getQty(id: string): number {
    return this.cart.find(c => c.item.id === id)?.qty ?? 0;
  }

  addItem(item: MenuItem): void {
    const existing = this.cart.find(c => c.item.id === item.id);
    if (existing) existing.qty++;
    else this.cart.push({ item, qty: 1 });
    this.cart = [...this.cart];
  }

  removeItem(item: MenuItem): void {
    const idx = this.cart.findIndex(c => c.item.id === item.id);
    if (idx === -1) return;
    this.cart[idx].qty--;
    if (this.cart[idx].qty === 0) this.cart.splice(idx, 1);
    this.cart = [...this.cart];
  }

  scrollToSection(s: string): void {
    this.activeSection = s;
    const el = document.getElementById('sec_' + s);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToCart(): void {
    // Pass cart via state
    this.router.navigate(['/food/cart'], { state: { cart: this.cart, restaurant: this.restaurant } });
  }
}
