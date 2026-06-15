import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkProviderResultDto {
  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['created', 'failed', 'skipped'] })
  status!: 'created' | 'failed' | 'skipped';

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  profileId?: string;

  @ApiPropertyOptional()
  inviteId?: string;

  @ApiPropertyOptional()
  inviteSent?: boolean;

  @ApiPropertyOptional()
  inviteEmailMessageId?: string;

  @ApiPropertyOptional()
  inviteError?: string;

  @ApiPropertyOptional()
  error?: string;
}

export class BulkCreateProvidersResponseDto {
  @ApiProperty({ type: [BulkProviderResultDto] })
  results!: BulkProviderResultDto[];

  @ApiProperty()
  createdCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty()
  skippedCount!: number;
}
