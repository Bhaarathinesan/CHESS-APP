import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { TimeControl } from '@prisma/client';

export class JoinQueueDto {
  @IsEnum(TimeControl)
  timeControl: TimeControl;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(500)
  ratingRange?: number = 200; // Default 200 points as per requirements
}
