import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface UserSettingsPreferences {
  selectedLanguage: string;
  paymentPreference: 'upi' | 'card' | 'wallet' | 'cash' | 'auto';
  autoPaymentEnabled: boolean;
  addresses: Array<{ id: string; label: string; address: string }>;
  emergencyContacts: Array<{ id: string; name: string; phone: string }>;
  trustedContacts: Array<{ id: string; name: string; phone: string }>;
  notificationPrefs: {
    sms: boolean;
    email: boolean;
    push: boolean;
    rideUpdates: boolean;
    paymentAlerts: boolean;
  };
  safetyPrefs: {
    sosEnabled: boolean;
    shareLiveLocation: boolean;
    emergencyCalling: boolean;
    driverVerification: boolean;
    tripRecording: boolean;
  };
}

export interface TravelStopPreference {
  address: string;
  lat: number;
  lng: number;
}

export interface TrackingPreferences {
  refundRequests: Record<string, string>;
  favoriteDrivers: string[];
}

export interface UserPreferencesDocument {
  settings?: UserSettingsPreferences;
  travel?: {
    recentStops?: TravelStopPreference[];
  };
  tracking?: TrackingPreferences;
}

type PreferencesResponse = { dataJson: string; updatedAt?: string };

const PREFERENCES_API = `${environment.authApiBase}/api/auth/preferences`;

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getSettingsPreferences(): Observable<UserSettingsPreferences | null> {
    return this.getPreferencesDocument().pipe(map((doc) => doc.settings ?? null));
  }

  saveSettingsPreferences(payload: UserSettingsPreferences): Observable<void> {
    return this.updatePreferences({ settings: payload });
  }

  getTravelRecentStops(): Observable<TravelStopPreference[]> {
    return this.getPreferencesDocument().pipe(map((doc) => doc.travel?.recentStops ?? []));
  }

  saveTravelRecentStops(stops: TravelStopPreference[]): Observable<void> {
    return this.updatePreferences({ travel: { recentStops: stops } });
  }

  getTrackingPreferences(): Observable<TrackingPreferences | null> {
    return this.getPreferencesDocument().pipe(map((doc) => doc.tracking ?? null));
  }

  saveTrackingPreferences(payload: TrackingPreferences): Observable<void> {
    return this.updatePreferences({ tracking: payload });
  }

  private updatePreferences(partial: Partial<UserPreferencesDocument>): Observable<void> {
    return this.getPreferencesDocument().pipe(
      map((current) => ({
        ...current,
        ...partial,
        settings: partial.settings ?? current.settings,
        travel: partial.travel ? { ...(current.travel ?? {}), ...partial.travel } : current.travel,
        tracking: partial.tracking ?? current.tracking
      })),
      switchMap((next) =>
        this.http.put(PREFERENCES_API, { dataJson: JSON.stringify(next) }, { headers: this.getSessionHeaders() })
      ),
      map(() => void 0)
    );
  }

  private getPreferencesDocument(): Observable<UserPreferencesDocument> {
    return this.http
      .get<PreferencesResponse>(PREFERENCES_API, { headers: this.getSessionHeaders() })
      .pipe(map((response) => this.parsePreferencesResponse(response)));
  }

  private parsePreferencesResponse(response: PreferencesResponse): UserPreferencesDocument {
    const json = response?.dataJson;
    if (!json) {
      return {};
    }

    try {
      const parsed = JSON.parse(json) as UserPreferencesDocument | UserSettingsPreferences;
      if (this.looksLikeLegacySettings(parsed)) {
        return { settings: parsed as UserSettingsPreferences };
      }
      return parsed as UserPreferencesDocument;
    } catch {
      return {};
    }
  }

  private looksLikeLegacySettings(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Partial<UserSettingsPreferences>;
    return (
      Array.isArray(candidate.addresses) ||
      Array.isArray(candidate.emergencyContacts) ||
      Array.isArray(candidate.trustedContacts) ||
      !!candidate.notificationPrefs ||
      !!candidate.safetyPrefs
    );
  }

  private getSessionHeaders(): HttpHeaders {
    const token = this.auth.getSessionToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({ 'x-session-token': token });
  }
}
