import { GameStatus, GameResult, TerminationReason, TimeControl } from './common.types';

export interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  tournamentId?: string;
  timeControl: TimeControl;
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  status: GameStatus;
  result?: GameResult;
  terminationReason?: TerminationReason;
  pgn?: string;
  fenCurrent: string;
  moveCount: number;
  whiteTimeRemaining?: number;
  blackTimeRemaining?: number;
  whiteRatingBefore?: number;
  blackRatingBefore?: number;
  whiteRatingAfter?: number;
  blackRatingAfter?: number;
  openingName?: string;
  spectatorCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameMove {
  id: string;
  gameId: string;
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  uci: string;
  fenAfter: string;
  timeTakenMs: number;
  timeRemainingMs: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isCapture: boolean;
  isCastling: boolean;
  isEnPassant: boolean;
  isPromotion: boolean;
  promotionPiece?: string;
  createdAt: Date;
}
