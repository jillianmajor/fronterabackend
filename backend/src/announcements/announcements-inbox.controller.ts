import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AnnouncementsInboxService } from './announcements-inbox.service';
import {
  AnnouncementInboxResponseDto,
  MarkAnnouncementReadDto,
  MarkAnnouncementReadResponseDto,
} from './dto/inbox-response.dto';

@ApiTags('Announcements')
@Roles('provider_user', 'client_user', 'admin', 'internal_staff')
@Controller('announcements')
export class AnnouncementsInboxController {
  constructor(private readonly service: AnnouncementsInboxService) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Announcements addressed to the current user' })
  @ApiOkResponse({ type: AnnouncementInboxResponseDto })
  getInbox(@CurrentUser() user?: AuthenticatedUser) {
    return this.service.getInbox(user);
  }

  @Post('inbox/mark-read')
  @ApiOperation({ summary: 'Mark announcement recipient rows as read' })
  @ApiOkResponse({ type: MarkAnnouncementReadResponseDto })
  markRead(@CurrentUser() user: AuthenticatedUser | undefined, @Body() body: MarkAnnouncementReadDto) {
    return this.service.markRead(user, body.recipientIds);
  }
}
