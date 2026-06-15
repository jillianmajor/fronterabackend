import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ONBOARDING_CREATE_EXAMPLE } from '../../../scripts/seed/onboarding-create.example';
import { CreateProviderDto } from './dto/create-provider.dto';
import {
  CreateProviderResponseDto,
  OnboardingFormOptionsDto,
  WorkSiteSearchResultDto,
} from './dto/onboarding-response.dto';
import { BulkCreateProvidersDto } from './dto/bulk-create-providers.dto';
import { BulkCreateProvidersResponseDto } from './dto/bulk-onboarding-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OnboardingService } from './onboarding.service';

@ApiTags('Admin — Onboarding')
@Roles('admin', 'internal_staff')
@Controller('admin/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('form-options')
  @ApiOperation({
    summary: 'Dropdowns and presets for Onboard New Provider',
    description: 'Recruiters, liaisons, weekly schedule presets, employment/schedule types',
  })
  @ApiOkResponse({ type: OnboardingFormOptionsDto })
  getFormOptions() {
    return this.onboardingService.getFormOptions();
  }

  @Get('work-sites')
  @ApiOperation({
    summary: 'List approved work sites (facility dropdown)',
    description:
      'Full facility catalog on initial load (default limit 500). Use work-sites/search as the user types.',
  })
  @ApiQuery({ name: 'state', required: false, description: 'Filter by license/site state e.g. TX' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: [WorkSiteSearchResultDto] })
  listWorkSites(@Query('state') state?: string, @Query('limit') limit?: string) {
    return this.onboardingService.listWorkSites(
      state,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('work-sites/search')
  @ApiOperation({
    summary: 'Search work sites (facility dropdown + search bar)',
    description: 'Filter catalog by facility name, city, state, or region as the user types',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: [WorkSiteSearchResultDto] })
  searchWorkSites(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.onboardingService.searchWorkSites(
      q,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Onboard a new provider and send invite',
    description:
      'Creates profile, work sites, assignment, invite row, and sends SES email when sendInvite is true (default).',
  })
  @ApiBody({
    type: CreateProviderDto,
    examples: {
      inviteTest: {
        summary: 'Seed IDs — invite email test (hamzajamshed.cs@gmail.com)',
        description:
          'Uses Sam Recruiter, Anthony Liaison, and Dallas Medical Center from `npm run db:seed`. ' +
          'Schedule is only in `defaultWeeklySchedule` (sites inherit it). Delete prior user before re-test.',
        value: ONBOARDING_CREATE_EXAMPLE,
      },
    },
  })
  @ApiOkResponse({ type: CreateProviderResponseDto })
  create(@Body() dto: CreateProviderDto) {
    return this.onboardingService.create(dto);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk onboard providers from spreadsheet rows',
    description:
      'Accepts edge-compatible rows (full_name, recruiter_name, work_site_assignments) or fully resolved CreateProviderDto fields. ' +
      'Each row is processed independently; failures do not roll back successful rows.',
  })
  @ApiOkResponse({ type: BulkCreateProvidersResponseDto })
  bulkCreate(@Body() dto: BulkCreateProvidersDto) {
    return this.onboardingService.bulkCreate(dto);
  }

  @Post(':userId/invite')
  @ApiOperation({ summary: 'Resend provider portal invite email' })
  sendInvite(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.onboardingService.sendInvite(userId);
  }
}
