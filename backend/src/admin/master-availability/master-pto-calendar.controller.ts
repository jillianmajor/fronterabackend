import { Controller, Get, NotFoundException, Query, Res, StreamableFile } from '@nestjs/common';
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
} from './dto/master-availability-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  defaultMonthYear,
  parseMonthYear,
} from '../../repository/persistence/utils/master-availability.util';
import { MasterAvailabilityService } from './master-availability.service';

@ApiTags('Admin — Master PTO Calendar')
@Roles('admin', 'internal_staff')
@Controller('admin/master-pto')
export class MasterPtoCalendarController {
  constructor(private readonly masterAvailabilityService: MasterAvailabilityService) {}

  @Get('filter-options')
  @ApiOperation({ summary: 'Filter dropdowns for Master PTO Calendar' })
  @ApiQuery({ name: 'company', required: true, example: 'Frontera' })
  @ApiOkResponse({ type: MasterAvailabilityFilterOptionsDto })
  getFilterOptions(@Query('company') company: string) {
    return this.masterAvailabilityService.getFilterOptions(company);
  }

  @Get()
  @ApiOperation({
    summary: 'Master PTO Calendar — table view (paginated, SET time-off change types only)',
  })
  @ApiOkResponse({ type: MasterAvailabilityListResponseDto })
  listTable(@Query() query: MasterAvailabilityQueryDto) {
    return this.masterAvailabilityService.listPtoTable(query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Master PTO Calendar — calendar view for a month' })
  @ApiOkResponse({ type: MasterAvailabilityCalendarResponseDto })
  getCalendar(@Query() query: MasterAvailabilityQueryDto) {
    return this.masterAvailabilityService.getPtoCalendar(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export Master PTO table or calendar view to Excel' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async export(
    @Query() query: MasterAvailabilityExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.masterAvailabilityService.exportPtoExcel(query);
    const filename = `master-pto-${query.view}-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      throw new NotFoundException('No region export data for the selected filters.');
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
    const { label } = parseMonthYear(monthYear ?? defaultMonthYear());
    const filename = `ACE-IMO - ${company} - ${label}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    return new StreamableFile(buffer);
  }
}
