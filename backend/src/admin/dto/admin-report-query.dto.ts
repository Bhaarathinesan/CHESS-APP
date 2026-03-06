import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum AdminReportStatusFilter {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum AdminReportTypeFilter {
  CHEATING = 'cheating',
  HARASSMENT = 'harassment',
  INAPPROPRIATE_CHAT = 'inappropriate_chat',
  OTHER = 'other',
}

export class AdminReportQueryDto {
  @IsOptional()
  @IsEnum(AdminReportStatusFilter)
  status?: AdminReportStatusFilter;

  @IsOptional()
  @IsEnum(AdminReportTypeFilter)
  reportType?: AdminReportTypeFilter;

  @IsOptional()
  @IsString()
  reportedUserId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;
}
