import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  MasterAvailabilityAceImoExportQueryDto,
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

@ApiTags('Admin — Master PTO Calendar')
@Roles('admin', 'internal_staff')
@Controller('admin/master-availability')
export class MasterAvailabilityController {
  constructor(private readonly masterAvailabilityService: MasterAvailabilityService) {}

  @Get('submission-progress')
  @ApiOperation({ summary: 'Liaison submission cards for target month (today + 2 months)' })
  @ApiQuery({ name: 'company', required: true, example: 'Frontera' })
  @ApiOkResponse({ type: MasterAvailabilitySubmissionProgressDto })
  getSubmissionProgress(@Query('company') company: string) {
    return this.masterAvailabilityService.getSubmissionProgress(company);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Filter dropdowns for Master Availability Calendar' })
  @ApiQuery({ name: 'company', required: true, example: 'Frontera' })
  @ApiOkResponse({ type: MasterAvailabilityFilterOptionsDto })
  getFilterOptions(@Query('company') company: string) {
    return this.masterAvailabilityService.getFilterOptions(company);
  }

  @Get()
  @ApiOperation({ summary: 'Master Availability — table view (paginated)' })
  @ApiOkResponse({ type: MasterAvailabilityListResponseDto })
  listTable(@Query() query: MasterAvailabilityQueryDto) {
    return this.masterAvailabilityService.listTable(query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Master Availability — calendar view for a month' })
  @ApiOkResponse({ type: MasterAvailabilityCalendarResponseDto })
  getCalendar(@Query() query: MasterAvailabilityQueryDto) {
    return this.masterAvailabilityService.getCalendar(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export Master Availability table or calendar to Excel' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async export(
    @Query() query: MasterAvailabilityExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.masterAvailabilityService.exportExcel(query);
    const filename = `master-availability-${query.view}-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    const files = await this.masterAvailabilityService.exportRegionExcel(query);
    const file = files[0];
    if (!file) {
      const empty = await this.masterAvailabilityService.exportAceImoExcel(query);
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="region-export-empty.xlsx"`,
        'Content-Length': String(empty.length),
      });
      return new StreamableFile(empty);
    }
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': String(file.buffer.length),
    });
    return new StreamableFile(file.buffer);
  }

  @Get('export/ace-imo')
  @ApiOperation({ summary: 'ACE/IMO recruiter-grouped export (one tab per recruiter)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportAceImo(
    @Query() query: MasterAvailabilityAceImoExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.masterAvailabilityService.exportAceImoExcel(query);
    const { monthYear, company } = query;
    const filename = `ACE-IMO-${company}-${monthYear ?? 'month'}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    return new StreamableFile(buffer);
  }
}
