import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';

/**
 * DTO for tournament award response
 */
export class TournamentAwardDto {
  id: string;
  tournamentId: string;
  userId: string;
  placement: number;
  awardTitle: string;
  awardDescription?: string;
  createdAt: Date;

  // User details
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * DTO for creating tournament awards
 */
export class CreateTournamentAwardDto {
  @IsInt()
  @Min(1)
  placement: number;

  @IsString()
  @MaxLength(100)
  awardTitle: string;

  @IsOptional()
  @IsString()
  awardDescription?: string;
}

/**
 * DTO for award configuration
 */
export class AwardConfigDto {
  @IsInt()
  @Min(1)
  placement: number;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
