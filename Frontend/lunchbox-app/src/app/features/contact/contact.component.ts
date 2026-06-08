import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupportService } from '../../core/services/support.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

          <div class="report-card mt-3">
            <h3 class="mb-2">Complaint / Bug Report</h3>
            <p class="text-muted small mb-3">Describe the issue and click Save. Your mail app opens with details prefilled.</p>
            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label small mb-1">Type</label>
                <select class="form-select" [(ngModel)]="reportType">
                  <option value="Complaint">Complaint</option>
                  <option value="Bug">Bug</option>
                  <option value="Suggestion">Suggestion</option>
                </select>
              </div>
              <div class="col-md-8">
                <label class="form-label small mb-1">Subject</label>
                <input class="form-control" placeholder="Short subject" [(ngModel)]="reportSubject" />
              </div>
              <div class="col-md-6">
                <label class="form-label small mb-1">Your Name</label>
                <input class="form-control" placeholder="Name" [(ngModel)]="reportName" />
              </div>
              <div class="col-md-6">
                <label class="form-label small mb-1">Email / Phone</label>
                <input class="form-control" placeholder="Email or phone" [(ngModel)]="reportContact" />
              </div>
              <div class="col-12">
                <label class="form-label small mb-1">Description</label>
                <textarea class="form-control" rows="4" placeholder="Explain complaint, bug steps, and expected behavior" [(ngModel)]="reportDescription"></textarea>
              </div>
              <div class="col-12 d-flex gap-2 flex-wrap">
                <button class="btn btn-danger" type="button" [disabled]="isSubmittingReport" (click)="submitReport()">
                  {{ isSubmittingReport ? 'Saving...' : 'Save' }}
                </button>
                <button class="btn btn-outline-secondary" type="button" (click)="resetReportForm()">Clear</button>
              </div>
              <div class="col-12" *ngIf="reportValidationError">
                <div class="small text-danger">{{ reportValidationError }}</div>
              </div>
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

      .report-card {
        border: 1px solid #fecdd3;
        border-radius: 14px;
        background: #fff7ed;
        padding: 14px;
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
  reportType: 'Complaint' | 'Bug' | 'Suggestion' = 'Complaint';
  reportSubject = '';
  reportName = '';
  reportContact = '';
  reportDescription = '';
  reportValidationError = '';
  isSubmittingReport = false;

  constructor(
    private languageService: LanguageService,
    private notificationService: NotificationService,
    private supportService: SupportService
  ) {}

  t(key: string): string {
    return this.languageService.t(key);
  }

  submitReport(): void {
    const subject = (this.reportSubject || '').trim();
    const description = (this.reportDescription || '').trim();

    if (!subject || !description) {
      this.reportValidationError = 'Please enter subject and description.';
      return;
    }

    this.reportValidationError = '';
    this.isSubmittingReport = true;

    this.supportService.submitComplaint({
      type: this.reportType,
      subject,
      name: (this.reportName || '').trim() || undefined,
      contact: (this.reportContact || '').trim() || undefined,
      description
    }).subscribe({
      next: () => {
        this.notificationService.push('Complaint/Bug submitted successfully.', 'success');
        this.resetReportForm();
        this.isSubmittingReport = false;
      },
      error: (error) => {
        this.notificationService.push(error?.error?.error || 'Failed to submit complaint. Please try again.', 'error');
        this.isSubmittingReport = false;
      }
    });
  }

  resetReportForm(): void {
    this.reportType = 'Complaint';
    this.reportSubject = '';
    this.reportName = '';
    this.reportContact = '';
    this.reportDescription = '';
    this.reportValidationError = '';
  }
}
