import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LiveFareRequest, LiveFareResponse } from '../models/delivery.models';

@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly pricingApi = 'https://lunchbox-auth-service.onrender.com/api/pricing';

  constructor(private http: HttpClient) {}

  getLiveFare(request: LiveFareRequest): Observable<LiveFareResponse> {
    return this.http.post<LiveFareResponse>(`${this.pricingApi}/live-fare`, request);
  }
}
