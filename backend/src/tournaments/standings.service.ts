import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Interface for player standings data
 */
export interface PlayerStanding {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  buchholzScore: number;
  sonneborBerger: number;
  rank: number;
  gamesPlayed: number;
}

/**
 * Interface for opponent result tracking
 */
interface OpponentResult {
  opponentId: string;
  result: 'win' | 'loss' | 'draw';
}

/**
 * Service for calculating tournament standings and tiebreaks
 * Requirements: 12.1, 12.2, 12.3
 */
@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate and update standings for a tournament
   * Requirements: 12.1, 12.2, 12.3
   * @param tournamentId Tournament ID
   * @returns Array of player standings ordered by rank
   */
  async calculateStandings(tournamentId: string): Promise<PlayerStanding[]> {
    // Get tournament with tiebreak criteria
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { tiebreakCriteria: true },
    });

    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    // Get all players in the tournament
    const players = await this.prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get all pairings for the tournament
    const pairings = await this.prisma.tournamentPairing.findMany({
      where: { tournamentId },
      select: {
        whitePlayerId: true,
        blackPlayerId: true,
        result: true,
        isBye: true,
      },
    });

    // Calculate scores and opponent results for each player
    const playerData = new Map<string, {
      score: number;
      wins: number;
      losses: number;
      draws: number;
      opponents: OpponentResult[];
      gamesPlayed: number;
    }>();

    // Initialize player data
    for (const player of players) {
      playerData.set(player.userId, {
        score: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        opponents: [],
        gamesPlayed: 0,
      });
    }

    // Process all pairings to calculate scores
    for (const pairing of pairings) {
      if (!pairing.result || pairing.isBye) {
        // Handle bye - player gets 1 point
        if (pairing.isBye && pairing.whitePlayerId) {
          const data = playerData.get(pairing.whitePlayerId);
          if (data) {
            data.score += 1;
            data.wins += 1;
            data.gamesPlayed += 1;
          }
        }
        continue;
      }

      const whiteData = playerData.get(pairing.whitePlayerId!);
      const blackData = playerData.get(pairing.blackPlayerId!);

      if (!whiteData || !blackData) continue;

      // Update game counts
      whiteData.gamesPlayed += 1;
      blackData.gamesPlayed += 1;

      // Process result
      switch (pairing.result) {
        case 'WHITE_WIN':
          whiteData.score += 1;
          whiteData.wins += 1;
          blackData.losses += 1;
          whiteData.opponents.push({
            opponentId: pairing.blackPlayerId!,
            result: 'win',
          });
          blackData.opponents.push({
            opponentId: pairing.whitePlayerId!,
            result: 'loss',
          });
          break;

        case 'BLACK_WIN':
          blackData.score += 1;
          blackData.wins += 1;
          whiteData.losses += 1;
          blackData.opponents.push({
            opponentId: pairing.whitePlayerId!,
            result: 'win',
          });
          whiteData.opponents.push({
            opponentId: pairing.blackPlayerId!,
            result: 'loss',
          });
          break;

        case 'DRAW':
          whiteData.score += 0.5;
          blackData.score += 0.5;
          whiteData.draws += 1;
          blackData.draws += 1;
          whiteData.opponents.push({
            opponentId: pairing.blackPlayerId!,
            result: 'draw',
          });
          blackData.opponents.push({
            opponentId: pairing.whitePlayerId!,
            result: 'draw',
          });
          break;
      }
    }

    // Calculate tiebreak scores
    const standings: PlayerStanding[] = [];

    for (const player of players) {
      const data = playerData.get(player.userId);
      if (!data) continue;

      const buchholzScore = this.calculateBuchholz(data.opponents, playerData);
      const sonneborBerger = this.calculateSonneborBerger(
        data.opponents,
        playerData,
      );

      standings.push({
        userId: player.userId,
        username: player.user.username,
        displayName: player.user.displayName,
        avatarUrl: player.user.avatarUrl || undefined,
        score: data.score,
        wins: data.wins,
        losses: data.losses,
        draws: data.draws,
        buchholzScore,
        sonneborBerger,
        rank: 0, // Will be set after sorting
        gamesPlayed: data.gamesPlayed,
      });
    }

    // Sort standings by score and tiebreaks
    this.sortStandings(standings, tournament.tiebreakCriteria);

    // Assign ranks
    for (let i = 0; i < standings.length; i++) {
      standings[i].rank = i + 1;
    }

    // Update database with calculated standings
    await this.updateStandingsInDatabase(tournamentId, standings);

    return standings;
  }

  /**
   * Calculate Buchholz tiebreak score
   * Sum of all opponents' scores
   * Requirements: 12.3
   * @param opponents List of opponent results
   * @param playerData Map of player data
   * @returns Buchholz score
   */
  private calculateBuchholz(
    opponents: OpponentResult[],
    playerData: Map<string, any>,
  ): number {
    let buchholz = 0;

    for (const opponent of opponents) {
      const opponentData = playerData.get(opponent.opponentId);
      if (opponentData) {
        buchholz += opponentData.score;
      }
    }

    return buchholz;
  }

  /**
   * Calculate Sonneborn-Berger tiebreak score
   * Sum of defeated opponents' scores + half of drawn opponents' scores
   * Requirements: 12.3
   * @param opponents List of opponent results
   * @param playerData Map of player data
   * @returns Sonneborn-Berger score
   */
  private calculateSonneborBerger(
    opponents: OpponentResult[],
    playerData: Map<string, any>,
  ): number {
    let sonneborBerger = 0;

    for (const opponent of opponents) {
      const opponentData = playerData.get(opponent.opponentId);
      if (!opponentData) continue;

      if (opponent.result === 'win') {
        // Full opponent score for wins
        sonneborBerger += opponentData.score;
      } else if (opponent.result === 'draw') {
        // Half opponent score for draws
        sonneborBerger += opponentData.score * 0.5;
      }
      // No points for losses
    }

    return sonneborBerger;
  }

  /**
   * Sort standings by score and configured tiebreak criteria
   * Requirements: 12.2, 12.3
   * @param standings Array of player standings
   * @param tiebreakCriteria Tiebreak method to use
   */
  private sortStandings(
    standings: PlayerStanding[],
    tiebreakCriteria: string,
  ): void {
    standings.sort((a, b) => {
      // Primary: Sort by score (descending)
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      // Secondary: Apply tiebreak criteria
      switch (tiebreakCriteria) {
        case 'buchholz':
          if (a.buchholzScore !== b.buchholzScore) {
            return b.buchholzScore - a.buchholzScore;
          }
          // Tertiary: Sonneborn-Berger as fallback
          return b.sonneborBerger - a.sonneborBerger;

        case 'sonneborn_berger':
          if (a.sonneborBerger !== b.sonneborBerger) {
            return b.sonneborBerger - a.sonneborBerger;
          }
          // Tertiary: Buchholz as fallback
          return b.buchholzScore - a.buchholzScore;

        case 'direct_encounter':
          // Direct encounter would require additional logic to check head-to-head results
          // For now, fall back to Buchholz
          if (a.buchholzScore !== b.buchholzScore) {
            return b.buchholzScore - a.buchholzScore;
          }
          return b.sonneborBerger - a.sonneborBerger;

        default:
          // Default to Buchholz
          if (a.buchholzScore !== b.buchholzScore) {
            return b.buchholzScore - a.buchholzScore;
          }
          return b.sonneborBerger - a.sonneborBerger;
      }
    });
  }

  /**
   * Update standings in database
   * Requirements: 12.1
   * @param tournamentId Tournament ID
   * @param standings Calculated standings
   */
  private async updateStandingsInDatabase(
    tournamentId: string,
    standings: PlayerStanding[],
  ): Promise<void> {
    // Update each player's record in the database
    const updates = standings.map((standing) =>
      this.prisma.tournamentPlayer.update({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId: standing.userId,
          },
        },
        data: {
          score: standing.score,
          wins: standing.wins,
          losses: standing.losses,
          draws: standing.draws,
          buchholzScore: standing.buchholzScore,
          sonneborBerger: standing.sonneborBerger,
          rank: standing.rank,
        },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  /**
   * Get current standings for a tournament
   * Requirements: 12.2
   * @param tournamentId Tournament ID
   * @returns Array of player standings ordered by rank
   */
  async getStandings(tournamentId: string): Promise<PlayerStanding[]> {
    const players = await this.prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { score: 'desc' },
        { buchholzScore: 'desc' },
        { sonneborBerger: 'desc' },
      ],
    });

    return players.map((player, index) => ({
      userId: player.userId,
      username: player.user.username,
      displayName: player.user.displayName,
      avatarUrl: player.user.avatarUrl || undefined,
      score: Number(player.score),
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      buchholzScore: Number(player.buchholzScore),
      sonneborBerger: Number(player.sonneborBerger),
      rank: player.rank || index + 1,
      gamesPlayed: player.wins + player.losses + player.draws,
    }));
  }
}
