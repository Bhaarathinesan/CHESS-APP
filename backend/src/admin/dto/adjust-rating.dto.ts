import { IsEnum, IsInt, IsString, Min, Max, IsNotEmpty } from 'class-validator';
import { TimeControl } from '@prisma/client';

export class AdjustRatingDto {
  @IsEnum(TimeControl)
  @IsNotEmpty()
  timeControl: TimeControl;

  @IsInt()
  @Min(100)
  @Max(3000)
  newRating: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
