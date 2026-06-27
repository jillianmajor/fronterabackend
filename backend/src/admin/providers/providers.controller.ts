import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ActiveProvidersFilterOptionsDto } from './dto/filter-options-response.dto';
import {
  ActiveProvidersListResponseDto,
} from './dto/active-provider-response.dto';
import { ListActiveProvidersQueryDto } from './dto/list-active-providers-query.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { providersExportFilename } from '../../repository/persistence/utils/export-filename.util';
import { ProvidersService } from './providers.service';

@ApiTags('Admin — Providers')
@Roles('admin', 'internal_staff')
@Controller('admin/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'Active providers list (search + filters)' })
  @ApiOkResponse({ type: ActiveProvidersListResponseDto })
  listActiveProviders(@Query() query: ListActiveProvidersQueryDto) {
    return this.providersService.listActiveProviders(query);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Distinct filter values for Active Providers screen' })
  @ApiOkResponse({ type: ActiveProvidersFilterOptionsDto })
  getFilterOptions() {
    return this.providersService.getFilterOptions();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export Active Providers to Excel (.xlsx)' })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportActiveProviders(
    @Query() query: ListActiveProvidersQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.providersService.exportActiveProvidersExcel(query);
    const filename = providersExportFilename();
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
}
