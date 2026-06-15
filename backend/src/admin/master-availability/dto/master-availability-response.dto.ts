import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MasterAvailabilityEntryDto {
  @ApiPropertyOptional({ nullable: true })
  requestId!: string | null;

  @ApiProperty()
  providerUserId!: string;

  @ApiProperty()
  providerName!: string;

  @ApiPropertyOptional({ nullable: true })
  liaisonName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recruiterName!: string | null;

  @ApiProperty({ example: '2026-05-15' })
  date!: string;

  @ApiPropertyOptional({ example: '8:00 AM – 5:00 PM', nullable: true })
  timeAvailable!: string | null;

  @ApiProperty({ example: 'approved' })
  status!: string;

  @ApiProperty({ example: 'pending_approval', description: 'UI-facing status label' })
  displayStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  specialty!: string | null;

  @ApiPropertyOptional({ nullable: true })
  region!: string | null;

  @ApiPropertyOptional({ nullable: true })
  facilityName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  changeType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: ['time_off', 'baseline'] })
  source!: 'time_off' | 'baseline';
}

export class MasterAvailabilityListResponseDto {
  @ApiProperty({ type: [MasterAvailabilityEntryDto] })
  items!: MasterAvailabilityEntryDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ example: '2026-05-01' })
  monthYear!: string;
}

export class MasterAvailabilityCalendarDayDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  weekday!: string;

  @ApiProperty()
  dayOfMonth!: number;

  @ApiProperty()
  inMonth!: boolean;

  @ApiProperty({ type: [MasterAvailabilityEntryDto] })
  entries!: MasterAvailabilityEntryDto[];
}

export class MasterAvailabilityCalendarWeekDto {
  @ApiProperty({ type: [MasterAvailabilityCalendarDayDto] })
  days!: MasterAvailabilityCalendarDayDto[];
}

export class MasterAvailabilityCalendarResponseDto {
  @ApiProperty({ example: '2026-05-01' })
  monthYear!: string;

  @ApiProperty({ example: 'May 2026' })
  monthLabel!: string;

  @ApiProperty({ type: [MasterAvailabilityCalendarWeekDto] })
  weeks!: MasterAvailabilityCalendarWeekDto[];
}

export class MasterAvailabilityFilterOptionsDto {
  @ApiProperty({ example: ['Frontera', '4tress'] })
  companies!: string[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  liaisons!: { id: string; name: string }[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  recruiters!: { id: string; name: string }[];

  @ApiProperty({ example: ['pending_review', 'approved', 'denied', 'cancelled'] })
  statuses!: string[];

  @ApiProperty({ example: ['not_submitted', 'pending_approval', 'approved', 'denied'] })
  displayStatuses!: string[];

  @ApiProperty({ example: ['Region 1', 'South'] })
  regions!: string[];
}

export class LiaisonSubmissionProgressCardDto {
  @ApiProperty()
  liaisonId!: string;

  @ApiProperty()
  liaisonName!: string;

  @ApiProperty()
  submitted!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  percent!: number;
}

export class MasterAvailabilitySubmissionProgressDto {
  @ApiProperty({ example: '2026-07-01' })
  targetMonthYear!: string;

  @ApiProperty({ example: 'July 2026' })
  targetMonthLabel!: string;

  @ApiProperty({ description: 'Last Tuesday of current month for the target month' })
  deadline!: string;

  @ApiProperty({ type: [LiaisonSubmissionProgressCardDto] })
  liaisonCards!: LiaisonSubmissionProgressCardDto[];
}
