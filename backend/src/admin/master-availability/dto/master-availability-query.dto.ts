import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  MASTER_AVAILABILITY_STATUSES,
  PTO_DISPLAY_STATUSES,
} from '../../../repository/persistence/utils/master-availability.util';

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

export class MasterAvailabilityQueryDto {
  @ApiProperty({ example: 'Frontera', description: 'Company toggle (Frontera | 4tress)' })
  @IsString()
  company!: string;

  @ApiPropertyOptional({
    example: '2026-05-01',
    description: 'First day of month (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  monthYear?: string;

  @ApiPropertyOptional({ description: 'Single liaison UUID (prefer liaisonIds)' })
  @IsOptional()
  @IsUUID()
  liaisonId?: string;

  @ApiPropertyOptional({
    description: 'One or more liaison UUIDs (comma-separated or repeated)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  liaisonIds?: string[];

  @ApiPropertyOptional({
    description: 'One or more recruiter UUIDs (comma-separated or repeated)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  recruiterIds?: string[];

  @ApiPropertyOptional({ enum: MASTER_AVAILABILITY_STATUSES })
  @IsOptional()
  @IsIn([...MASTER_AVAILABILITY_STATUSES])
  status?: string;

  @ApiPropertyOptional({
    description: 'DB statuses (comma-separated or repeated)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsIn([...MASTER_AVAILABILITY_STATUSES], { each: true })
  statuses?: string[];

  @ApiPropertyOptional({
    description: 'UI display statuses: not_submitted, pending_approval, approved, denied',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsIn([...PTO_DISPLAY_STATUSES], { each: true })
  displayStatuses?: string[];

  @ApiPropertyOptional({ example: 'Region 1' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'One or more regions (comma-separated or repeated)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ description: 'Search provider name, email, or specialty' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class MasterAvailabilityExportQueryDto extends MasterAvailabilityQueryDto {
  @ApiProperty({ enum: ['table', 'calendar'] })
  @IsIn(['table', 'calendar'])
  view!: 'table' | 'calendar';
}

export class MasterAvailabilityRegionExportQueryDto extends MasterAvailabilityQueryDto {}

export class MasterAvailabilityAceImoExportQueryDto extends MasterAvailabilityQueryDto {}
