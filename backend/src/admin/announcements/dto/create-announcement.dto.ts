import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const ANNOUNCEMENT_TYPES = ['general', 'newsletter', 'holiday', 'update', 'urgent'] as const;

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Holiday Hours Update' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @ApiProperty({ enum: ANNOUNCEMENT_TYPES, default: 'general' })
  @IsIn([...ANNOUNCEMENT_TYPES])
  type!: (typeof ANNOUNCEMENT_TYPES)[number];

  @ApiProperty({ type: [String], description: 'Provider auth user ids' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  recipientUserIds!: string[];
}
