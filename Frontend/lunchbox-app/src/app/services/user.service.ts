import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.gatewayApiBase}/api/users`;
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadFromLocalStorage());
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (user) {
      localStorage.setItem('lunchbox_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lunchbox_user');
    }
  }

  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
      tap(user => this.setCurrentUser(user)),
      catchError(error => {
        console.error('Error fetching user:', error);
        return throwError(() => new Error('Failed to fetch user'));
      })
    );
  }

  private loadFromLocalStorage(): User | null {
    const saved = localStorage.getItem('lunchbox_user');
    return saved ? JSON.parse(saved) : null;
  }
}
