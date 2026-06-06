import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminUserListItem,
  AppUser,
  CaptainDirectoryItem,
  CaptainFeedbackRequest,
  CaptainFeedbackStats,
  LoginStartResponse,
  RegisterRequest,
  RegisterResponse,
  UserStats,
  UserRole,
  UserActionLog,
  VerifyOtpResponse,
  VoiceChallengeResponse
} from '../models/delivery.models';

const STORAGE_KEY = 'delivery_app_user';
const SESSION_KEY = 'delivery_session_token';
const ADMIN_ACCESS_KEY = 'delivery_admin_portal_access';
const AUTH_API_BASE = environment.authApiBase;
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Welcome2$';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = `${AUTH_API_BASE}/api/auth`;
  private readonly userSubject = new BehaviorSubject<AppUser | null>(this.loadUser());
  readonly user$: Observable<AppUser | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  startLogin(username: string, password: string, role: Exclude<UserRole, 'user'>): Observable<LoginStartResponse> {
    return this.http.post<LoginStartResponse>(`${this.authApi}/login`, {
      username,
      password,
      role
    });
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authApi}/register`, payload);
  }

  verifyOtp(tempToken: string, emailOtp: string, mobileOtp: string): Observable<VerifyOtpResponse> {
    return this.http.post<VerifyOtpResponse>(`${this.authApi}/verify-otp`, {
      tempToken,
      emailOtp,
      mobileOtp
    });
  }

  completeLogin(response: VerifyOtpResponse, loginContext?: { username?: string; password?: string }): void {
    sessionStorage.setItem(SESSION_KEY, response.sessionToken);
    localStorage.setItem(SESSION_KEY, response.sessionToken);
    this.setAdminPortalAccess(response.user, loginContext);
    this.setUser(response.user);
  }

  getVoiceChallenge(): Observable<VoiceChallengeResponse> {
    return this.http.post<VoiceChallengeResponse>(
      `${this.authApi}/voice-challenge`,
      {},
      { headers: this.getSessionHeaders() }
    );
  }

  verifyVoice(spokenText: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.authApi}/voice-verify`,
      { spokenText },
      { headers: this.getSessionHeaders() }
    );
  }

  recordUserAction(actionType: string, metadata: Record<string, unknown>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.authApi}/user-action`,
      { actionType, metadata },
      { headers: this.getSessionHeaders() }
    );
  }

  getActionLogs(): Observable<UserActionLog[]> {
    return this.http.get<UserActionLog[]>(`${this.authApi}/actions`, {
      headers: this.getSessionHeaders()
    });
  }

  logout(): void {
    const token = this.getSessionToken();
    if (token) {
      this.http
        .post(
          `${this.authApi}/logout`,
          {},
          { headers: this.getSessionHeaders() }
        )
        .subscribe({ error: () => void 0 });
    }

    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ADMIN_ACCESS_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_ACCESS_KEY);
    // Clear all biometric data on logout
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('biometric_')) {
        localStorage.removeItem(key);
      }
    }
    this.userSubject.next(null);
  }

  getCurrentUser(): AppUser | null {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value && !!this.getSessionToken();
  }

  isAdmin(): boolean {
    return this.userSubject.value?.role === 'admin' && this.getAdminPortalAccess();
  }

  isCaptain(): boolean {
    return this.userSubject.value?.role === 'captain';
  }

  updateProfileImage(profileImageUrl: string): Observable<{ message: string; profileImageUrl: string }> {
    return this.http.post<{ message: string; profileImageUrl: string }>(
      `${this.authApi}/profile-image`,
      { profileImageUrl },
      { headers: this.getSessionHeaders() }
    );
  }

  submitCaptainFeedback(payload: CaptainFeedbackRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.authApi}/captain-feedback`,
      payload,
      { headers: this.getSessionHeaders() }
    );
  }

  getCaptainFeedbackStats(): Observable<CaptainFeedbackStats> {
    return this.http.get<CaptainFeedbackStats>(`${this.authApi}/captain-feedback/stats`, {
      headers: this.getSessionHeaders()
    });
  }

  getCaptains(vehicleType?: string): Observable<CaptainDirectoryItem[]> {
    const suffix = vehicleType ? `?vehicleType=${encodeURIComponent(vehicleType)}` : '';
    return this.http.get<CaptainDirectoryItem[]>(`${this.authApi}/captains${suffix}`, {
      headers: this.getSessionHeaders()
    });
  }

  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.authApi}/users/stats`, {
      headers: this.getSessionHeaders()
    });
  }

  getUsers(): Observable<AdminUserListItem[]> {
    return this.http.get<AdminUserListItem[]>(`${this.authApi}/users`, {
      headers: this.getSessionHeaders()
    });
  }

  applyProfileImage(profileImageUrl: string): void {
    const user = this.userSubject.value;
    if (!user) {
      return;
    }

    const updated: AppUser = {
      ...user,
      profileImageUrl
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    this.userSubject.next(updated);
  }

  getSessionToken(): string | null {
    return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  }

  private setUser(user: AppUser): void {
    const normalized: AppUser = {
      ...user,
      role: user.role === 'user' ? 'customer' : user.role
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    this.userSubject.next(normalized);
  }

  private getSessionHeaders(): HttpHeaders {
    const token = this.getSessionToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({ 'x-session-token': token });
  }

  private setAdminPortalAccess(user: AppUser, loginContext?: { username?: string; password?: string }): void {
    const username = String(loginContext?.username || '').trim().toLowerCase();
    const password = String(loginContext?.password || '');
    const hasAdminAccess = user.role === 'admin' && username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

    if (hasAdminAccess) {
      sessionStorage.setItem(ADMIN_ACCESS_KEY, '1');
      localStorage.setItem(ADMIN_ACCESS_KEY, '1');
      return;
    }

    sessionStorage.removeItem(ADMIN_ACCESS_KEY);
    localStorage.removeItem(ADMIN_ACCESS_KEY);
  }

  private getAdminPortalAccess(): boolean {
    const value = sessionStorage.getItem(ADMIN_ACCESS_KEY) || localStorage.getItem(ADMIN_ACCESS_KEY);
    if (value && !sessionStorage.getItem(ADMIN_ACCESS_KEY)) {
      sessionStorage.setItem(ADMIN_ACCESS_KEY, value);
    }
    return value === '1';
  }

  private loadUser(): AppUser | null {
    // Keep session storage in sync when restoring from localStorage after app restart.
    const token = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (token && !sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, token);
    }

    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AppUser;
      return {
        ...parsed,
        role: parsed.role === 'user' ? 'customer' : parsed.role
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
