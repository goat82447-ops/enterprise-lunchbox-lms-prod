import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserActionLog } from '../../core/models/delivery.models';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <h2 class="mb-3">User Action Audit</h2>
      <p class="text-muted">Tracks deeper user interactions and security-sensitive operations.</p>

      <button class="btn btn-outline-primary mb-3" (click)="reload()">Refresh</button>

      <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

      <div class="card p-3" *ngFor="let log of logs$ | async">
        <div><strong>{{ log.actionType }}</strong> · {{ log.createdAt | date: 'short' }}</div>
        <div class="text-muted">User: {{ log.userId }}</div>
        <pre class="mb-0 small">{{ log.metadata | json }}</pre>
      </div>
    </div>
  `,
  styles: [
    `
      .card + .card {
        margin-top: 0.75rem;
      }
      pre {
        background: #f7f7f7;
        padding: 0.5rem;
        border-radius: 0.5rem;
      }
    `
  ]
})
export class AuditComponent {
  logs$: Observable<UserActionLog[]>;
  errorMessage = '';

  constructor(private authService: AuthService) {
    this.logs$ = this.authService.getActionLogs();
  }

  reload(): void {
    this.logs$ = this.authService.getActionLogs();
  }
}
