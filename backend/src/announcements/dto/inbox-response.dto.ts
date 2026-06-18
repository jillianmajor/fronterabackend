import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class AnnouncementInboxItemDto {
  @ApiProperty()
  recipientId!: string;

  @ApiProperty({ nullable: true })
  readAt!: string | null;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AnnouncementInboxResponseDto {
  @ApiProperty({ type: [AnnouncementInboxItemDto] })
  items!: AnnouncementInboxItemDto[];
}

export class MarkAnnouncementReadDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Recipient row ids to mark read; omit to mark all unread for the current user',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recipientIds?: string[];
}

export class MarkAnnouncementReadResponseDto {
  @ApiProperty()
  markedCount!: number;
}
