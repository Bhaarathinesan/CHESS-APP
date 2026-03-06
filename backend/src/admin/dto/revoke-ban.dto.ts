import { IsString } from 'class-validator';

export class RevokeBanDto {
  @IsString()
  revokeReason: string;
}
