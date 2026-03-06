import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AntiCheatFlagStatus } from '@prisma/client';

export class UpdateFlagStatusDto {
  @IsEnum(AntiCheatFlagStatus)
  status: AntiCheatFlagStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
