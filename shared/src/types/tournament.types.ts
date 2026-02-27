import { TimeControl } from './common.types';

export type TournamentFormat =
  | 'swiss'
  | 'round_robin'
  | 'single_elimination'
  | 'double_elimination'
  | 'arena';

export type TournamentStatus =
  | 'created'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'round_in_progress'
  | 'round_completed'
  | 'completed'
  | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  creatorId: string;
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
  pairingMethod: 'automatic' | 'manual';
  tiebreakCriteria: 'buchholz' | 'sonneborn_berger' | 'direct_encounter';
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
}

export interface TournamentPlayer {
  id: string;
  tournamentId: string;
  userId: string;
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
