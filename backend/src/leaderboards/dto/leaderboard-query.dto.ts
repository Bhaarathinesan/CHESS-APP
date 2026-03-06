import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TimeControl } from '@prisma/client';

export class LeaderboardQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 100;
}

export class WeeklyLeaderboardQueryDto {
  @IsEnum(TimeControl)
  timeControl: TimeControl;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 100;
}

export class SearchPlayerDto {
  @IsString()
  username: string;

  @IsEnum(TimeControl)
  timeControl: TimeControl;
}
