import { IsString, IsEnum, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { TimeControl } from '@prisma/client';

/**
 * DTO for creating a direct challenge
 * Requirements: 7.4
 */
export class CreateChallengeDto {
  @IsString()
  receiverId: string;

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
  isRated?: boolean = true;
}
