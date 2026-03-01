import {
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { TimeControl } from '@prisma/client';

export class CreateGameDto {
  @IsUUID()
  @IsOptional()
  whitePlayerId?: string;

  @IsUUID()
  @IsOptional()
  blackPlayerId?: string;

  @IsEnum(TimeControl)
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

  @IsUUID()
  @IsOptional()
  tournamentId?: string;
}
