import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TournamentFormat, TimeControl } from '@prisma/client';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsEnum(TournamentFormat)
  @IsNotEmpty()
  format: TournamentFormat;

  @IsEnum(TimeControl)
  @IsNotEmpty()
  timeControl: TimeControl;

  @IsInt()
  @Min(1)
  @Max(180)
  initialTimeMinutes: number;

  @IsInt()
  @Min(0)
  @Max(60)
  incrementSeconds: number;

  @IsBoolean()
  @IsOptional()
  isRated?: boolean;

  @IsInt()
  @Min(4)
  @Max(1000)
  minPlayers: number;

  @IsInt()
  @Min(4)
  @Max(1000)
  maxPlayers: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  roundsTotal?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['automatic', 'manual'])
  pairingMethod?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['buchholz', 'sonneborn_berger', 'direct_encounter'])
  tiebreakCriteria?: string;

  @IsBoolean()
  @IsOptional()
  allowLateRegistration?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(3600)
  spectatorDelaySeconds?: number;

  @IsDateString()
  @IsNotEmpty()
  registrationDeadline: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  prizeDescription?: string;
}
