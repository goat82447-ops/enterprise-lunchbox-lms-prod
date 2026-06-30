import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { distinctUntilChanged, firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const PUSH_SUBSCRIBE_API = `${environment.authApiBase}/api/push/subscribe`;
const PUSH_UNSUBSCRIBE_API = `${environment.authApiBase}/api/push/unsubscribe`;
const PUSH_PUBLIC_KEY_API = `${environment.authApiBase}/api/push/public-key`;
const PUSH_SW_PATH = '/push-sw.js';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private initialized = false;
  private currentEndpoint = '';

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
        this.ensureSubscription();
      });
  }

  private async ensureSubscription(): Promise<void> {
    if (!('PushManager' in window)) {
      return;
    }

    const registration = await navigator.serviceWorker.register(PUSH_SW_PATH);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    const vapidPublicKey = await this.resolveVapidPublicKey();
    if (!vapidPublicKey) {
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
      auth: json.keys['auth']
    };
    this.http.post(PUSH_SUBSCRIBE_API, payload, { headers: this.getSessionHeaders() })
      .subscribe({ error: () => void 0 });
  }

  private unsubscribeFromServer(): void {
    if (!this.currentEndpoint) {
      return;
    }
    this.http.post(PUSH_UNSUBSCRIBE_API, { endpoint: this.currentEndpoint }, { headers: this.getSessionHeaders() })
      .subscribe({ error: () => void 0 });
    this.currentEndpoint = '';
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
}
