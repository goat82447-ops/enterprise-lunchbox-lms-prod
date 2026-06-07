import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type NearbyHotelCategory = 'veg' | 'nonveg';

export interface NearbyHotelApiItem {
  id: string;
  name: string;
  category: NearbyHotelCategory;
  locationLabel: string;
  distanceKm: number;
  etaMinutes: number;
  rating: number;
  openNow: boolean;
  cuisine?: string;
  priceForTwo?: number;
  imageUrl?: string;
}

export interface NearbyHotelsResponse {
  source: string;
  updatedAt: string;
  hotels: NearbyHotelApiItem[];
}

export interface HotelMenuApiItem {
  id: string;
  name: string;
  category: NearbyHotelCategory;
  price: number;
  isTop: boolean;
  description?: string;
  imageUrl?: string;
}

export interface HotelMenuResponse {
  source: string;
  hotelId: string;
  updatedAt: string;
  items: HotelMenuApiItem[];
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly placesApi = `${environment.authApiBase}/api/places`;

  constructor(private http: HttpClient) {}

  getNearbyHotels(params: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    limit?: number;
    preference?: 'all' | NearbyHotelCategory;
  }): Observable<NearbyHotelsResponse> {
    let query = new HttpParams()
      .set('lat', String(params.lat))
      .set('lng', String(params.lng));

    if (params.radiusMeters !== undefined) {
      query = query.set('radiusMeters', String(params.radiusMeters));
    }

    if (params.limit !== undefined) {
      query = query.set('limit', String(params.limit));
    }

    if (params.preference) {
      query = query.set('preference', params.preference);
    }

    return this.http.get<NearbyHotelsResponse>(`${this.placesApi}/nearby-hotels`, { params: query });
  }

  getHotelMenu(params: {
    hotelId: string;
    preference?: 'all' | NearbyHotelCategory;
    limit?: number;
    topOnly?: boolean;
  }): Observable<HotelMenuResponse> {
    let query = new HttpParams();

    if (params.preference) {
      query = query.set('preference', params.preference);
    }

    if (params.limit !== undefined) {
      query = query.set('limit', String(params.limit));
    }

    if (params.topOnly !== undefined) {
      query = query.set('topOnly', params.topOnly ? '1' : '0');
    }

    return this.http.get<HotelMenuResponse>(`${environment.authApiBase}/api/menu/hotels/${encodeURIComponent(params.hotelId)}/items`, {
      params: query
    });
  }
}
