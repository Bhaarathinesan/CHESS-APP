import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimeControl, GameResult } from '@prisma/client';

export class GameHistoryQueryDto {
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
  limit?: number = 20;

  @IsOptional()
  @IsString()
  opponentId?: string;

  @IsOptional()
  @IsEnum(GameResult)
  result?: GameResult;

  @IsOptional()
  @IsEnum(TimeControl)
  timeControl?: TimeControl;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class GameHistoryResponseDto {
  games: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
