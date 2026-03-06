import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { TournamentFormat, TimeControl, TournamentStatus } from '@prisma/client';

/**
 * DTO for admin to update tournament
 * Allows more fields than regular update including status changes
 */
export class AdminUpdateTournamentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TournamentFormat)
  format?: TournamentFormat;

  @IsOptional()
  @IsEnum(TimeControl)
  timeControl?: TimeControl;

  @IsOptional()
  @IsInt()
  @Min(1)
  initialTimeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  incrementSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isRated?: boolean;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(1000)
  minPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(1000)
  maxPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  roundsTotal?: number;

  @IsOptional()
  @IsBoolean()
  allowLateRegistration?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  spectatorDelaySeconds?: number;

  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsString()
  prizeDescription?: string;
}
