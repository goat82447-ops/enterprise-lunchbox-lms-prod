import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="contact-page">
      <div class="container py-4 py-md-5">
        <div class="contact-shell">
          <span class="tag">{{ t('contactTag') }}</span>
          <h1>{{ t('contactTitle') }}</h1>
          <p class="lead-copy">{{ t('contactIntro') }}</p>

          <div class="contact-card">
            <div class="label">{{ t('supportEmailLabel') }}</div>
            <a class="mail-link" href="mailto:goat82447@gmail.com">goat82447@gmail.com</a>
            <div class="label mt-3">{{ t('supportPhoneLabel') }}</div>
            <a class="mail-link" href="tel:8985837483">8985837483</a>
          </div>

          <div class="contact-grid">
            <div>
              <h3>{{ t('supportHoursTitle') }}</h3>
              <p>{{ t('supportHoursBody') }}</p>
            </div>
            <div>
              <h3>{{ t('responseTimeTitle') }}</h3>
              <p>{{ t('responseTimeBody') }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .contact-page {
        min-height: calc(100vh - 64px);
        background: radial-gradient(circle at 10% 10%, #e0f2fe 0%, transparent 34%),
          radial-gradient(circle at 90% 0%, #ffe4e6 0%, transparent 30%),
          #ffffff;
      }

      .contact-shell {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        padding: 24px;
      }

      .tag {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid #93c5fd;
        background: #eff6ff;
        color: #1d4ed8;
        padding: 4px 10px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
      }

      .lead-copy {
        color: #4b5563;
        margin-bottom: 14px;
      }

      .contact-card {
        border: 1px solid #fda4af;
        border-radius: 14px;
        background: #fff1f2;
        padding: 14px;
        margin-bottom: 16px;
      }

      .label {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #9f1239;
        font-weight: 700;
      }

      .mail-link {
        font-size: 1.06rem;
        font-weight: 700;
        color: #be123c;
        text-decoration: none;
      }

      .mail-link:hover {
        text-decoration: underline;
      }

      .contact-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .contact-grid > div {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        background: #f9fafb;
      }

      .contact-grid h3 {
        font-size: 1rem;
        margin-bottom: 4px;
      }

      .contact-grid p {
        margin: 0;
        color: #4b5563;
      }

      @media (max-width: 900px) {
        .contact-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class ContactComponent {
  constructor(private languageService: LanguageService) {}

  t(key: string): string {
    return this.languageService.t(key);
  }
}
