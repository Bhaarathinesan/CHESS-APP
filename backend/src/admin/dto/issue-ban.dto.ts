import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { BanType } from '@prisma/client';

export class IssueBanDto {
  @IsEnum(BanType)
  banType: BanType;

  @IsString()
  reason: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
