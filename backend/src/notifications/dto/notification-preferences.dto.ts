import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  game_challenge?: boolean;

  @IsBoolean()
  @IsOptional()
  tournament_start?: boolean;

  @IsBoolean()
  @IsOptional()
  tournament_confirmation?: boolean;

  @IsBoolean()
  @IsOptional()
  tournament_pairing?: boolean;

  @IsBoolean()
  @IsOptional()
  opponent_move?: boolean;

  @IsBoolean()
  @IsOptional()
  draw_offer?: boolean;

  @IsBoolean()
  @IsOptional()
  game_end?: boolean;

  @IsBoolean()
  @IsOptional()
  tournament_complete?: boolean;

  @IsBoolean()
  @IsOptional()
  achievement_unlocked?: boolean;

  @IsBoolean()
  @IsOptional()
  announcement?: boolean;

  @IsBoolean()
  @IsOptional()
  friend_online?: boolean;

  @IsBoolean()
  @IsOptional()
  rating_change?: boolean;

  @IsBoolean()
  @IsOptional()
  tournament_reminder?: boolean;

  @IsBoolean()
  @IsOptional()
  security_event?: boolean;

  @IsBoolean()
  @IsOptional()
  doNotDisturb?: boolean;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;
}
