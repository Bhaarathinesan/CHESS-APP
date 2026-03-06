import { IsOptional, IsString, IsUUID } from 'class-validator';

export class DetectExtensionDto {
  @IsUUID()
  gameId: string;

  @IsOptional()
  @IsString()
  extensionName?: string;

  @IsOptional()
  @IsString()
  extensionId?: string;

  @IsString()
  detectionMethod: string;
}
