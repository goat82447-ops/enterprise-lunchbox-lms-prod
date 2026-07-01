import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { distinctUntilChanged, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
  role?: string;
  deviceId?: string;
  notificationMode?: 'all' | 'trip-only' | 'critical-only' | 'off';
  channels?: {
    rideUpdates: boolean;
    paymentAlerts: boolean;
    sms: boolean;
    email: boolean;
  };

  export type PushStatsResponse = {
    pushConfigured: boolean;
    requestedBy: {
      userId: string;
      role: string;
      isAdmin: boolean;
    };
    totals: {
      all: number;
      active: number;
      inactive: number;
    };
    activeByRole: Record<string, number>;
    currentUser: {
      all: number;
      active: number;
      devices: Array<{
        deviceId: string;
        role: string;
        mode: string;
        isActive: boolean;
        updatedAt: string;
        endpointTail: string;
      }>;
    };
  };
};

const PUSH_SUBSCRIBE_API = `${environment.authApiBase}/api/push/subscribe`;
const PUSH_UNSUBSCRIBE_API = `${environment.authApiBase}/api/push/unsubscribe`;
const PUSH_PUBLIC_KEY_API = `${environment.authApiBase}/api/push/public-key`;
const PUSH_TEST_API = `${environment.authApiBase}/api/push/test`;
const PUSH_STATS_API = `${environment.authApiBase}/api/push/stats`;
const PUSH_SW_PATH = '/push-sw.js';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private initialized = false;
  private currentEndpoint = '';
  private readonly deviceId = this.getOrCreateDeviceId();
  private preferenceSnapshot: {
    push: boolean;
    rideUpdates: boolean;
    paymentAlerts: boolean;
    sms: boolean;
    email: boolean;
    mode: 'all' | 'trip-only' | 'critical-only' | 'off';
  } = {
    push: true,
    rideUpdates: true,
    paymentAlerts: true,
    sms: true,
    email: true,
    mode: 'all'
  };

  constructor(private http: HttpClient, private auth: AuthService) {}

  initialize(): void {
    if (this.initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    this.initialized = true;

    this.auth.user$
      .pipe(distinctUntilChanged((prev, curr) => (prev?.id ?? null) === (curr?.id ?? null)))
      .subscribe((user) => {
        if (!user) {
          this.unsubscribeFromServer();
          return;
        }
        void this.ensureSubscription(false);
      });
  }

  enableFromUserGesture(): void {
    void this.ensureSubscription(true);
  }

  disablePush(): void {
    this.unsubscribeFromServer();
    void this.unsubscribeFromBrowser();
  }

  updatePreferenceSnapshot(snapshot: {
    push: boolean;
    rideUpdates: boolean;
    paymentAlerts: boolean;
    sms: boolean;
    email: boolean;
    mode: 'all' | 'trip-only' | 'critical-only' | 'off';
  }): void {
    this.preferenceSnapshot = { ...snapshot };
  }

  syncCurrentSubscription(): void {
    if (!this.preferenceSnapshot.push || this.preferenceSnapshot.mode === 'off') {
      this.disablePush();
      return;
    }
    void this.ensureSubscription(false);
  }

  async sendTestNotificationFromSettings(target: 'self' | 'captain' | 'rider'): Promise<{ ok: boolean; message: string }> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
      return { ok: false, message: 'Push notifications are not supported on this device.' };
    }

    async getPushStats(): Promise<PushStatsResponse> {
      return firstValueFrom(
        this.http.get<PushStatsResponse>(PUSH_STATS_API, { headers: this.getSessionHeaders() })
      );
    }

    const permission = await this.resolvePermission(true);
    if (permission !== 'granted') {
      return { ok: false, message: 'Notification permission not granted.' };
    }

    await this.ensureSubscription(false);

    try {
      await firstValueFrom(
        this.http.post(
          PUSH_TEST_API,
          {
            title: 'RouteX Test Notification',
            body: `Push test for target: ${target}.`,
            url: '/',
            targetRole: target === 'self' ? this.auth.getCurrentUser()?.role ?? 'self' : target,
            requestedByRole: this.auth.getCurrentUser()?.role ?? 'unknown',
            requestedByDeviceId: this.deviceId
          },
          { headers: this.getSessionHeaders() }
        )
      );
      return { ok: true, message: `Server test push sent for target "${target}".` };
    } catch {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('RouteX Test Notification', {
          body: 'Local test sent. Server test endpoint is unavailable.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: { url: '/' },
          tag: 'routex-local-test'
        });
        return { ok: true, message: 'Local test notification shown (server test API not available).' };
      } catch {
        return { ok: false, message: 'Unable to send test notification right now.' };
      }
    }
  }

  private async ensureSubscription(forcePrompt: boolean): Promise<void> {
    if (!('PushManager' in window)) {
      return;
    }
    if (!this.preferenceSnapshot.push || this.preferenceSnapshot.mode === 'off') {
      return;
    }

    const permission = await this.resolvePermission(forcePrompt);
    if (permission !== 'granted') {
      return;
    }

    const registration = await navigator.serviceWorker.register(PUSH_SW_PATH);
    const vapidPublicKey = await this.resolveVapidPublicKey();
    if (!vapidPublicKey) {
      console.warn('[PushNotificationService] Missing VAPID public key');
      return;
    }

    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToArrayBuffer(vapidPublicKey)
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.['p256dh'] || !json.keys?.['auth']) {
      return;
    }

    this.currentEndpoint = json.endpoint;
    const payload: PushSubscriptionPayload = {
      endpoint: json.endpoint,
      p256dh: json.keys['p256dh'],
      auth: json.keys['auth'],
      role: this.auth.getCurrentUser()?.role,
      deviceId: this.deviceId,
      notificationMode: this.preferenceSnapshot.mode,
      channels: {
        rideUpdates: this.preferenceSnapshot.rideUpdates,
        paymentAlerts: this.preferenceSnapshot.paymentAlerts,
        sms: this.preferenceSnapshot.sms,
        email: this.preferenceSnapshot.email
      }
    };
    this.http.post(PUSH_SUBSCRIBE_API, payload, { headers: this.getSessionHeaders() })
      .subscribe({
        error: (err) => console.warn('[PushNotificationService] Subscribe failed', err)
      });
  }

  private unsubscribeFromServer(): void {
    if (!this.currentEndpoint) {
      return;
    }
    this.http.post(PUSH_UNSUBSCRIBE_API, { endpoint: this.currentEndpoint }, { headers: this.getSessionHeaders() })
      .subscribe({
        error: (err) => console.warn('[PushNotificationService] Unsubscribe failed', err)
      });
    this.currentEndpoint = '';
  }

  private async unsubscribeFromBrowser(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.getRegistration(PUSH_SW_PATH);
      const existing = await registration?.pushManager.getSubscription();
      await existing?.unsubscribe();
    } catch (err) {
      console.warn('[PushNotificationService] Browser unsubscribe failed', err);
    }
  }

  private async resolveVapidPublicKey(): Promise<string> {
    if (environment.pushVapidPublicKey) {
      return environment.pushVapidPublicKey;
    }
    const response = await firstValueFrom(
      this.http.get<{ publicKey?: string }>(PUSH_PUBLIC_KEY_API, { headers: this.getSessionHeaders() })
    );
    return response?.publicKey || '';
  }

  private getSessionHeaders(): HttpHeaders {
    const token = this.auth.getSessionToken();
    return token ? new HttpHeaders({ 'x-session-token': token }) : new HttpHeaders();
  }

  private async resolvePermission(forcePrompt: boolean): Promise<NotificationPermission> {
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    if (!forcePrompt) {
      return 'default';
    }
    return Notification.requestPermission();
  }

  private urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') {
      return 'server';
    }
    const key = 'routex_push_device_id_v1';
    const existing = localStorage.getItem(key);
    if (existing) {
      return existing;
    }
    const next = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, next);
    return next;
  }
}
