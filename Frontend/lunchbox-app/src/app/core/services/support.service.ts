import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ComplaintSubmissionPayload {
  type: 'Complaint' | 'Bug' | 'Suggestion';
  subject: string;
  name?: string;
  contact?: string;
  description: string;
}

export interface AppFeedbackSubmissionPayload {
  feedbackType: 'open' | 'close';
  feedbackLabel: string;
  appVersion: string;
  route: string;
  submittedAt: string;
  rating?: number;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly supportApi = `${environment.authApiBase}/api/support`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  submitComplaint(payload: ComplaintSubmissionPayload): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(
      `${this.supportApi}/complaints`,
      payload,
      { headers: this.getSessionHeaders() }
    );
  }

  submitAppFeedback(payload: AppFeedbackSubmissionPayload): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(
      `${this.supportApi}/app-feedback`,
      payload,
      { headers: this.getSessionHeaders() }
    );
  }

  private getSessionHeaders(): HttpHeaders {
    const token = this.authService.getSessionToken();
    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ 'x-session-token': token });
  }
}
