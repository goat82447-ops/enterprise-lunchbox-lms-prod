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
    const n: AppNotification = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, message, level, createdAt: new Date().toISOString(), read: false };
    this.notificationCenterSubject.next([n, ...this.notificationCenterSubject.value].slice(0,120));
    this.notificationsSubject.next([n, ...this.notificationsSubject.value].slice(0,6));
    this.pushBrowserNotification(n);
    if (level === 'success') this.playSound('success');
    else if (level === 'error' || level === 'warning') this.playSound('info');
    setTimeout(() => this.dismiss(n.id), this.autoDismissMs);
  }
  dismiss(id: string): void { this.notificationsSubject.next(this.notificationsSubject.value.filter(n => n.id !== id)); }
  clear(): void { this.notificationsSubject.next([]); }
  markAllAsRead(): void { this.notificationCenterSubject.next(this.notificationCenterSubject.value.map(n => ({...n, read: true}))); }
  clearNotificationCenter(): void { this.notificationCenterSubject.next([]); }
  requestBrowserPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) return Promise.resolve('unsupported');
    if (Notification.permission === 'granted') return Promise.resolve('granted');
    return Notification.requestPermission();
  }
  playSound(type: 'alert' | 'success' | 'info' = 'info'): void {
    if (typeof window === 'undefined') return;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    const run = () => {
      if (type === 'alert') {
        [{f:1400,s:0,d:0.1},{f:1600,s:0.13,d:0.1},{f:1800,s:0.26,d:0.18}].forEach(b => {
          const o=ctx.createOscillator(),g=ctx.createGain(); o.type='square'; o.frequency.value=b.f;
          g.gain.setValueAtTime(0.0001,ctx.currentTime+b.s); g.gain.exponentialRampToValueAtTime(0.5,ctx.currentTime+b.s+0.01); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+b.s+b.d);
          o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime+b.s); o.stop(ctx.currentTime+b.s+b.d+0.01);
        }); setTimeout(()=>ctx.close().catch(()=>{}),700);
      } else if (type === 'success') {
        [{f:880,s:0,d:0.12},{f:1320,s:0.14,d:0.2}].forEach(b => {
          const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.value=b.f;
          g.gain.setValueAtTime(0.0001,ctx.currentTime+b.s); g.gain.exponentialRampToValueAtTime(0.35,ctx.currentTime+b.s+0.01); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+b.s+b.d);
          o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime+b.s); o.stop(ctx.currentTime+b.s+b.d+0.01);
        }); setTimeout(()=>ctx.close().catch(()=>{}),500);
      } else {
        const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.value=660;
        g.gain.setValueAtTime(0.0001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.25,ctx.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.18);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.2);
        setTimeout(()=>ctx.close().catch(()=>{}),400);
      }
    };
    if (ctx.state==='suspended') ctx.resume().then(run).catch(()=>{}); else run();
  }
  private pushBrowserNotification(n: AppNotification): void {
    if (typeof window==='undefined'||!('Notification' in window)||Notification.permission!=='granted') return;
    new Notification(this.resolveTitle(n.level),{body:n.message,tag:`delivery-${n.id}`});
  }
  private resolveTitle(level: AppNotification['level']): string {
    if (level==='success') return 'RouteX Success';
    if (level==='warning') return 'RouteX Warning';
    if (level==='error') return 'RouteX Alert';
    return 'RouteX Notification';
  }
}
