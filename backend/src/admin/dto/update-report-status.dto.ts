import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReportStatusUpdate {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export class UpdateReportStatusDto {
  @IsEnum(ReportStatusUpdate)
  status: ReportStatusUpdate;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;
}
