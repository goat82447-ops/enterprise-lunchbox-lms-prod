import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LiveFareRequest, LiveFareResponse } from '../models/delivery.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly pricingApi = `${environment.authApiBase}/api/pricing`;

  constructor(private http: HttpClient) {}

  getLiveFare(request: LiveFareRequest): Observable<LiveFareResponse> {
    return this.http.post<LiveFareResponse>(`${this.pricingApi}/live-fare`, request);
  }
}
