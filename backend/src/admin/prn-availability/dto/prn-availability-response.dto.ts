import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrnAvailabilityDayDto {
  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  providerUserId!: string;

  @ApiProperty()
  providerName!: string;

  @ApiProperty()
  requestDate!: string;

  @ApiProperty()
  changeType!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  timeLabel?: string | null;

  @ApiPropertyOptional()
  startTime?: string | null;

  @ApiPropertyOptional()
  endTime?: string | null;

  @ApiPropertyOptional()
  providerNotes?: string | null;

  @ApiPropertyOptional()
  monthlyRequestId?: string | null;

  @ApiPropertyOptional()
  monthlyStatus?: string | null;

  @ApiPropertyOptional()
  region?: string | null;

  @ApiPropertyOptional()
  hasPacr?: boolean;

  @ApiPropertyOptional()
  pacrDocumentId?: string | null;
}

export class PrnAvailabilityQueueGroupDto {
  @ApiPropertyOptional()
  monthlyRequestId?: string | null;

  @ApiProperty()
  providerUserId!: string;

  @ApiProperty()
  providerName!: string;

  @ApiPropertyOptional()
  liaisonName?: string | null;

  @ApiProperty()
  monthYear!: string;

  @ApiProperty()
  monthLabel!: string;

  @ApiProperty({ enum: ['requested', 'submitted', 'approved', 'denied'] })
  monthlyStatus!: string;

  @ApiPropertyOptional()
  deadline?: string | null;

  @ApiPropertyOptional()
  submittedAt?: string | null;

  @ApiProperty()
  noChanges!: boolean;

  @ApiProperty()
  dayCount!: number;

  @ApiProperty()
  pendingDayCount!: number;

  @ApiProperty({ type: [PrnAvailabilityDayDto] })
  days!: PrnAvailabilityDayDto[];
}

export class PrnAvailabilityQueueResponseDto {
  @ApiProperty()
  company!: string;

  @ApiProperty({ description: 'Monthly submissions with status submitted' })
  pendingCount!: number;

  @ApiProperty({ type: [PrnAvailabilityQueueGroupDto] })
  groups!: PrnAvailabilityQueueGroupDto[];
}

export class PrnAvailabilityFilterOptionsDto {
  @ApiProperty({ type: [String] })
  companies!: string[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  liaisons!: { id: string; name: string }[];

  @ApiProperty({ type: [String] })
  regions!: string[];
}

export class PrnAvailabilitySummaryDto {
  @ApiProperty()
  pendingCount!: number;
}
