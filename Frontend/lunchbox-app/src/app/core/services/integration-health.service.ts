import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IntegrationHealthResponse } from '../models/delivery.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IntegrationHealthService {
  private readonly integrationApi = `${environment.authApiBase}/api/integrations`;

  constructor(private http: HttpClient) {}

  getHealth(): Observable<IntegrationHealthResponse> {
    return this.http.get<IntegrationHealthResponse>(`${this.integrationApi}/health`);
  }
}
