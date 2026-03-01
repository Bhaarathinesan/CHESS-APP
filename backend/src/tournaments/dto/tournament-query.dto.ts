import {
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TournamentFormat, TimeControl, TournamentStatus } from '@prisma/client';

export class TournamentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(TournamentFormat)
  format?: TournamentFormat;

  @IsOptional()
  @IsEnum(TimeControl)
  timeControl?: TimeControl;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsString()
  creatorId?: string;

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
