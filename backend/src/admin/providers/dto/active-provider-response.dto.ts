import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActiveProviderItemDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  profileId!: string;

  @ApiPropertyOptional()
  fullName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiProperty({ example: 'set', description: 'Provider schedule type: `set` or `prn`' })
  scheduleType!: string;

  @ApiPropertyOptional({
    description: 'Schedule line under provider name (e.g. Mon–Fri 8:00 AM – 4:00 PM)',
  })
  scheduleSummary?: string | null;

  @ApiPropertyOptional()
  specialty?: string | null;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiPropertyOptional()
  region?: string | null;

  @ApiPropertyOptional({ example: 'W2' })
  employmentType?: string | null;

  @ApiProperty({ type: [String], description: 'Work site facility names; empty if none' })
  workSites!: string[];

  @ApiPropertyOptional()
  recruiterId?: string | null;

  @ApiPropertyOptional()
  recruiterName?: string | null;

  @ApiPropertyOptional()
  liaisonId?: string | null;

  @ApiPropertyOptional()
  liaisonName?: string | null;
}

export class ActiveProvidersListResponseDto {
  @ApiProperty({ type: [ActiveProviderItemDto] })
  items!: ActiveProviderItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;
}
