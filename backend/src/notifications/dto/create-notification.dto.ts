import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum NotificationType {
  GAME_CHALLENGE = 'game_challenge',
  TOURNAMENT_START = 'tournament_start',
  TOURNAMENT_CONFIRMATION = 'tournament_confirmation',
  TOURNAMENT_PAIRING = 'tournament_pairing',
  OPPONENT_MOVE = 'opponent_move',
  DRAW_OFFER = 'draw_offer',
  GAME_END = 'game_end',
  TOURNAMENT_COMPLETE = 'tournament_complete',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  ANNOUNCEMENT = 'announcement',
  FRIEND_ONLINE = 'friend_online',
  NEW_FOLLOWER = 'new_follower',
  RATING_CHANGE = 'rating_change',
  TOURNAMENT_REMINDER = 'tournament_reminder',
  SECURITY_EVENT = 'security_event',
}

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  linkUrl?: string;
}
