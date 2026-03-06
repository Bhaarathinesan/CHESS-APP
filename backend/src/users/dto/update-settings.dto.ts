import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsObject } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  boardTheme?: string;

  @IsOptional()
  @IsString()
  pieceSet?: string;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  soundVolume?: number;

  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, any>;
}
