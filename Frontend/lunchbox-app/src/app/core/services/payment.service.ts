import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface LinkedAccount {
  id: string;
  type: 'bank' | 'upi';
  label: string;
  detail: string;
  icon: string;
  isDefault: boolean;
}

export interface UpiId {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface WalletTxn {
  label: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
}

export interface PayHistory {
  label: string;
  date: string;
  amount: number;
  mode: string;
  refund: boolean;
}

export interface PaymentProfile {
  user_id: string;
  wallet_balance: number;
  pay_later_enabled: boolean;
  pay_later_used: number;
  linked_accounts: LinkedAccount[];
  upi_ids: UpiId[];
  wallet_txns: WalletTxn[];
  pay_history: PayHistory[];
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = `${environment.authApiBase}/api/payment`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.getSessionToken();
    return token ? new HttpHeaders({ 'x-session-token': token }) : new HttpHeaders();
  }

  /** Load payment profile from the database */
  getProfile(): Observable<PaymentProfile> {
    return this.http.get<PaymentProfile>(this.api, { headers: this.headers() });
  }

  /** Save the full profile back to the database */
  saveProfile(profile: Partial<PaymentProfile>): Observable<PaymentProfile> {
    return this.http.patch<PaymentProfile>(this.api, profile, { headers: this.headers() });
  }

  /** Add money to wallet — dedicated endpoint with atomic $inc */
  addMoneyToWallet(amount: number): Observable<{ wallet_balance: number; txn: WalletTxn }> {
    return this.http.post<{ message: string; wallet_balance: number; txn: WalletTxn }>(
      `${this.api}/wallet/add`,
      { amount },
      { headers: this.headers() }
    ).pipe(map(r => ({ wallet_balance: r.wallet_balance, txn: r.txn })));
  }
}
