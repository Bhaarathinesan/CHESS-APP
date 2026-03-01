import { IsString, IsNotEmpty } from 'class-validator';

export class UploadPgnDto {
  @IsString()
  @IsNotEmpty()
  pgnText: string;
}
