import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOKENS } from '../config/tokens';
import type { IAwsSesGateway } from '../repository/aws/ses.interface';
import type {
  INotificationsRepository,
  ScheduleChangeRequestRow,
} from '../repository/persistence/interface';
import {
  buildLiaisonSubmissionNotification,
  buildProviderDecisionNotification,
  buildReviewerDecisionNotification,
} from './notification-copy.util';

export interface WorkflowNotificationResult {
  inAppCreated: boolean;
  inAppId?: string;
  inAppError?: string;
  emailSent: boolean;
  messageId?: string;
  emailError?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(TOKENS.NotificationsRepository)
    private readonly notificationsRepo: INotificationsRepository,
    @Inject(TOKENS.SesGateway)
    private readonly sesGateway: IAwsSesGateway,
    private readonly config: ConfigService,
  ) {}

  /**
   * Provider schedule change approved/denied — in-app bell + email.
   */
  async notifyProviderScheduleDecision(
    row: ScheduleChangeRequestRow,
    decision: 'approved' | 'denied',
    reviewNotes?: string,
  ): Promise<WorkflowNotificationResult> {
    const copy = buildProviderDecisionNotification(row, decision, reviewNotes);

    const inApp = await this.createInApp({
      userId: row.providerUserId,
      type: `schedule_change_${decision}`,
      title: copy.title,
      message: copy.message,
      link: copy.link,
    });

    const email = await this.sendProviderScheduleEmail(row, decision, reviewNotes);

    return {
      inAppCreated: inApp.created,
      inAppId: inApp.id,
      inAppError: inApp.error,
      emailSent: email.sent,
      messageId: email.messageId,
      emailError: email.error,
    };
  }

  /**
   * Liaison alert when a provider submits availability or time-off — in-app only.
   */
  async notifyLiaisonSubmission(params: {
    liaisonUserId: string;
    providerName: string;
    monthYear: string;
    dayCount: number;
    noChanges: boolean;
    scheduleType: 'prn' | 'set';
  }): Promise<{ inAppCreated: boolean; inAppId?: string; inAppError?: string }> {
    const copy = buildLiaisonSubmissionNotification(params);

    const inApp = await this.createInApp({
      userId: params.liaisonUserId,
      type: 'submission_pending_review',
      title: copy.title,
      message: copy.message,
      link: copy.link,
    });

    return {
      inAppCreated: inApp.created,
      inAppId: inApp.id,
      inAppError: inApp.error,
    };
  }

  /**
   * Confirmation for the reviewer (admin/liaison) after approve/deny — in-app only.
   */
  async notifyReviewerScheduleDecision(
    row: ScheduleChangeRequestRow,
    decision: 'approved' | 'denied',
    reviewerUserId: string,
    reviewNotes?: string,
  ): Promise<{ inAppCreated: boolean; inAppId?: string; inAppError?: string }> {
    const copy = buildReviewerDecisionNotification(row, decision, reviewNotes);

    const inApp = await this.createInApp({
      userId: reviewerUserId,
      type: `reviewer_schedule_change_${decision}`,
      title: copy.title,
      message: copy.message,
      link: copy.link,
    });

    return {
      inAppCreated: inApp.created,
      inAppId: inApp.id,
      inAppError: inApp.error,
    };
  }

  /**
   * Provider + reviewer in-app (and provider email) after a schedule change decision.
   */
  async notifyScheduleChangeDecision(
    row: ScheduleChangeRequestRow,
    decision: 'approved' | 'denied',
    options?: { reviewedBy?: string; reviewNotes?: string },
  ): Promise<WorkflowNotificationResult & { reviewerInAppCreated?: boolean }> {
    const provider = await this.notifyProviderScheduleDecision(
      row,
      decision,
      options?.reviewNotes,
    );

    let reviewerInAppCreated = false;
    const reviewerId = options?.reviewedBy?.trim();
    if (reviewerId) {
      const reviewer = await this.notifyReviewerScheduleDecision(
        row,
        decision,
        reviewerId,
        options?.reviewNotes,
      );
      reviewerInAppCreated = reviewer.inAppCreated;
    } else {
      this.logger.warn(
        `Skipping reviewer notification for request ${row.requestId}: no reviewer user id`,
      );
    }

    return { ...provider, reviewerInAppCreated };
  }

  private async createInApp(input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string;
  }): Promise<{ created: boolean; id?: string; error?: string }> {
    if (!input.userId?.trim()) {
      return { created: false, error: 'Missing recipient user id' };
    }
    try {
      const row = await this.notificationsRepo.insert({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      });
      return { created: true, id: row.id };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create in-app notification';
      this.logger.warn(`In-app notification failed for user ${input.userId}: ${error}`);
      return { created: false, error };
    }
  }

  private async sendProviderScheduleEmail(
    row: ScheduleChangeRequestRow,
    decision: 'approved' | 'denied',
    reviewNotes?: string,
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const email = row.providerEmail?.trim();
    if (!email) {
      return { sent: false, error: 'Provider has no email on file' };
    }

    try {
      const copy = buildProviderDecisionNotification(row, decision, reviewNotes);
      const portalLink = this.portalUrl(copy.link);
      const linkPart = portalLink ? `\n\nView in portal: ${portalLink}` : '';

      const subject = copy.title;
      const textBody = copy.message + linkPart;
      const htmlBody =
        copy.message
          .split('\n')
          .map((line) => `<p>${line}</p>`)
          .join('') +
        (portalLink ? `<p><a href="${portalLink}">Open in portal</a></p>` : '');

      const result = await this.sesGateway.sendEmail({
        to: [email],
        subject,
        textBody,
        htmlBody,
      });
      return { sent: true, messageId: result.messageId };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to send email';
      this.logger.warn(`Provider email failed for ${row.requestId}: ${error}`);
      return { sent: false, error };
    }
  }

  private portalUrl(path: string): string | undefined {
    const base = this.config.get<string>('FRONTERA_APP_URL')?.replace(/\/$/, '');
    if (!base) return undefined;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
