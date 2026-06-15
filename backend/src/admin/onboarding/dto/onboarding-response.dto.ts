import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderResponseDto {
  @ApiProperty()
  profileId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  inviteId!: string;

  @ApiProperty({ description: 'Present in dev for testing accept-invite; omit in production later' })
  inviteToken!: string;

  @ApiProperty()
  inviteExpiresAt!: string;

  @ApiProperty()
  inviteSent!: boolean;

  @ApiPropertyOptional()
  inviteEmailMessageId?: string;

  @ApiPropertyOptional()
  inviteError?: string;
}

export class WeeklySchedulePresetDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  shifts!: { day: string; startTime: string; endTime: string }[];
}

export class OnboardingFormOptionsDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  recruiters!: { userId: string; fullName: string; email: string | null }[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  liaisons!: { userId: string; fullName: string; email: string | null }[];

  @ApiProperty({ type: [WeeklySchedulePresetDto] })
  weeklySchedulePresets!: WeeklySchedulePresetDto[];

  @ApiProperty({ example: ['W2', '1099'] })
  employmentTypes!: string[];

  @ApiProperty({ example: ['set', 'prn'] })
  scheduleTypes!: string[];

  @ApiProperty({
    type: [String],
    example: ['Family Medicine', 'Internal Medicine', 'Hospitalist'],
    description: 'Specialty dropdown options',
  })
  specialties!: string[];

  @ApiProperty({
    type: [String],
    example: ['Frontera', 'Optum'],
    description: 'Company dropdown options',
  })
  companies!: string[];

  @ApiProperty({
    type: [String],
    example: ['Region 1', 'South', 'West'],
    description: 'Region dropdown per approved work site row',
  })
  regions!: string[];

  @ApiProperty({
    type: [String],
    example: ['Monday', 'Tuesday', 'Wednesday'],
    description: 'Day dropdown when adding a clinic shift',
  })
  clinicShiftDays!: string[];
}

export class WorkSiteSearchResultDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiPropertyOptional()
  region?: string | null;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({ description: 'Display label for search results' })
  displayLabel!: string;
}
