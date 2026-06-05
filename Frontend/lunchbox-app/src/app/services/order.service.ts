import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Order } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.gatewayApiBase}/api/orders`;
  private currentOrderSubject = new BehaviorSubject<Order | null>(null);
  public currentOrder$: Observable<Order | null> = this.currentOrderSubject.asObservable();

  constructor(private http: HttpClient) {}

  createOrder(order: Order): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, order).pipe(
      catchError(error => {
        console.error('Error creating order:', error);
        return throwError(() => new Error('Failed to create order'));
      })
    );
  }

  getOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`).pipe(
      catchError(error => {
        console.error('Error fetching order:', error);
        return throwError(() => new Error('Failed to fetch order'));
      })
    );
  }

  trackOrder(orderId: string): Observable<Order> {
    return interval(5000).pipe(
      switchMap(() => this.getOrder(orderId)),
      catchError(error => {
        console.error('Error tracking order:', error);
        return throwError(() => new Error('Failed to track order'));
      })
    );
  }

  setCurrentOrder(order: Order | null): void {
    this.currentOrderSubject.next(order);
    if (order) {
      localStorage.setItem('lunchbox_current_order', JSON.stringify(order));
    } else {
      localStorage.removeItem('lunchbox_current_order');
    }
  }

  getCurrentOrder(): Order | null {
    return this.currentOrderSubject.value;
  }
}
