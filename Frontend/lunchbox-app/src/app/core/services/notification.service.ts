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

    // Auto-play sound for every notification
    if (level === 'success') {
      this.playSound('success');
    } else if (level === 'error' || level === 'warning') {
      this.playSound('info');
    }
    // 'info' level is silent by default to avoid noise on routine messages

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

  /** Play a Web Audio sound. type: 'alert' = ride-style beeps, 'success' = cash chime, 'info' = soft ping */
  playSound(type: 'alert' | 'success' | 'info' = 'info'): void {
    if (typeof window === 'undefined') return;
    const AudioCtx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const doPlay = () => {
      if (type === 'alert') {
        [{ freq: 1400, s: 0, d: 0.1 }, { freq: 1600, s: 0.13, d: 0.1 }, { freq: 1800, s: 0.26, d: 0.18 }].forEach(b => {
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.type = 'square'; osc.frequency.value = b.freq;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + b.s);
          g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + b.s + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + b.s + b.d);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(ctx.currentTime + b.s); osc.stop(ctx.currentTime + b.s + b.d + 0.01);
        });
        setTimeout(() => ctx.close().catch(() => void 0), 700);
      } else if (type === 'success') {
        [{ freq: 880, s: 0, d: 0.12 }, { freq: 1320, s: 0.14, d: 0.2 }].forEach(b => {
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = b.freq;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + b.s);
          g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + b.s + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + b.s + b.d);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(ctx.currentTime + b.s); osc.stop(ctx.currentTime + b.s + b.d + 0.01);
        });
        setTimeout(() => ctx.close().catch(() => void 0), 500);
      } else {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = 660;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
        setTimeout(() => ctx.close().catch(() => void 0), 400);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(() => void 0);
    } else {
      doPlay();
    }
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
