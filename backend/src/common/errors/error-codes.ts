/**
 * Stable API error codes — use in clients, logs, and monitoring.
 *
 * The string value is the contract; user-facing `message` copy may change.
 * Pair with `AppErrors` / `DomainErrors` factories — do not throw raw strings.
 */
export enum ErrorCode {
  // ---------------------------------------------------------------------------
  // Authentication & authorization
  // ---------------------------------------------------------------------------

  /** Missing, invalid, or expired Bearer token. */
  UNAUTHORIZED = 'UNAUTHORIZED',

  /** Authenticated user lacks a required `user_roles` role for the route. */
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',

  /** Provider route `providerId` does not match the authenticated user. */
  PROVIDER_ACCESS_DENIED = 'PROVIDER_ACCESS_DENIED',

  // ---------------------------------------------------------------------------
  // Provider access
  // ---------------------------------------------------------------------------

  /** `profiles.user_id` does not exist. */
  PROVIDER_PROFILE_NOT_FOUND = 'PROVIDER_PROFILE_NOT_FOUND',

  /** User lacks the `provider_user` role. */
  NOT_PROVIDER_USER = 'NOT_PROVIDER_USER',

  /** Provider `schedule_type` is not `prn`. */
  PROVIDER_NOT_PRN = 'PROVIDER_NOT_PRN',

  /** Provider `schedule_type` is not `set`. */
  PROVIDER_NOT_SET = 'PROVIDER_NOT_SET',

  // ---------------------------------------------------------------------------
  // Onboarding — POST /admin/onboarding
  // ---------------------------------------------------------------------------

  /** `workSites` must contain exactly one `isPrimary: true` entry. */
  PRIMARY_WORK_SITE_REQUIRED = 'PRIMARY_WORK_SITE_REQUIRED',

  /** `specialty` not in the onboarding catalog. */
  INVALID_SPECIALTY = 'INVALID_SPECIALTY',

  /** `company` not in allowed values (onboarding or admin filter). */
  INVALID_COMPANY = 'INVALID_COMPANY',

  /** Duplicate `workSiteId` in the onboarding payload. */
  DUPLICATE_WORK_SITE_ID = 'DUPLICATE_WORK_SITE_ID',

  /** Site `region` not in the onboarding regions catalog. */
  INVALID_REGION = 'INVALID_REGION',

  /** `workSiteId` missing from `work_sites`. */
  WORK_SITE_NOT_FOUND = 'WORK_SITE_NOT_FOUND',

  /** Submitted `facility` label does not match catalog for `workSiteId`. */
  FACILITY_MISMATCH = 'FACILITY_MISMATCH',

  /** Weekly schedule overlap or invalid shift times. */
  SCHEDULE_VALIDATION = 'SCHEDULE_VALIDATION',

  /** `recruiterId` does not resolve to internal staff. */
  RECRUITER_NOT_FOUND = 'RECRUITER_NOT_FOUND',

  /** `liaisonId` does not resolve to internal staff. */
  LIAISON_NOT_FOUND = 'LIAISON_NOT_FOUND',

  /** No client `organizations` row (seed not run). */
  NO_CLIENT_ORGANIZATION = 'NO_CLIENT_ORGANIZATION',

  /** Admin resend-invite: no unused `provider_invites` row. */
  NO_PENDING_INVITE = 'NO_PENDING_INVITE',

  /** Generic onboarding persistence failure. */
  ONBOARDING_FAILED = 'ONBOARDING_FAILED',

  // ---------------------------------------------------------------------------
  // Accept invite — GET/POST /accept-invite
  // ---------------------------------------------------------------------------

  /** Form submitted without a token. */
  MISSING_INVITE_TOKEN = 'MISSING_INVITE_TOKEN',

  /** Password below minimum length. */
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',

  /** `password` and `confirmPassword` do not match. */
  PASSWORDS_MISMATCH = 'PASSWORDS_MISMATCH',

  /** Token not found in `provider_invites`. */
  INVALID_INVITE_LINK = 'INVALID_INVITE_LINK',

  /** Invite `used_at` already set. */
  INVITE_ALREADY_USED = 'INVITE_ALREADY_USED',

  /** Invite `expires_at` in the past. */
  INVITE_EXPIRED = 'INVITE_EXPIRED',

  /** `auth.users` update or invite activation failed. */
  INVITE_ACTIVATION_FAILED = 'INVITE_ACTIVATION_FAILED',

  // ---------------------------------------------------------------------------
  // Provider scheduling — PRN availability calendar (ADR 0009)
  // ---------------------------------------------------------------------------

  /** `monthYear` query param missing on availability GET. */
  MONTH_YEAR_REQUIRED = 'MONTH_YEAR_REQUIRED',

  /** Submit has neither `days` nor `noChanges: true`. */
  NO_DAYS_OR_NO_CHANGES = 'NO_DAYS_OR_NO_CHANGES',

  /** Late submission missing required `pacrDocumentId`. */
  PACR_REQUIRED_AFTER_DEADLINE = 'PACR_REQUIRED_AFTER_DEADLINE',

  /** On-time submission must not include `pacrDocumentId`. */
  PACR_NOT_ALLOWED_ON_TIME = 'PACR_NOT_ALLOWED_ON_TIME',

  /** `pacrDocumentId` not found or not owned by provider. */
  PACR_DOCUMENT_NOT_FOUND = 'PACR_DOCUMENT_NOT_FOUND',

  /** Two days in one batch share the same `requestDate`. */
  DUPLICATE_REQUEST_DATE = 'DUPLICATE_REQUEST_DATE',

  /** `workSiteId` not in provider's assigned sites. */
  WORK_SITE_NOT_ASSIGNED = 'WORK_SITE_NOT_ASSIGNED',

  /** Post-deadline add_day with fewer than 14 days notice. */
  INSUFFICIENT_ADVANCE_NOTICE = 'INSUFFICIENT_ADVANCE_NOTICE',

  /** Post-deadline remove_day with fewer than 7 days notice. */
  INSUFFICIENT_REMOVE_NOTICE = 'INSUFFICIENT_REMOVE_NOTICE',

  /** SET time-off day missing required start/end times. */
  TIME_OFF_TIMES_REQUIRED = 'TIME_OFF_TIMES_REQUIRED',

  /** SET time-off changeType is not allowed. */
  INVALID_TIME_OFF_CHANGE_TYPE = 'INVALID_TIME_OFF_CHANGE_TYPE',

  /** Clock label is not valid 12h or 24h time. */
  INVALID_TIME_FORMAT = 'INVALID_TIME_FORMAT',

  /** `endTime` is not after `startTime`. */
  END_TIME_BEFORE_START = 'END_TIME_BEFORE_START',

  /** `monthYear` is not `YYYY-MM-01`. */
  MONTH_YEAR_NOT_FIRST = 'MONTH_YEAR_NOT_FIRST',

  /** `requestDate` outside the target month bounds. */
  REQUEST_DATE_OUT_OF_MONTH = 'REQUEST_DATE_OUT_OF_MONTH',

  // ---------------------------------------------------------------------------
  // Provider documents — PACR upload
  // ---------------------------------------------------------------------------

  /** Multipart upload missing file. */
  FILE_REQUIRED = 'FILE_REQUIRED',

  /** PACR PDF exceeds 10 MB. */
  PACR_FILE_TOO_LARGE = 'PACR_FILE_TOO_LARGE',

  /** Upload MIME type is not `application/pdf`. */
  PACR_MUST_BE_PDF = 'PACR_MUST_BE_PDF',

  /** Document row points at legacy Supabase Storage, not `DOCUMENTS_BUCKET`. */
  DOCUMENT_LEGACY_STORAGE = 'DOCUMENT_LEGACY_STORAGE',

  // ---------------------------------------------------------------------------
  // Schedule change approvals — admin review queue
  // ---------------------------------------------------------------------------

  /** `time_off_requests.id` not found. */
  SCHEDULE_CHANGE_NOT_FOUND = 'SCHEDULE_CHANGE_NOT_FOUND',

  /** Request has no linked `pacr_document_id`. */
  NO_PACR_ATTACHED = 'NO_PACR_ATTACHED',

  /** `documents` row missing for linked PACR. */
  PACR_RECORD_NOT_FOUND = 'PACR_RECORD_NOT_FOUND',

  /** Approve/deny target not in `pending_review` (or invalid id). */
  PENDING_SCHEDULE_CHANGE_NOT_FOUND = 'PENDING_SCHEDULE_CHANGE_NOT_FOUND',

  /** `adjustHours: true` without `startTime` / `endTime`. */
  ADJUST_HOURS_TIMES_REQUIRED = 'ADJUST_HOURS_TIMES_REQUIRED',

  /** Bulk deny missing `reviewNotes`. */
  BULK_DENY_NOTES_REQUIRED = 'BULK_DENY_NOTES_REQUIRED',

  /** Single deny missing `reviewNotes`. */
  DENY_NOTES_REQUIRED = 'DENY_NOTES_REQUIRED',

  // ---------------------------------------------------------------------------
  // Config / infrastructure
  // ---------------------------------------------------------------------------

  /** `DATABASE_URL` env var missing at bootstrap. */
  DATABASE_URL_REQUIRED = 'DATABASE_URL_REQUIRED',

  /** `SES_FROM_EMAIL` env var missing when sending mail. */
  SES_FROM_EMAIL_REQUIRED = 'SES_FROM_EMAIL_REQUIRED',

  /** Invite link base URL env vars not configured. */
  INVITE_URL_CONFIG_REQUIRED = 'INVITE_URL_CONFIG_REQUIRED',

  // ---------------------------------------------------------------------------
  // Fallback
  // ---------------------------------------------------------------------------

  /** Unhandled or unexpected server error. */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
