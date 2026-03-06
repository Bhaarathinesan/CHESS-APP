import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class AddCollegeDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-z0-9.-]+\.[a-z]{2,}$/, {
    message: 'Domain must be a valid domain format (e.g., university.edu)',
  })
  domain: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  collegeName: string;
}
