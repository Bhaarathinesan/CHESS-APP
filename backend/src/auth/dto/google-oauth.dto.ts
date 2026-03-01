import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleOAuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  oauthId: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsNotEmpty()
  collegeName: string;

  @IsString()
  @IsNotEmpty()
  collegeDomain: string;

  @IsString()
  @IsOptional()
  username?: string;
}
