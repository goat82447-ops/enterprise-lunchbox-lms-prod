import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';

interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
}

interface ChatIntent {
  keywords: string[];
  answer: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="chat-toggle" (click)="toggleChat()">
      <span class="toggle-dot"></span>
      {{ isOpen ? 'Close Assistant' : 'Ask Ekart AI' }}
    </button>

    <section *ngIf="isOpen" class="chat-panel card">
      <header class="chat-header">
        <div class="assistant-avatar">AI</div>
        <div>
          <h6 class="mb-0">Ekart Assistant</h6>
          <small class="assistant-subtitle">Project-aware support for booking, services, and account help</small>
        </div>
      </header>

      <div class="chat-body">
        <div class="chat-hint">Try asking: "pickup service", "women safety", "referral cashback"</div>
        <div *ngFor="let msg of messages; let i = index" class="chat-row" [ngClass]="msg.from">
          <span class="bubble">{{ msg.text }}</span>
          <span class="typing-cursor" *ngIf="isTypingMessage(msg, i)"></span>
        </div>

        <div class="chat-row bot" *ngIf="isThinking">
          <span class="bubble thinking-bubble">
            <span class="thinking-text">Assistant is thinking</span>
            <span class="thinking-dots">
              <i></i><i></i><i></i>
            </span>
          </span>
        </div>
      </div>

      <div class="chat-input">
        <div class="composer-shell">
          <input
            class="composer-input"
            [(ngModel)]="question"
            [placeholder]="'Ask about booking, pickup, OTP, referral, insurance... '"
            (keyup.enter)="ask()"
          />
          <button class="send-btn" (click)="ask()">Send</button>
        </div>
      </div>

      <div class="chat-suggestions">
        <button
          type="button"
          class="suggestion-chip"
          *ngFor="let chip of quickPrompts"
          (click)="ask(chip)"
        >
          {{ chip }}
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      .chat-toggle {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 1100;
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        background: linear-gradient(135deg, #0b2239 0%, #13416a 55%, #ef233c 100%);
        color: #fff;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.3);
      }

      .toggle-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #7cf29a;
      }

      .chat-toggle:hover {
        filter: brightness(1.04);
      }

      .chat-panel {
        position: fixed;
        right: 14px;
        bottom: 68px;
        width: min(390px, calc(100vw - 22px));
        height: min(68vh, 560px);
        z-index: 1100;
        display: flex;
        flex-direction: column;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.35);
        box-shadow: 0 16px 34px rgba(2, 6, 23, 0.24);
      }

      .chat-header {
        padding: 10px 12px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #f8fafc;
        display: grid;
        grid-template-columns: 34px 1fr;
        gap: 10px;
        align-items: center;
      }

      .assistant-avatar {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        background: linear-gradient(135deg, #ef233c 0%, #fb8500 100%);
      }

      .assistant-subtitle {
        color: #cbd5e1;
        font-size: 11px;
      }

      .chat-body {
        padding: 10px;
        overflow-y: auto;
        flex: 1;
        background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      }

      .chat-hint {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 10px;
      }

      .chat-row {
        margin-bottom: 10px;
        display: flex;
      }

      .bubble {
        display: inline-block;
        padding: 9px 11px;
        border-radius: 12px;
        max-width: 88%;
        line-height: 1.35;
        font-size: 13px;
      }

      .chat-row.bot .bubble {
        background: #eef2f7;
        border: 1px solid #e2e8f0;
        color: #0f172a;
      }

      .chat-row.user {
        justify-content: flex-end;
      }

      .chat-row.user .bubble {
        background: linear-gradient(135deg, #ef233c 0%, #d90429 100%);
        color: #fff;
      }

      .typing-cursor {
        width: 6px;
        height: 16px;
        margin-left: 4px;
        border-radius: 3px;
        background: #334155;
        align-self: center;
        animation: cursor-blink 0.8s steps(1, end) infinite;
      }

      .thinking-bubble {
        background: #eef2f7;
        border: 1px solid #e2e8f0;
        color: #334155;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .thinking-text {
        font-size: 12px;
      }

      .thinking-dots {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .thinking-dots i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #64748b;
        display: inline-block;
        animation: thinking-pop 1.1s ease-in-out infinite;
      }

      .thinking-dots i:nth-child(2) {
        animation-delay: 0.16s;
      }

      .thinking-dots i:nth-child(3) {
        animation-delay: 0.32s;
      }

      @keyframes thinking-pop {
        0%,
        80%,
        100% {
          opacity: 0.35;
          transform: translateY(0);
        }

        40% {
          opacity: 1;
          transform: translateY(-2px);
        }
      }

      @keyframes cursor-blink {
        0%,
        50% {
          opacity: 1;
        }

        51%,
        100% {
          opacity: 0;
        }
      }

      .chat-input {
        padding: 9px;
        border-top: 1px solid #dee2e6;
        background: #ffffff;
      }

      .composer-shell {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 5px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
        background: #fff;
      }

      .composer-input {
        border: 0;
        outline: 0;
        padding: 8px 9px;
        font-size: 13px;
        background: transparent;
      }

      .send-btn {
        border: 0;
        border-radius: 9px;
        background: #0f172a;
        color: #fff;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
      }

      .send-btn:hover {
        background: #1e293b;
      }

      .chat-suggestions {
        border-top: 1px solid #dee2e6;
        background: #f8fafc;
        padding: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .suggestion-chip {
        border: 1px solid #dee2e6;
        background: #ffffff;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
      }

      .suggestion-chip:hover {
        border-color: #0f172a;
        color: #0f172a;
        background: #f8fafc;
      }

      @media (max-width: 520px) {
        .chat-toggle {
          bottom: 82px;
          right: 10px;
          padding: 9px 12px;
          font-size: 12px;
        }

        .chat-panel {
          right: 10px;
          bottom: 132px;
          width: calc(100vw - 20px);
          height: min(62vh, 520px);
        }
      }
    `
  ]
})
export class ChatbotComponent implements OnDestroy {
  isOpen = false;
  question = '';
  isThinking = false;
  isTyping = false;
  readonly quickPrompts = [
    'How to book?',
    'Pickup service help',
    'Women safety mode',
    'Referral cashback',
    'Insurance enable',
    'OTP issue'
  ];

  private readonly intents: ChatIntent[] = [
    {
      keywords: ['register', 'signup', 'sign up', 'create account'],
      answer: 'Open Register, fill your details, then login and verify OTP. After first successful verification, your account is ready for booking.'
    },
    {
      keywords: ['login', 'password', 'cannot login', 'sign in'],
      answer: 'Use your username and password on Login. If login starts, verify email OTP and mobile OTP. Check spam folder if email OTP is delayed.'
    },
    {
      keywords: ['otp', 'verification code', 'not received otp', 'code not received'],
      answer: 'OTP is sent to your registered email and mobile. For ride start, enter booking OTP on Tracking. Ensure mobile/email are correct in your account.'
    },
    {
      keywords: ['book', 'booking', 'book delivery', 'new order'],
      answer: 'Go to Booking, choose service type, set pickup/drop, select vehicle and captain, then confirm Book Now. You can also schedule for later.'
    },
    {
      keywords: ['food', 'hotel', 'restaurant'],
      answer: 'In Food Delivery mode, nearby hotels are shown based on your pickup location with live refresh. Use Veg/Non-Veg filters for faster selection.'
    },
    {
      keywords: ['pickup service', 'pickup item', 'shop pickup'],
      answer: 'Use Pickup Service from Services page. Add shop name, contact, item details, and pickup instructions. The app sends this in ride notes.'
    },
    {
      keywords: ['women safety', 'safety mode', 'safe ride'],
      answer: 'Enable Women Safety Protection mode in Booking. It prioritizes top-ranked captains and keeps the preference for your next login.'
    },
    {
      keywords: ['teen', 'teenage', 'school ride', 'student ride'],
      answer: 'Enable Teenage Ride mode for stricter ride preference. Lunch Box mode is also available for school deliveries with student and guardian details.'
    },
    {
      keywords: ['insurance', 'rider insurance', 'coverage'],
      answer: 'Open Account and enable Rider Insurance. Insurance and status are server-driven and synced from backend account features.'
    },
    {
      keywords: ['referral', 'refer', 'cashback', 'invite friend'],
      answer: 'Open Account to view referral code, share it, and track cashback wallet updates. Referral values are loaded from backend APIs.'
    },
    {
      keywords: ['sync now', 'sync', 'refresh account'],
      answer: 'Use Sync Now in Account to retry backend sync instantly for referral and insurance status updates.'
    },
    {
      keywords: ['payment', 'upi', 'card', 'cash', 'wallet'],
      answer: 'Supported payment options are Cash, Card, UPI, and Wallet. Choose payment method in the Booking screen before confirming.'
    },
    {
      keywords: ['captain', 'driver', 'nearby captain'],
      answer: 'Booking shows nearby captains by selected vehicle with ETA, distance, rating, and live map positions. You can refresh and select preferred captain.'
    },
    {
      keywords: ['tracking', 'track', 'live map', 'location'],
      answer: 'Use Activity or booking history actions to open ride tracking and see live captain movement, trip progress, and OTP/start flow updates.'
    },
    {
      keywords: ['rebook', 'history', 'completed', 'pending'],
      answer: 'Booking history supports filters and one-click Re-book. You can check completed/pending items and reuse previous ride details quickly.'
    },
    {
      keywords: ['services', 'what services', 'available services'],
      answer: 'Available services include Food, Parcel, Grocery, Medicine, Documents, Pickup Service, Women Safety mode, and teen/school focused modes.'
    }
  ];

  messages: ChatMessage[] = [
    { from: 'bot', text: 'Hi, I am Ekart Support. Ask me about booking, food hotels, pickup service, OTP, referral, insurance, safety modes, and payments.' }
  ];

  private thinkingTimeout: ReturnType<typeof setTimeout> | null = null;
  private typingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private languageService: LanguageService) {}

  t(key: string): string {
    return this.languageService.t(key);
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.scrollChatToBottom();
    }
  }

  ask(prefilled?: string): void {
    if (this.isThinking || this.isTyping) {
      return;
    }

    const input = (prefilled || this.question).trim();
    if (!input) {
      return;
    }

    this.messages.push({ from: 'user', text: input });
    this.question = '';
    this.scrollChatToBottom();

    const reply = this.answer(input);
    this.isThinking = true;
    const thinkingDelayMs = 450 + Math.min(1200, input.length * 18);

    this.thinkingTimeout = setTimeout(() => {
      this.isThinking = false;
      this.startTypingReply(reply);
    }, thinkingDelayMs);
  }

  isTypingMessage(msg: ChatMessage, index: number): boolean {
    return this.isTyping && msg.from === 'bot' && index === this.messages.length - 1;
  }

  private answer(input: string): string {
    const normalized = this.normalize(input);
    const best = this.findBestIntent(normalized);
    if (best) {
      return best.answer;
    }

    return 'I can help with booking, food hotels, pickup service, OTP, referral, insurance, women safety mode, teen mode, captain selection, payment, and history. Please type a keyword like booking, pickup, referral, or insurance.';
  }

  private findBestIntent(normalizedInput: string): ChatIntent | null {
    let bestIntent: ChatIntent | null = null;
    let bestScore = 0;

    for (const intent of this.intents) {
      let score = 0;

      for (const keyword of intent.keywords) {
        const normalizedKeyword = this.normalize(keyword);
        if (!normalizedKeyword) {
          continue;
        }

        if (normalizedInput.includes(normalizedKeyword)) {
          score += normalizedKeyword.split(' ').length;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    return bestScore > 0 ? bestIntent : null;
  }

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private startTypingReply(reply: string): void {
    this.clearTypingInterval();

    this.isTyping = true;
    this.messages.push({ from: 'bot', text: '' });
    const messageIndex = this.messages.length - 1;
    this.scrollChatToBottom();

    let cursor = 0;
    const speedMs = 14;
    this.typingInterval = setInterval(() => {
      cursor += 1;
      this.messages[messageIndex].text = reply.slice(0, cursor);

      if (cursor % 8 === 0 || cursor >= reply.length) {
        this.scrollChatToBottom();
      }

      if (cursor >= reply.length) {
        this.isTyping = false;
        this.clearTypingInterval();
      }
    }, speedMs);
  }

  private clearTypingInterval(): void {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const body = document.querySelector('.chat-body') as HTMLElement | null;
      if (!body) {
        return;
      }
      body.scrollTop = body.scrollHeight;
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.thinkingTimeout) {
      clearTimeout(this.thinkingTimeout);
      this.thinkingTimeout = null;
    }
    this.clearTypingInterval();
  }
}
