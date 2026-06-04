import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';

interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="chat-toggle" (click)="toggleChat()">{{ isOpen ? 'Close Chat' : 'Chat Support' }}</button>

    <section *ngIf="isOpen" class="chat-panel card">
      <header class="chat-header">
        <h6 class="mb-0">{{ t('chatbotTitle') }}</h6>
      </header>

      <div class="chat-body">
        <div *ngFor="let msg of messages" class="chat-row" [ngClass]="msg.from">
          <span>{{ msg.text }}</span>
        </div>
      </div>

      <div class="chat-input">
        <input
          class="form-control"
          [(ngModel)]="question"
          [placeholder]="t('chatbotPlaceholder')"
          (keyup.enter)="ask()"
        />
        <button class="btn btn-danger" (click)="ask()">{{ t('chatbotSend') }}</button>
      </div>
    </section>
  `,
  styles: [
    `
      .chat-toggle {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 1100;
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        background: #d63384;
        color: #fff;
        font-weight: 600;
      }

      .chat-panel {
        position: fixed;
        right: 16px;
        bottom: 72px;
        width: min(360px, calc(100vw - 24px));
        max-height: 65vh;
        z-index: 1100;
        display: flex;
        flex-direction: column;
        border-radius: 14px;
        overflow: hidden;
      }

      .chat-header {
        padding: 10px 12px;
        background: #dc3545;
        color: #fff;
      }

      .chat-body {
        padding: 10px;
        overflow-y: auto;
        flex: 1;
        background: var(--surface);
      }

      .chat-row {
        margin-bottom: 8px;
        display: flex;
      }

      .chat-row span {
        display: inline-block;
        padding: 8px 10px;
        border-radius: 10px;
      }

      .chat-row.bot span {
        background: #e9ecef;
      }

      .chat-row.user {
        justify-content: flex-end;
      }

      .chat-row.user span {
        background: #dc3545;
        color: #fff;
      }

      .chat-input {
        padding: 10px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        border-top: 1px solid #dee2e6;
        background: var(--surface);
      }
    `
  ]
})
export class ChatbotComponent {
  isOpen = false;
  question = '';
  messages: ChatMessage[] = [
    { from: 'bot', text: 'Hi, I can help with login, booking, OTP, tracking and payment questions.' }
  ];

  constructor(private languageService: LanguageService) {}

  t(key: string): string {
    return this.languageService.t(key);
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  ask(): void {
    const input = this.question.trim();
    if (!input) {
      return;
    }

    this.messages.push({ from: 'user', text: input });
    this.messages.push({ from: 'bot', text: this.answer(input) });
    this.question = '';
  }

  private answer(input: string): string {
    const q = input.toLowerCase();

    if (q.includes('register') || q.includes('signup') || q.includes('sign up')) {
      return 'Open Register from top menu, fill details, then login with OTP verification.';
    }

    if (q.includes('login') || q.includes('password')) {
      return 'Use your username/password first, then verify email OTP and mobile OTP to complete login.';
    }

    if (q.includes('otp')) {
      return 'OTP is sent to your registered email and mobile. Customer must enter ride OTP on the tracking screen to start the ride.';
    }

    if (q.includes('track') || q.includes('location') || q.includes('map')) {
      return 'Go to Tracking page to view live drop progress and map location updates.';
    }

    if (q.includes('payment')) {
      return 'Supported payment methods are Cash, Card, UPI and Wallet in the booking form.';
    }

    return 'I can answer basic app questions on login, registration, booking, tracking, OTP, and payment.';
  }
}
