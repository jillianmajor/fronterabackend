import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { WorkSiteAssignmentDto } from './work-site-assignment.dto';

export class BulkWorkSiteAssignmentDto {
  @ApiPropertyOptional({ description: 'Catalog work site UUID when already resolved' })
  @IsOptional()
  @IsUUID()
  workSiteId?: string;

  @ApiPropertyOptional({ example: 'Optum North Clinic' })
  @IsOptional()
  @IsString()
  facilityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facility_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class BulkProviderInputDto {
  @ApiPropertyOptional({ example: 'Sarah' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Johnson' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Edge-compatible full name when first/last are omitted',
    example: 'Sarah Johnson',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Edge-compatible snake_case alias for fullName' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ example: 'sarah.johnson@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Family Medicine' })
  @IsString()
  @IsNotEmpty()
  specialty!: string;

  @ApiPropertyOptional({ example: 'TX', description: 'License state' })
  @Transform(({ obj, value }) => value ?? obj.state)
  @IsOptional()
  @IsString()
  licenseState?: string;

  @ApiPropertyOptional({ description: 'Edge-compatible alias for licenseState' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'W2' })
  @Transform(({ obj, value }) =>
    typeof value === 'string'
      ? value.toUpperCase()
      : typeof obj.employment_type === 'string'
        ? obj.employment_type.toUpperCase()
        : value,
  )
  @IsString()
  @IsIn(['W2', '1099'])
  employmentType!: string;

  @ApiPropertyOptional({ description: 'Edge-compatible alias for employmentType' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsOptional()
  @IsString()
  @IsIn(['W2', '1099'])
  employment_type?: string;

  @ApiProperty({ example: 'set', enum: ['set', 'prn'] })
  @Transform(({ obj, value }) =>
    typeof value === 'string' ? value.toLowerCase() : obj.schedule_type?.toLowerCase() ?? value,
  )
  @IsString()
  @IsIn(['set', 'prn'])
  scheduleType!: string;

  @ApiPropertyOptional({ description: 'Edge-compatible alias for scheduleType' })
  @IsOptional()
  @IsString()
  @IsIn(['set', 'prn'])
  schedule_type?: string;

  @ApiProperty({ example: 'Frontera' })
  @IsString()
  @IsNotEmpty()
  company!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerIdExternal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider_id_external?: string;

  @ApiPropertyOptional({
    description: 'Spreadsheet schedule text, e.g. "Mon-Fri 8a-5p"',
    example: 'Mon-Fri 8a-5p',
  })
  @IsOptional()
  @IsString()
  workSchedule?: string;

  @ApiPropertyOptional({ description: 'Edge-compatible alias for workSchedule' })
  @IsOptional()
  @IsString()
  work_schedule?: string;

  @ApiPropertyOptional({ description: 'Recruiter UUID when already resolved' })
  @IsOptional()
  @IsUUID()
  recruiterId?: string;

  @ApiPropertyOptional({ description: 'Recruiter display name from spreadsheet' })
  @IsOptional()
  @IsString()
  recruiterName?: string;

  @ApiPropertyOptional({ description: 'Edge-compatible alias for recruiterName' })
  @IsOptional()
  @IsString()
  recruiter_name?: string;

  @ApiPropertyOptional({ description: 'Liaison UUID when already resolved' })
  @IsOptional()
  @IsUUID()
  liaisonId?: string;

  @ApiPropertyOptional({ description: 'Liaison display name from spreadsheet' })
  @IsOptional()
  @IsString()
  liaisonName?: string;

  @ApiPropertyOptional({ description: 'Edge-compatible alias for liaisonName' })
  @IsOptional()
  @IsString()
  liaison_name?: string;

  @ApiPropertyOptional({
    type: [WorkSiteAssignmentDto],
    description: 'Fully resolved work sites (single onboard shape)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkSiteAssignmentDto)
  workSites?: WorkSiteAssignmentDto[];

  @ApiPropertyOptional({
    type: [BulkWorkSiteAssignmentDto],
    description: 'Edge-compatible facility rows from spreadsheet',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkWorkSiteAssignmentDto)
  workSiteAssignments?: BulkWorkSiteAssignmentDto[];

  @ApiPropertyOptional({ description: 'Edge-compatible alias for workSiteAssignments' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkWorkSiteAssignmentDto)
  work_site_assignments?: BulkWorkSiteAssignmentDto[];

  @ApiPropertyOptional({ description: 'Flat spreadsheet column alias' })
  @IsOptional()
  @IsString()
  work_site_facility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  work_site_city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  work_site_state?: string;
}

export class BulkCreateProvidersDto {
  @ApiProperty({ type: [BulkProviderInputDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkProviderInputDto)
  providers!: BulkProviderInputDto[];

  @ApiPropertyOptional({
    default: true,
    description: 'Send invite email for each successfully created provider',
  })
  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;
}
