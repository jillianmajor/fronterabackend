import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WeeklyShiftDto {
  @ApiProperty({ example: 'Monday' })
  @IsString()
  @IsNotEmpty()
  day!: string;

  @ApiProperty({ example: '8:00 AM' })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '5:00 PM' })
  @IsString()
  @IsNotEmpty()
  endTime!: string;
}
