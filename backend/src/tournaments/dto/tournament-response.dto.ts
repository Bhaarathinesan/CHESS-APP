import { TournamentFormat, TimeControl, TournamentStatus } from '@prisma/client';

export class TournamentResponseDto {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  creatorId: string;
  creator?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  format: TournamentFormat;
  timeControl: TimeControl;
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  status: TournamentStatus;
  minPlayers: number;
  maxPlayers: number;
  currentPlayers: number;
  roundsTotal?: number;
  roundsCompleted: number;
  currentRound: number;
  pairingMethod: string;
  tiebreakCriteria: string;
  allowLateRegistration: boolean;
  spectatorDelaySeconds: number;
  registrationDeadline: Date;
  startTime: Date;
  endTime?: Date;
  shareLink?: string;
  qrCodeUrl?: string;
  prizeDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  players?: TournamentPlayerDto[];
  pairings?: TournamentPairingDto[];
}

export class TournamentPlayerDto {
  id: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  score: number;
  wins: number;
  losses: number;
  draws: number;
  buchholzScore: number;
  sonneborBerger: number;
  rank?: number;
  isActive: boolean;
  hasBye: boolean;
  joinedAt: Date;
}

export class TournamentPairingDto {
  id: string;
  tournamentId: string;
  roundNumber: number;
  whitePlayerId?: string;
  blackPlayerId?: string;
  whitePlayer?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  blackPlayer?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  gameId?: string;
  result?: string;
  boardNumber?: number;
  isBye: boolean;
  createdAt: Date;
}

export class TournamentListResponseDto {
  tournaments: TournamentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
