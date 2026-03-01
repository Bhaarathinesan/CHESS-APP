/**
 * Sound effects and audio preferences types
 * Requirements: 23.1-23.15
 */

export type SoundEffectType =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'castling'
  | 'gameStart'
  | 'gameEnd'
  | 'notification'
  | 'challenge'
  | 'chatMessage'
  | 'lowTime';

export interface SoundPreferences {
  enabled: boolean;
  volume: number; // 0-100
  effects: {
    [key in SoundEffectType]: boolean;
  };
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 70,
  effects: {
    move: true,
    capture: true,
    check: true,
    checkmate: true,
    castling: true,
    gameStart: true,
    gameEnd: true,
    notification: true,
    challenge: true,
    chatMessage: true,
    lowTime: true,
  },
};

export const SOUND_EFFECT_LABELS: Record<SoundEffectType, string> = {
  move: 'Move',
  capture: 'Capture',
  check: 'Check',
  checkmate: 'Checkmate',
  castling: 'Castling',
  gameStart: 'Game Start',
  gameEnd: 'Game End',
  notification: 'Notification',
  challenge: 'Challenge',
  chatMessage: 'Chat Message',
  lowTime: 'Low Time Warning',
};
