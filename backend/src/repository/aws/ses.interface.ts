export interface SendEmailParams {
  to: string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string[];
}

/** Raw MIME email (e.g. PACR PDF attachment on liaison notify). */
export interface SendRawEmailParams {
  rawMessage: Uint8Array;
}

export interface IAwsSesGateway {
  sendEmail(params: SendEmailParams): Promise<{ messageId: string }>;
  sendRawEmail(params: SendRawEmailParams): Promise<{ messageId: string }>;
}
