import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IntegrationHealthResponse } from '../models/delivery.models';

@Injectable({ providedIn: 'root' })
export class IntegrationHealthService {
  private readonly integrationApi = 'https://lunchbox-auth-service.onrender.com/api/integrations';

  constructor(private http: HttpClient) {}

  getHealth(): Observable<IntegrationHealthResponse> {
    return this.http.get<IntegrationHealthResponse>(`${this.integrationApi}/health`);
  }
}
