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
import { WeeklyShiftDto } from './weekly-shift.dto';
import { WorkSiteAssignmentDto } from './work-site-assignment.dto';

export class CreateProviderDto {
  @ApiProperty({ example: 'Hamza' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Jamshed' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'hamzajamshed.cs@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '(555) 555-0100' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Family Medicine',
    description: 'Must match a value from GET /admin/onboarding/form-options → specialties',
  })
  @IsString()
  @IsNotEmpty()
  specialty!: string;

  @ApiProperty({ example: 'TX', description: 'License state' })
  @IsString()
  @IsNotEmpty()
  licenseState!: string;

  @ApiProperty({ example: 'W2', enum: ['W2', '1099'] })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsString()
  @IsIn(['W2', '1099'])
  employmentType!: string;

  @ApiProperty({ example: 'set', enum: ['set', 'prn'] })
  @IsString()
  @IsIn(['set', 'prn'])
  scheduleType!: string;

  @ApiProperty({
    example: 'Frontera',
    description: 'Must match a value from GET /admin/onboarding/form-options → companies',
  })
  @IsString()
  @IsNotEmpty()
  company!: string;

  @ApiPropertyOptional({ description: 'External provider identifier' })
  @IsOptional()
  @IsString()
  providerIdExternal?: string;

  @ApiPropertyOptional({
    type: [WeeklyShiftDto],
    description:
      'Default weekly pattern applied to sites without their own schedule. Omit for PRN (`scheduleType: prn`).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyShiftDto)
  defaultWeeklySchedule?: WeeklyShiftDto[];

  @ApiProperty({
    description: 'Recruiter auth user id (Sam Recruiter from seed)',
    example: 'a0000000-0000-4000-8000-000000000001',
  })
  @IsUUID()
  recruiterId!: string;

  @ApiPropertyOptional({
    description: 'Liaison auth user id (Anthony Kendall from seed)',
    example: 'a0000000-0000-4000-8000-000000000005',
  })
  @IsOptional()
  @IsUUID()
  liaisonId?: string;

  @ApiProperty({
    type: [WorkSiteAssignmentDto],
    minItems: 1,
    description:
      'Approved work sites. Add/remove rows and shifts in the UI before POST; only the final array is sent. Exactly one isPrimary: true.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkSiteAssignmentDto)
  workSites!: WorkSiteAssignmentDto[];

  @ApiPropertyOptional({
    default: true,
    description: 'Send invite email after create (SES + FRONTERA_APP_URL)',
  })
  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;
}
