import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsDateString,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';

export class UpdateTournamentDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsInt()
  @IsOptional()
  @Min(4)
  @Max(1000)
  minPlayers?: number;

  @IsInt()
  @IsOptional()
  @Min(4)
  @Max(1000)
  maxPlayers?: number;

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
  @IsOptional()
  registrationDeadline?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  prizeDescription?: string;
}
