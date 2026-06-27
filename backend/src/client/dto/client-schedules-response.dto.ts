import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value.flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export class ClientSchedulesQueryDto {
  @ApiProperty({ example: '2026-06-01', description: 'First day of target month (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  monthYear!: string;
}

export class ClientSchedulesRegionExportQueryDto extends ClientSchedulesQueryDto {
  @ApiPropertyOptional({
    description: 'One or more regions (comma-separated or repeated)',
    type: [String],
    example: 'Region 1',
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ description: 'Filter by facility name substring' })
  @IsOptional()
  @IsString()
  facility?: string;

  @ApiPropertyOptional({ description: 'Search provider name' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class ClientScheduleShiftDto {
  @ApiProperty({ example: 'Mon' })
  day!: string;

  @ApiProperty({ example: '08:00' })
  start!: string;

  @ApiProperty({ example: '17:00' })
  end!: string;
}

export class ClientScheduleSiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  state!: string | null;
}

export class ClientScheduleRowDto {
  @ApiProperty()
  providerUserId!: string;

  @ApiPropertyOptional({ nullable: true })
  fullName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  specialty!: string | null;

  @ApiPropertyOptional({ nullable: true })
  region!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recruiterName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recruiterEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recruiterPhone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  liaisonName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  liaisonEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  liaisonPhone!: string | null;

  @ApiProperty({ type: ClientScheduleSiteDto })
  site!: ClientScheduleSiteDto;

  @ApiProperty({ type: [ClientScheduleShiftDto] })
  weeklySchedule!: ClientScheduleShiftDto[];

  @ApiProperty({ type: [String], description: 'Non-denied time-off dates in month (YYYY-MM-DD)' })
  timeOffDates!: string[];
}

export class ClientSchedulesResponseDto {
  @ApiProperty({ example: '2026-06-01' })
  monthYear!: string;

  @ApiProperty({ type: [ClientScheduleRowDto] })
  rows!: ClientScheduleRowDto[];
}
