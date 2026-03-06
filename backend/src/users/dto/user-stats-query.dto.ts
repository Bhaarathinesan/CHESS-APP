import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TimeControl } from '@prisma/client';

export class UserStatsQueryDto {
  @IsOptional()
  @IsEnum(TimeControl)
  timeControl?: TimeControl;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
