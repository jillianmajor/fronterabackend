import { Controller, Get, NotFoundException, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClientSchedulesService } from './client-schedules.service';
import {
  ClientSchedulesQueryDto,
  ClientSchedulesRegionExportQueryDto,
  ClientSchedulesResponseDto,
} from './dto/client-schedules-response.dto';

@ApiTags('Client')
@Roles('client_user', 'admin', 'internal_staff')
@Controller('client/schedules')
export class ClientSchedulesController {
  constructor(private readonly service: ClientSchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Optum provider schedules for a month (client portal)' })
  @ApiOkResponse({ type: ClientSchedulesResponseDto })
  list(@Query() query: ClientSchedulesQueryDto) {
    return this.service.list(query.monthYear);
  }

  @Get('export/region')
  @ApiOperation({
    summary: 'Region-grouped schedule export (one workbook, facility tabs, calendar layout)',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportRegion(
    @Query() query: ClientSchedulesRegionExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.service.exportRegion(query);
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
