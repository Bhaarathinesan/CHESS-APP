import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class AddCollegeDomainDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Invalid domain format',
  })
  domain: string;

  @IsString()
  @IsNotEmpty()
  collegeName: string;
}

export class RemoveCollegeDomainDto {
  @IsString()
  @IsNotEmpty()
  domain: string;
}

export class CollegeDomainDto {
  domain: string;
  collegeName: string;
  createdAt: Date;
}

export class CollegeDomainListDto {
  domains: CollegeDomainDto[];
  total: number;
}
