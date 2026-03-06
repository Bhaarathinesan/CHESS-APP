import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, IsUUID } from 'class-validator';

export enum ReportType {
  USER = 'user',
  GAME = 'game',
  CHAT = 'chat',
}

export class CreateReportDto {
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsUUID()
  @IsOptional()
  reportedUserId?: string;

  @IsUUID()
  @IsOptional()
  gameId?: string;

  @IsUUID()
  @IsOptional()
  chatMessageId?: string;
}
