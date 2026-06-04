import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-welcome-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="welcome-overlay" (click)="close()">
      <div class="welcome-dialog" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close()">&times;</button>
        <div class="welcome-content">
          <div class="welcome-icon">👋</div>
          <h2 class="welcome-title">Welcome, {{ username }}!</h2>
          <p class="welcome-message">You're now securely logged in. Your biometric thumbprint has been verified.</p>
          <div class="welcome-role">
            <small>Role: <strong>{{ roleLabel }}</strong></small>
          </div>
          <button class="btn btn-danger btn-lg w-100 mt-3" (click)="close()">Get Started</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .welcome-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .welcome-dialog {
      background: white;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      position: relative;
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      font-size: 32px;
      cursor: pointer;
      color: #999;
      padding: 0;
    }

    .close-btn:hover {
      color: #333;
    }

    .welcome-content {
      padding-top: 8px;
    }

    .welcome-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .welcome-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #1d3557;
    }

    .welcome-message {
      font-size: 14px;
      color: #666;
      margin-bottom: 16px;
    }

    .welcome-role {
      background: #f0f5ff;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 20px;
      color: #13416a;
    }

    @media (max-width: 480px) {
      .welcome-dialog {
        padding: 24px 16px;
      }

      .welcome-title {
        font-size: 24px;
      }
    }
  `]
})
export class WelcomeDialogComponent {
  username: string = '';
  role: string = 'customer';

  constructor() {}

  get roleLabel(): string {
    const roleMap: Record<string, string> = {
      customer: 'Customer - Book & Track',
      admin: 'Admin - Full Access',
      captain: 'Captain - Jobs & Deliveries'
    };
    return roleMap[this.role] || this.role;
  }

  close(): void {
    const overlay = document.querySelector('.welcome-overlay') as HTMLElement;
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.remove(), 300);
    }
  }
}
