import { IsArray, IsUUID } from 'class-validator';

export class DownloadMultiplePgnDto {
  @IsArray()
  @IsUUID('4', { each: true })
  gameIds: string[];
}
