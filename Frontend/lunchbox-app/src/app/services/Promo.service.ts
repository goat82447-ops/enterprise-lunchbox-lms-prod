import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface PromoRule {
  code: string;
  type: 'flat' | 'percent';
  value: number;
  minAmount: number;
  maxDiscount?: number;
}

export interface PromoValidationResponse {
  valid: boolean;
  code?: string;
  discount?: number;
  payableAmount?: number;
  promo?: PromoRule;
  error?: string;
  minAmount?: number;
}

@Injectable({ providedIn: 'root' })
export class PromoService {
  private readonly promoApi = `${environment.authApiBase}/api/promos`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  validatePromo(code: string, amount: number): Observable<PromoValidationResponse> {
    return this.http.post<PromoValidationResponse>(
      `${this.promoApi}/validate`,
      { code, amount },
      { headers: this.getSessionHeaders() }
    );
  }

  private getSessionHeaders(): HttpHeaders {
    const token = this.authService.getSessionToken();
    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ 'x-session-token': token });
  }
}
