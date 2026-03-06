import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for canceling a tournament with reason
 */
export class CancelTournamentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
