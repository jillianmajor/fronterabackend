import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { AdminAnnouncementsService } from './admin-announcements.service';
import { AnnouncementAudienceQueryDto } from './dto/announcement-audience-query.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  AnnouncementAudienceResponseDto,
  AnnouncementFilterOptionsDto,
  AnnouncementHistoryResponseDto,
  CreateAnnouncementResponseDto,
} from './dto/announcements-response.dto';

@ApiTags('Admin — Announcements')
@Roles('admin', 'internal_staff')
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly service: AdminAnnouncementsService) {}

  @Get('filter-options')
  @ApiOperation({ summary: 'Distinct filter values for announcement audience picker' })
  @ApiOkResponse({ type: AnnouncementFilterOptionsDto })
  getFilterOptions() {
    return this.service.getFilterOptions();
  }

  @Get('audience')
  @ApiOperation({ summary: 'Providers matching announcement audience filters' })
  @ApiOkResponse({ type: AnnouncementAudienceResponseDto })
  getAudience(@Query() query: AnnouncementAudienceQueryDto) {
    return this.service.getAudience(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Recent announcements sent by corporate' })
  @ApiOkResponse({ type: AnnouncementHistoryResponseDto })
  getHistory(@Query('limit') limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 20;
    return this.service.getHistory(Number.isFinite(parsed) ? parsed : 20);
  }

  @Post()
  @ApiOperation({ summary: 'Create announcement and notify selected providers in-app' })
  @ApiOkResponse({ type: CreateAnnouncementResponseDto })
  create(@Body() body: CreateAnnouncementDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.create(body, user);
  }
}
