import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppNotification } from '../models/delivery.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  readonly notifications$: Observable<AppNotification[]> = this.notificationsSubject.asObservable();

  private readonly notificationCenterSubject = new BehaviorSubject<AppNotification[]>([]);
  readonly notificationCenter$: Observable<AppNotification[]> = this.notificationCenterSubject.asObservable();

  private readonly autoDismissMs = 3500;

  push(message: string, level: AppNotification['level'] = 'info'): void {
    const notification: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      level,
      createdAt: new Date().toISOString(),
      read: false
    };

    const centerCurrent = this.notificationCenterSubject.value;
    this.notificationCenterSubject.next([notification, ...centerCurrent].slice(0, 120));

    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...current].slice(0, 6));

    this.pushBrowserNotification(notification);

    setTimeout(() => {
      this.dismiss(notification.id);
    }, this.autoDismissMs);
  }

  dismiss(notificationId: string): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.filter((item) => item.id !== notificationId)
    );
  }

  clear(): void {
    this.notificationsSubject.next([]);
  }

  markAllAsRead(): void {
    this.notificationCenterSubject.next(
      this.notificationCenterSubject.value.map((item) => ({ ...item, read: true }))
    );
  }

  clearNotificationCenter(): void {
    this.notificationCenterSubject.next([]);
  }

  requestBrowserPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return Promise.resolve('unsupported');
    }

    if (Notification.permission === 'granted') {
      return Promise.resolve('granted');
    }

    return Notification.requestPermission();
  }

  private pushBrowserNotification(notification: AppNotification): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const title = this.resolveTitle(notification.level);
    new Notification(title, {
      body: notification.message,
      tag: `delivery-${notification.id}`
    });
  }

  private resolveTitle(level: AppNotification['level']): string {
    if (level === 'success') {
      return 'RideDrop Pro Success';
    }
    if (level === 'warning') {
      return 'RideDrop Pro Warning';
    }
    if (level === 'error') {
      return 'RideDrop Pro Alert';
    }
    return 'RideDrop Pro Notification';
  }
}
