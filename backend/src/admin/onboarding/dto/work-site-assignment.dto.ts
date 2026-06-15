import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { WeeklyShiftDto } from './weekly-shift.dto';

export class WorkSiteAssignmentDto {
  @ApiProperty({
    description: 'Work site UUID from GET /admin/onboarding/work-sites or work-sites/search',
    example: 'c0000000-0000-4000-8000-000000000001',
  })
  @IsUUID()
  workSiteId!: string;

  @ApiProperty({
    description:
      'Facility name from the selected search result (`facilityName` on the same row). Stored on the provider profile (primary site) and invite snapshot.',
    example: 'Dallas Medical Center',
  })
  @IsString()
  @IsNotEmpty()
  facility!: string;

  @ApiProperty({
    description: 'Exactly one work site in the workSites array must be true (primary facility)',
  })
  @IsBoolean()
  isPrimary!: boolean;

  @ApiPropertyOptional({
    description: 'Region dropdown (form-options.regions). Omit to use the catalog site default region.',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    type: [WeeklyShiftDto],
    description:
      'Hours at clinic — set-schedule only; must be omitted for PRN. Falls back to defaultWeeklySchedule when omitted.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyShiftDto)
  weeklySchedule?: WeeklyShiftDto[];
}
