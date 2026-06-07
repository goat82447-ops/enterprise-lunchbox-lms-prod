import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="about-page">
      <div class="container py-4 py-md-5">
        <div class="about-shell">
          <span class="tag">{{ t('aboutTag') }}</span>
          <h1>{{ t('aboutTitle') }}</h1>
          <h2 class="about-headline">{{ t('aboutHeadline') }}</h2>
          <p>
            {{ t('aboutIntro') }}
          </p>

          <div class="about-symbol-grid">
            <article class="about-symbol-card">
              <span class="symbol-avatar" aria-hidden="true">🚚</span>
              <div>
                <h4>{{ t('aboutBadge1Title') }}</h4>
                <p>{{ t('aboutBadge1Body') }}</p>
              </div>
            </article>
            <article class="about-symbol-card">
              <span class="symbol-avatar" aria-hidden="true">📍</span>
              <div>
                <h4>{{ t('aboutBadge2Title') }}</h4>
                <p>{{ t('aboutBadge2Body') }}</p>
              </div>
            </article>
            <article class="about-symbol-card">
              <span class="symbol-avatar" aria-hidden="true">🤝</span>
              <div>
                <h4>{{ t('aboutBadge3Title') }}</h4>
                <p>{{ t('aboutBadge3Body') }}</p>
              </div>
            </article>
          </div>

          <p class="about-story">{{ t('aboutStory') }}</p>
          <p class="about-story">{{ t('aboutStory2') }}</p>

          <div class="about-grid">
            <article>
              <h3>{{ t('aboutMissionTitle') }}</h3>
              <p>{{ t('aboutMissionBody') }}</p>
            </article>
            <article>
              <h3>{{ t('aboutOfferTitle') }}</h3>
              <p>{{ t('aboutOfferBody') }}</p>
            </article>
            <article>
              <h3>{{ t('aboutPromiseTitle') }}</h3>
              <p>{{ t('aboutPromiseBody') }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .about-page {
        min-height: calc(100vh - 64px);
        background: linear-gradient(165deg, #f3f7ff 0%, #ffffff 46%, #fdf5f7 100%);
      }

      .about-shell {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        padding: 24px;
      }

      .tag {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid #fda4af;
        background: #fff1f2;
        color: #be123c;
        padding: 4px 10px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
      }

      h1 {
        margin-top: 10px;
        margin-bottom: 8px;
      }

      .about-headline {
        margin-bottom: 10px;
        font-size: 1.25rem;
        color: #0f172a;
      }

      .about-symbol-grid {
        margin: 14px 0 16px;
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .about-symbol-card {
        border: 1px solid #dbeafe;
        border-radius: 14px;
        padding: 10px;
        background: #f8fbff;
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 10px;
        align-items: center;
      }

      .symbol-avatar {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        background: #dbeafe;
        border: 1px solid #93c5fd;
      }

      .about-symbol-card h4 {
        margin: 0 0 4px;
        font-size: 0.92rem;
      }

      .about-symbol-card p {
        margin: 0;
        font-size: 0.82rem;
        color: #475569;
      }

      .about-story {
        color: #374151;
        margin-bottom: 10px;
      }

      .about-grid {
        margin-top: 18px;
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      article {
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 14px;
        background: #fafafa;
      }

      article h3 {
        font-size: 1.06rem;
        margin-bottom: 6px;
      }

      article p {
        margin: 0;
        color: #4b5563;
      }

      @media (max-width: 900px) {
        .about-symbol-grid {
          grid-template-columns: 1fr;
        }

        .about-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class AboutUsComponent {
  constructor(private languageService: LanguageService) {}

  t(key: string): string {
    return this.languageService.t(key);
  }
}
