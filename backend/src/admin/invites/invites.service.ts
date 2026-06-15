import { Inject, Injectable } from '@nestjs/common';
import { join } from 'node:path';
import type { IAppConfig } from '../../config/app-config.interface';
import {
  escapeHtml,
  loadTemplateFile,
  renderTemplate,
} from '../../common/email/email-template.util';
import { AppErrors } from '../../common/errors/app-errors';
import { rethrowAsHttp } from '../../common/errors/to-http.exception';
import { TOKENS } from '../../config/tokens';
import type { IOnboardingRepository, ProviderInviteByToken } from '../../repository/persistence/interface';
import {
  buildPostInviteRedirectUrl,
  resolveProviderPortalUrl,
} from '../onboarding-public-url.util';
import type { IInvitesService, ProviderInviteEmailContent } from './invites.interface';

/** Minimum password length enforced before `auth.users` is updated. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Provider invite flow — SES email templates, accept-invite HTML, and activation.
 *
 * Flow:
 * 1. Onboard → `renderProviderInvite` → SES email with accept link
 * 2. Email link → `GET /accept-invite?token=…` → render form
 * 3. `POST /accept-invite` → validate → bcrypt password → set `used_at`
 * 4. Redirect to `FRONTERA_APP_URL?activated=1`
 */
@Injectable()
export class InvitesService implements IInvitesService {
  /** `templates/` sits beside compiled JS in `dist/admin/invites/`. */
  private readonly templatesDir = join(__dirname, 'templates');

  constructor(
    @Inject(TOKENS.OnboardingRepository)
    private readonly onboardingRepository: IOnboardingRepository,
    @Inject(TOKENS.AppConfig)
    private readonly config: IAppConfig,
  ) {}

  /**
   * Renders the SES provider invite email from `templates/provider-invite.email.*`.
   *
   * Called by `OnboardingService` after `POST /admin/onboarding` when `sendInvite` is true.
   * `acceptUrl` must point at `GET /accept-invite?token=…` on the API public host.
   *
   * @param params.firstName  Greeting name — first token of invite `full_name`
   * @param params.acceptUrl  Absolute accept-invite URL (includes encoded token query param)
   * @returns                 Subject plus HTML and plain-text bodies for `SesGateway`
   */
  renderProviderInvite(params: {
    firstName: string;
    acceptUrl: string;
  }): ProviderInviteEmailContent {
    const year = String(new Date().getFullYear());
    const htmlTemplate = loadTemplateFile(this.templatesDir, 'provider-invite.email.html');
    const textTemplate = loadTemplateFile(this.templatesDir, 'provider-invite.email.txt');

    const htmlBody = renderTemplate(htmlTemplate, {
      firstName: escapeHtml(params.firstName),
      acceptUrl: params.acceptUrl,
      year,
    });

    const textBody = renderTemplate(textTemplate, {
      firstName: params.firstName,
      acceptUrl: params.acceptUrl,
      year,
    });

    return {
      subject: 'Set up your Frontera provider account',
      htmlBody,
      textBody,
    };
  }

  /**
   * Build HTML for `GET /accept-invite` or re-render after a failed `POST`.
   *
   * Uses a lenient invite check (`loadValidInviteForForm`) — invalid tokens get
   * the error page instead of throwing, so the user sees a friendly message.
   *
   * @param token         Invite token from query string or hidden form field
   * @param errorMessage  Optional validation error from `activateFromForm` (POST failure)
   * @returns             Full HTML document — password form or standalone error page
   */
  async renderInvitePage(token: string | undefined, errorMessage?: string): Promise<string> {
    if (errorMessage) {
      const invite = await this.loadValidInviteForForm(token);
      if (invite) {
        const firstName = invite.fullName?.split(/\s+/)[0] ?? 'there';
        return this.renderForm({
          token: invite.token,
          email: invite.email,
          firstName,
          formAction: this.buildFormActionUrl(),
          errorMessage,
        });
      }
    }

    if (!token?.trim()) {
      return this.renderError(
        'This link is missing its security token. Use the full "Set up your account" button or URL from your invite email, or ask your recruiter to resend.',
      );
    }

    const invite = await this.loadValidInviteForForm(token);
    if (!invite) {
      return this.renderError(
        'This invite link is invalid, expired, or already used. Ask your recruiter to send a new invite.',
      );
    }

    const firstName = invite.fullName?.split(/\s+/)[0] ?? 'there';
    return this.renderForm({
      token: invite.token,
      email: invite.email,
      firstName,
      formAction: this.buildFormActionUrl(),
      errorMessage,
    });
  }

  /**
   * Validate form body, activate the provider, and return the post-success redirect.
   *
   * Persists bcrypt password on `auth.users`, sets `provider_invites.used_at`, then
   * returns `FRONTERA_APP_URL?activated=1` for the controller 302 redirect.
   *
   * @param body.token            Hidden invite token from the HTML form
   * @param body.password         New portal password (min 8 characters)
   * @param body.confirmPassword  Must match `password`
   * @returns                     `{ redirectUrl }` — absolute portal URL or `/`
   * @throws `AppErrors.*`        Missing token, weak password, mismatch, or bad invite
   * @throws via `rethrowAsHttp`  Repository / DB activation failure
   */
  async activateFromForm(body: {
    token?: string;
    password?: string;
    confirmPassword?: string;
  }): Promise<{ redirectUrl: string }> {
    const token = body.token?.trim();
    const password = body.password ?? '';
    const confirmPassword = body.confirmPassword ?? '';

    if (!token) {
      throw AppErrors.missingInviteToken();
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw AppErrors.passwordTooShort(MIN_PASSWORD_LENGTH);
    }
    if (password !== confirmPassword) {
      throw AppErrors.passwordsMismatch();
    }

    const invite = await this.requireActivatableInvite(token);

    try {
      await this.onboardingRepository.activateProviderInvite(
        invite.inviteId,
        invite.providerUserId,
        invite.email,
        password,
      );
    } catch (err) {
      rethrowAsHttp(err);
    }

    const redirectUrl = buildPostInviteRedirectUrl(resolveProviderPortalUrl(this.config));
    return { redirectUrl };
  }

  // ---------------------------------------------------------------------------
  // HTML rendering
  // ---------------------------------------------------------------------------

  /**
   * POST target for the accept-invite HTML form.
   *
   * Relative URL keeps the form on the same host that served `GET /accept-invite`.
   *
   * @returns Form `action` attribute value (`/accept-invite`)
   */
  private buildFormActionUrl(): string {
    return '/accept-invite';
  }

  /**
   * Password-setup page shown at `GET /accept-invite?token=…`.
   *
   * Loads `accept-invite.page.html` and substitutes placeholders. User-facing
   * strings are escaped to prevent XSS when re-rendering after a failed POST.
   *
   * @param params.token        Invite token (hidden field)
   * @param params.email        Read-only email from `provider_invites`
   * @param params.firstName    Greeting name
   * @param params.formAction   Form POST URL (`buildFormActionUrl()`)
   * @param params.errorMessage Optional validation error block above the form
   * @returns                   Full HTML document string
   */
  private renderForm(params: {
    token: string;
    email: string;
    firstName: string;
    formAction: string;
    errorMessage?: string;
  }): string {
    const template = loadTemplateFile(this.templatesDir, 'accept-invite.page.html');

    const errorBlock = params.errorMessage
      ? `<div class="error">${escapeHtml(params.errorMessage)}</div>`
      : '';

    return renderTemplate(template, {
      firstName: escapeHtml(params.firstName),
      email: escapeHtml(params.email),
      token: escapeHtml(params.token),
      formAction: params.formAction,
      errorBlock,
    });
  }

  /**
   * Standalone error page when the invite link is missing, invalid, expired, or already used.
   *
   * @param message User-facing explanation (static copy or safe server message)
   * @returns       Full HTML document from `accept-invite-error.page.html`
   */
  private renderError(message: string): string {
    const template = loadTemplateFile(this.templatesDir, 'accept-invite-error.page.html');
    return renderTemplate(template, {
      message: escapeHtml(message),
    });
  }

  // ---------------------------------------------------------------------------
  // Invite validation
  // ---------------------------------------------------------------------------

  /**
   * Soft validation for rendering the form — returns `null` instead of throwing.
   *
   * Rejects missing, unknown, already-used, or expired tokens so `renderInvitePage`
   * can show a friendly error page rather than an HTTP error envelope.
   *
   * @param token Invite token from query string or form body
   * @returns     Invite row plus `providerUserId`, or `null` when not renderable
   */
  private async loadValidInviteForForm(
    token: string | undefined,
  ): Promise<ProviderInviteByToken | null> {
    if (!token?.trim()) return null;

    const invite = await this.onboardingRepository.findInviteByToken(token);
    if (!invite) return null;
    if (invite.usedAt) return null;
    if (invite.expiresAt.getTime() < Date.now()) return null;

    return invite;
  }

  /**
   * Strict validation before activation — throws `AppErrors` with specific codes.
   *
   * Used on `POST /accept-invite` only; duplicates expiry/used checks so race
   * conditions after GET still fail with a clear error re-rendered by the controller.
   *
   * @param token Trimmed invite token from the form body
   * @returns     Invite row ready for `activateProviderInvite`
   * @throws `AppErrors.invalidInviteLink` | `inviteAlreadyUsed` | `inviteExpired`
   */
  private async requireActivatableInvite(token: string): Promise<ProviderInviteByToken> {
    const invite = await this.onboardingRepository.findInviteByToken(token);
    if (!invite) {
      throw AppErrors.invalidInviteLink();
    }
    if (invite.usedAt) {
      throw AppErrors.inviteAlreadyUsed();
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw AppErrors.inviteExpired();
    }
    return invite;
  }
}
