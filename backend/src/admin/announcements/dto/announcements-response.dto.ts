import { ApiProperty } from '@nestjs/swagger';

export class AnnouncementAudienceProviderDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  fullName!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  company!: string | null;

  @ApiProperty({ nullable: true })
  region!: string | null;

  @ApiProperty({ nullable: true })
  liaisonName!: string | null;

  @ApiProperty({ nullable: true })
  recruiterName!: string | null;

  @ApiProperty({ nullable: true })
  scheduleType!: string | null;

  @ApiProperty({ nullable: true })
  facilityName!: string | null;

  @ApiProperty({ nullable: true })
  specialty!: string | null;
}

export class AnnouncementAudienceResponseDto {
  @ApiProperty({ type: [AnnouncementAudienceProviderDto] })
  providers!: AnnouncementAudienceProviderDto[];
}

export class AnnouncementFilterOptionsDto {
  @ApiProperty({ type: [String] })
  facilities!: string[];

  @ApiProperty({ type: [String] })
  liaisonNames!: string[];

  @ApiProperty({ type: [String] })
  recruiterNames!: string[];

  @ApiProperty({ type: [String] })
  regions!: string[];

  @ApiProperty({ type: [String] })
  specialties!: string[];
}

export class AnnouncementHistoryItemDto {
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

  @ApiProperty()
  recipientCount!: number;
}

export class AnnouncementHistoryResponseDto {
  @ApiProperty({ type: [AnnouncementHistoryItemDto] })
  items!: AnnouncementHistoryItemDto[];
}

export class CreateAnnouncementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  recipientCount!: number;

  @ApiProperty()
  notificationsCreated!: number;
}
