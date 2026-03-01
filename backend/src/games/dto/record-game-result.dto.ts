import { IsEnum, IsString, IsOptional, IsArray } from 'class-validator';
import { GameResult } from '@prisma/client';

export class GameMoveDto {
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  uci: string;
  fenAfter: string;
  timeTakenMs: number;
  timeRemainingMs: number;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isCapture?: boolean;
  isCastling?: boolean;
  isEnPassant?: boolean;
  isPromotion?: boolean;
  promotionPiece?: string;
}

export class RecordGameResultDto {
  @IsEnum(GameResult)
  @IsOptional()
  result?: GameResult;

  @IsString()
  terminationReason: string;

  @IsArray()
  moves: GameMoveDto[];

  @IsString()
  @IsOptional()
  finalFen?: string;

  @IsString()
  @IsOptional()
  openingName?: string;
}
