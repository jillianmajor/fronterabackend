import { SendEmailCommand, SendRawEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainErrors } from '../../common/errors/domain-errors';
import { TOKENS } from '../../config/tokens';
import type { IAwsSesGateway, SendEmailParams, SendRawEmailParams } from './ses.interface';

@Injectable()
export class SesGateway implements IAwsSesGateway {
  private readonly client: SESClient;

  constructor(
    private readonly config: ConfigService,
    @Inject(TOKENS.SesGatewayLogger) private readonly logger: Logger,
  ) {
    const region = this.config.get<string>('FRONTERA_AWS_REGION') ?? 'us-east-1';
    this.client = new SESClient({ region });
  }

  /**
   * Simple transactional email (invites, notifications).
   * Requires SES_FROM_EMAIL verified in the same region as FRONTERA_AWS_REGION.
   */
  async sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
    const from = this.requireFromAddress();
    const configurationSetName = this.config.get<string>('SES_CONFIGURATION_SET');

    const command = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: params.to },
      ReplyToAddresses: params.replyTo,
      ConfigurationSetName: configurationSetName || undefined,
      Message: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          ...(params.htmlBody ? { Html: { Data: params.htmlBody, Charset: 'UTF-8' } } : {}),
          ...(params.textBody ? { Text: { Data: params.textBody, Charset: 'UTF-8' } } : {}),
        },
      },
    });

    const result = await this.client.send(command);
    const messageId = result.MessageId ?? '';
    this.logger.log(`SES sendEmail message Id=${messageId} to=${params.to.join(',')}`);
    return { messageId };
  }

  /**
   * MIME message with attachments — liaison PACR emails (Q3).
   */
  async sendRawEmail(params: SendRawEmailParams): Promise<{ messageId: string }> {
    this.requireFromAddress();
    const configurationSetName = this.config.get<string>('SES_CONFIGURATION_SET');

    const command = new SendRawEmailCommand({
      RawMessage: { Data: params.rawMessage },
      ConfigurationSetName: configurationSetName || undefined,
    });

    const result = await this.client.send(command);
    const messageId = result.MessageId ?? '';
    this.logger.log(`SES sendRawEmail messageId=${messageId}`);
    return { messageId };
  }

  private requireFromAddress(): string {
    const from = this.config.get<string>('SES_FROM_EMAIL')?.trim();
    if (!from) {
      throw DomainErrors.sesFromEmailRequired();
    }
    return from;
  }
}
