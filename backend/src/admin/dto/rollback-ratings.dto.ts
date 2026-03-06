import { IsArray, IsOptional, IsDateString, IsString } from 'class-validator';

export class RollbackRatingsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gameIds?: string[];

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  opponentId?: string;
}
