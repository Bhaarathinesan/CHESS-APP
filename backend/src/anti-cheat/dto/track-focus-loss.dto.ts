import { IsDateString, IsUUID } from 'class-validator';

export class TrackFocusLossDto {
  @IsUUID()
  gameId: string;

  @IsDateString()
  focusLostAt: string;

  @IsDateString()
  focusRegainedAt: string;
}
