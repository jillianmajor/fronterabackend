export interface ProviderInviteEmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/** Contract for provider invites — SES email, accept-invite HTML, and activation. */
export interface IInvitesService {
  /** SES invite email from `invites/templates/provider-invite.email.*`. */
  renderProviderInvite(params: {
    firstName: string;
    acceptUrl: string;
  }): ProviderInviteEmailContent;

  /** HTML for `GET /accept-invite` or re-render after a failed `POST`. */
  renderInvitePage(token: string | undefined, errorMessage?: string): Promise<string>;

  /** Validate form, activate provider, return post-success redirect URL. */
  activateFromForm(body: {
    token?: string;
    password?: string;
    confirmPassword?: string;
  }): Promise<{ redirectUrl: string }>;
}
