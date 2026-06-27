import { Controller, Get, NotFoundException, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  MasterAvailabilityExportQueryDto,
  MasterAvailabilityQueryDto,
  MasterAvailabilityRegionExportQueryDto,
} from './dto/master-availability-query.dto';
import {
  MasterAvailabilityCalendarResponseDto,
  MasterAvailabilityFilterOptionsDto,
  MasterAvailabilityListResponseDto,
  MasterAvailabilitySubmissionProgressDto,
} from './dto/master-availability-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MasterAvailabilityService } from './master-availability.service';

@ApiTags('Admin — Master PRN Availability Calendar')
@Roles('admin', 'internal_staff')
@Controller('admin/master-availability')
export class MasterAvailabilityController {
  constructor(private readonly masterAvailabilityService: MasterAvailabilityService) {}

  @Get('submission-progress')
  @ApiOperation({
    summary:
      'PRN liaison submission cards for a month (defaults to collection target month when monthYear omitted)',
  })
  @ApiQuery({ name: 'company', required: true, example: 'Frontera' })
  @ApiQuery({ name: 'monthYear', required: false, example: '2026-06-01' })
  @ApiOkResponse({ type: MasterAvailabilitySubmissionProgressDto })
  getSubmissionProgress(
    @Query('company') company: string,
    @Query('monthYear') monthYear?: string,
  ) {
    return this.masterAvailabilityService.getSubmissionProgress(company, monthYear);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Filter dropdowns for Master PRN Availability Calendar' })
  @ApiQuery({ name: 'company', required: true, example: 'Frontera' })
  @ApiOkResponse({ type: MasterAvailabilityFilterOptionsDto })
  getFilterOptions(@Query('company') company: string) {
    return this.masterAvailabilityService.getFilterOptions(company);
  }

  @Get()
  @ApiOperation({ summary: 'Master PRN Availability — table view (paginated, PRN add_day only)' })
  @ApiOkResponse({ type: MasterAvailabilityListResponseDto })
  listTable(@Query() query: MasterAvailabilityQueryDto) {
    return this.masterAvailabilityService.listPrnTable(query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Master PRN Availability — calendar view for a month (PRN add_day only)' })
  @ApiOkResponse({ type: MasterAvailabilityCalendarResponseDto })
  getCalendar(@Query() query: MasterAvailabilityQueryDto) {
    return this.masterAvailabilityService.getPrnCalendar(query);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export Master PRN Availability table or calendar to Excel (deprecated — use export/table or export/calendar)',
    deprecated: true,
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async export(
    @Query() query: MasterAvailabilityExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.masterAvailabilityService.exportPrnExcel(query);
    const filename = `master-prn-availability-${query.view}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  @Get('export/table')
  @ApiOperation({ summary: 'Export Master PRN Availability table view to Excel' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportTable(
    @Query() query: MasterAvailabilityQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.masterAvailabilityService.exportPrnTableExcel(query);
    const filename = `master-prn-availability-table-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  @Get('export/calendar')
  @ApiOperation({ summary: 'Export Master PRN Availability calendar view to Excel' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportCalendar(
    @Query() query: MasterAvailabilityQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.masterAvailabilityService.exportPrnCalendarExcel(query);
    const filename = `master-prn-availability-calendar-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  @Get('export/region')
  @ApiOperation({ summary: 'Region-grouped client export (one workbook per region)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportRegion(
    @Query() query: MasterAvailabilityRegionExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const files = await this.masterAvailabilityService.exportPrnRegionExcel(query);
    const file = files[0];
    if (!file) {
      throw new NotFoundException('No region export data for the selected filters.');
    }
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': String(file.buffer.length),
    });
    return new StreamableFile(file.buffer);
  }
}
