import { TimeControl, GameStatus, GameResult } from '@prisma/client';

export class PlayerDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rating?: number;
}

export class GameResponseDto {
  id: string;
  whitePlayer: PlayerDto;
  blackPlayer: PlayerDto;
  timeControl: TimeControl;
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  status: GameStatus;
  result: GameResult | null;
  terminationReason: string | null;
  fenCurrent: string;
  moveCount: number;
  whiteTimeRemaining: number | null;
  blackTimeRemaining: number | null;
  whiteRatingBefore: number | null;
  blackRatingBefore: number | null;
  whiteRatingAfter: number | null;
  blackRatingAfter: number | null;
  openingName: string | null;
  spectatorCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
