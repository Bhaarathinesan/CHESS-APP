/**
 * DTO for tournament history response
 * Requirements: 12.11
 */
export class TournamentHistoryItemDto {
  tournamentId: string;
  tournamentName: string;
  format: string;
  timeControl: string;
  startTime: Date;
  endTime: Date | null;
  status: string;
  placement: number | null;
  totalPlayers: number;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  isRated: boolean;
}

export class TournamentHistoryResponseDto {
  userId: string;
  totalTournaments: number;
  completedTournaments: number;
  activeTournaments: number;
  topPlacements: number; // Count of top 3 finishes
  tournaments: TournamentHistoryItemDto[];
}
